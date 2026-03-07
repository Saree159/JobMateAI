"""
PayPal billing router.
Handles subscription checkout, webhook events, and cancellation.

Flow:
  1. GET /checkout-url?plan=monthly|annual
     -> Creates a PayPal subscription and returns the approval URL
  2. User approves on PayPal -> redirected to /payment-success?subscription_id=SUB-XXX
  3. POST /verify?subscription_id=SUB-XXX
     -> Verifies with PayPal API and activates Pro in DB
  4. PayPal sends webhooks for renewals / cancellations -> POST /webhook
  5. POST /cancel -> cancels via PayPal API and downgrades user
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import requests as http_requests

from app.database import get_db
from app.models import User
from app.config import settings
from .users import get_current_user


router = APIRouter(prefix="/api/billing", tags=["billing"])


# ---------------------------------------------------------------------------
# PayPal helpers
# ---------------------------------------------------------------------------

def _paypal_access_token() -> str:
    """Get a short-lived OAuth2 access token from PayPal."""
    resp = http_requests.post(
        f"{settings.paypal_api_base}/v1/oauth2/token",
        auth=(settings.paypal_client_id, settings.paypal_client_secret),
        data={"grant_type": "client_credentials"},
        timeout=10,
    )
    if not resp.ok:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not reach PayPal. Please try again later.",
        )
    return resp.json()["access_token"]


def _paypal_headers() -> dict:
    return {
        "Authorization": f"Bearer {_paypal_access_token()}",
        "Content-Type": "application/json",
    }


# ---------------------------------------------------------------------------
# GET /api/billing/checkout-url
# ---------------------------------------------------------------------------

@router.get("/checkout-url")
def get_checkout_url(
    plan: str = "monthly",
    current_user: User = Depends(get_current_user),
):
    """
    Create a PayPal subscription and return the approval URL.
    plan: "monthly" | "annual"
    """
    if not settings.paypal_client_id or not settings.paypal_client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Payment system not configured. Please contact support.",
        )

    plan_id = (
        settings.paypal_monthly_plan_id
        if plan == "monthly"
        else settings.paypal_annual_plan_id
    )
    if not plan_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Plan ID for '{plan}' not configured. Please contact support.",
        )

    payload = {
        "plan_id": plan_id,
        "subscriber": {"email_address": current_user.email},
        "custom_id": str(current_user.id),
        "application_context": {
            "brand_name": "HireMateAI",
            "locale": "en-US",
            "shipping_preference": "NO_SHIPPING",
            "user_action": "SUBSCRIBE_NOW",
            "return_url": f"{settings.frontend_url}/payment-success",
            "cancel_url": f"{settings.frontend_url}/payment-cancel",
        },
    }

    resp = http_requests.post(
        f"{settings.paypal_api_base}/v1/billing/subscriptions",
        json=payload,
        headers=_paypal_headers(),
        timeout=15,
    )

    if not resp.ok:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"PayPal error: {resp.json().get('message', resp.text)}",
        )

    data = resp.json()
    approve_url = next(
        (link["href"] for link in data.get("links", []) if link["rel"] == "approve"),
        None,
    )
    if not approve_url:
        raise HTTPException(status_code=502, detail="PayPal did not return an approval URL.")

    return {"url": approve_url, "subscription_id": data["id"], "plan": plan}


# ---------------------------------------------------------------------------
# POST /api/billing/verify
# ---------------------------------------------------------------------------

@router.post("/verify")
def verify_subscription(
    subscription_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Called by the frontend after PayPal redirects back to /payment-success.
    Verifies the subscription is ACTIVE and activates Pro for the user.
    """
    resp = http_requests.get(
        f"{settings.paypal_api_base}/v1/billing/subscriptions/{subscription_id}",
        headers=_paypal_headers(),
        timeout=10,
    )
    if not resp.ok:
        raise HTTPException(status_code=502, detail="Could not verify subscription with PayPal.")

    data = resp.json()
    sub_status = data.get("status", "")

    if sub_status not in ("ACTIVE", "APPROVED"):
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Subscription is not active (status: {sub_status}).",
        )

    billing_info = data.get("billing_info", {})
    next_billing = billing_info.get("next_billing_time")
    try:
        end_date = datetime.fromisoformat(next_billing.replace("Z", "+00:00")) if next_billing else None
    except Exception:
        end_date = None
    if not end_date:
        end_date = datetime.utcnow() + timedelta(days=32)

    current_user.subscription_tier = "pro"
    current_user.subscription_status = "active"
    current_user.subscription_end_date = end_date
    current_user.paypal_subscription_id = subscription_id
    payer = data.get("subscriber", {})
    current_user.paypal_payer_id = payer.get("payer_id") or payer.get("email_address", "")
    db.commit()
    db.refresh(current_user)

    return {"message": "Subscription activated.", "subscription_tier": "pro"}


