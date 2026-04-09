"""
Gmail SMTP email service.
Uses Python's built-in smtplib — no extra dependencies needed.

Setup:
  1. Enable 2-Step Verification on your Google Account
  2. Go to Security → App Passwords → create one for "HireMatrix"
  3. Set GMAIL_USER and GMAIL_APP_PASSWORD in your .env / Azure env vars
"""
import smtplib
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.config import settings

logger = logging.getLogger(__name__)


def _send(to: str, subject: str, html: str) -> bool:
    """Send a single HTML email via Gmail SMTP. Returns True on success."""
    if not settings.gmail_user or not settings.gmail_app_password:
        logger.warning("Gmail credentials not configured — skipping email send")
        return False

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"]    = f"HireMatrix <{settings.gmail_user}>"
    msg["To"]      = to
    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587, timeout=10) as server:
            server.ehlo()
            server.starttls()
            server.login(settings.gmail_user, settings.gmail_app_password)
            server.sendmail(settings.gmail_user, to, msg.as_string())
        logger.info(f"Email sent to {to}: {subject}")
        return True
    except Exception as exc:
        logger.error(f"Failed to send email to {to}: {exc}")
        return False


def send_verification_email(to: str, full_name: str, token: str) -> bool:
    """Send the email-verification link."""
    verify_url = f"{settings.frontend_url}/verify-email/confirm?token={token}"
    first_name  = (full_name or "there").split()[0]

    html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1e40af,#0ea5e9);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">HireMatrix</h1>
          <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px;">AI-Powered Job Search</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          <h2 style="margin:0 0 8px;color:#111827;font-size:20px;font-weight:600;">
            Hey {first_name}, confirm your email 👋
          </h2>
          <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
            You're one step away from finding your next job. Click the button below to verify your email address and activate your account.
          </p>

          <!-- CTA button -->
          <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
            <tr><td style="background:#2563eb;border-radius:8px;">
              <a href="{verify_url}"
                 style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
                Verify My Email
              </a>
            </td></tr>
          </table>

          <p style="margin:0 0 8px;color:#9ca3af;font-size:13px;">
            Or paste this link into your browser:
          </p>
          <p style="margin:0 0 24px;word-break:break-all;color:#2563eb;font-size:12px;">{verify_url}</p>

          <p style="margin:0;color:#d1d5db;font-size:12px;">
            This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">
            © 2025 HireMatrix · <a href="mailto:hirematrix.ai@gmail.com" style="color:#6b7280;">hirematrix.ai@gmail.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
"""
    return _send(to, "Verify your HireMatrix email", html)


def send_password_reset_email(to: str, full_name: str, token: str) -> bool:
    """Send a password-reset link."""
    reset_url = f"{settings.frontend_url}/reset-password?token={token}"
    first_name = (full_name or "there").split()[0]

    html = f"""
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
</head>
<body style="margin:0;padding:0;background:#f4f6fb;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fb;padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#1e40af,#0ea5e9);padding:32px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">HireMatrix</h1>
          <p style="margin:6px 0 0;color:#bfdbfe;font-size:14px;">AI-Powered Job Search</p>
        </td></tr>

        <!-- Body -->
        <tr><td style="padding:36px 40px;">
          <h2 style="margin:0 0 8px;color:#111827;font-size:20px;font-weight:600;">
            Reset your password, {first_name}
          </h2>
          <p style="margin:0 0 24px;color:#6b7280;font-size:15px;line-height:1.6;">
            We received a request to reset your password. Click the button below to choose a new one.
            This link expires in <strong>1 hour</strong>.
          </p>

          <!-- CTA button -->
          <table cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
            <tr><td style="background:#2563eb;border-radius:8px;">
              <a href="{reset_url}"
                 style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">
                Reset My Password
              </a>
            </td></tr>
          </table>

          <p style="margin:0 0 8px;color:#9ca3af;font-size:13px;">
            Or paste this link into your browser:
          </p>
          <p style="margin:0 0 24px;word-break:break-all;color:#2563eb;font-size:12px;">{reset_url}</p>

          <p style="margin:0;color:#d1d5db;font-size:12px;">
            If you didn't request a password reset, you can safely ignore this email. Your password will not change.
          </p>
        </td></tr>

        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">
            © 2025 HireMatrix · <a href="mailto:hirematrix.ai@gmail.com" style="color:#6b7280;">hirematrix.ai@gmail.com</a>
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
"""
    return _send(to, "Reset your HireMatrix password", html)