# ---------------------------------------------------------------------------
# POST /api/billing/webhook  (PayPal webhooks)
# ---------------------------------------------------------------------------

@router.post("/webhook")
async def paypal_webhook(request: Request, db: Session = Depends(get_db)):
    """
    PayPal webhook endpoint. Handles subscription lifecycle events.
    """
    body = await request.json()
    event_type = body.get("event_type", "")
    resource = body.get("resource", {})

    custom_id = resource.get("custom_id") or resource.get("custom", "")
    subscriber = resource.get("subscriber", {})
    email = subscriber.get("email_address", "")
    subscription_id = resource.get("id", "")

    user = None
    if custom_id and str(custom_id).isdigit():
        user = db.query(User).filter(User.id == int(custom_id)).first()
    if not user and email:
        user = db.query(User).filter(User.email == email).first()
    if not user and subscription_id:
        user = db.query(User).filter(User.paypal_subscription_id == subscription_id).first()

    if user:
        if event_type in ("BILLING.SUBSCRIPTION.ACTIVATED", "PAYMENT.SALE.COMPLETED"):
            billing_info = resource.get("billing_info", {})
            next_billing = billing_info.get("next_billing_time")
            try:
                end_date = datetime.fromisoformat(next_billing.replace("Z", "+00:00")) if next_billing else None
            except Exception:
                end_date = None
            if not end_date:
                end_date = datetime.utcnow() + timedelta(days=32)

            user.subscription_tier = "pro"
            user.subscription_status = "active"
            user.subscription_end_date = end_date
            if subscription_id:
                user.paypal_subscription_id = subscription_id
            db.commit()

        elif event_type in (
            "BILLING.SUBSCRIPTION.CANCELLED",
            "BILLING.SUBSCRIPTION.EXPIRED",
            "BILLING.SUBSCRIPTION.SUSPENDED",
        ):
            user.subscription_tier = "free"
            user.subscription_status = "canceled"
            db.commit()

    return {"status": "ok"}


# ---------------------------------------------------------------------------
# POST /api/billing/cancel
# ---------------------------------------------------------------------------

@router.post("/cancel")
def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Cancel the current user's PayPal subscription and downgrade to Free.
    """
    if current_user.subscription_tier != "pro":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active Pro subscription to cancel.",
        )

    sub_id = current_user.paypal_subscription_id
    if sub_id and settings.paypal_client_id:
        try:
            resp = http_requests.post(
                f"{settings.paypal_api_base}/v1/billing/subscriptions/{sub_id}/cancel",
                json={"reason": "User requested cancellation"},
                headers=_paypal_headers(),
                timeout=10,
            )
            if resp.status_code not in (200, 204):
                print(f"PayPal cancel warning: {resp.status_code} {resp.text}")
        except Exception as exc:
            print(f"PayPal cancel error: {exc}")

    current_user.subscription_tier = "free"
    current_user.subscription_status = "canceled"
    db.commit()
    db.refresh(current_user)

    return {"message": "Subscription cancelled. You are now on the Free plan."}
