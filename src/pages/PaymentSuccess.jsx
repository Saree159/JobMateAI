import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/AuthContext";
import { userApi, billingApi } from "@/api/jobmate";
import { useNavigate, useSearchParams } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Crown, ArrowRight, Loader2 } from "lucide-react";
import confetti from "canvas-confetti";

export default function PaymentSuccess() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.55 },
      colors: ["#4f46e5", "#7c3aed", "#06b6d4", "#22c55e"],
    });

    async function activate() {
      if (!user?.id) { setLoading(false); return; }

      const subscriptionId = searchParams.get("subscription_id");

      try {
        if (subscriptionId) {
          // Verify the subscription with PayPal and activate Pro in the DB
          await billingApi.verifySubscription(subscriptionId);
        }
        // Fetch fresh user so the UI reflects the new subscription_tier
        const freshUser = await userApi.getById(user.id);
        updateUser(freshUser);
      } catch (err) {
        // Non-fatal: PayPal may still be processing — user sees the success screen anyway
        console.warn("PaymentSuccess verify:", err.message);
        setError("Your payment was received. Your account will be upgraded within a few minutes.");
      } finally {
        setLoading(false);
      }
    }

    activate();
  }, []); // intentionally empty — run once on mount

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
      <div className="max-w-md w-full text-center">

        <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-blue-600 flex items-center justify-center shadow-lg">
          {loading
            ? <Loader2 className="w-10 h-10 text-white animate-spin" />
            : <Crown className="w-12 h-12 text-white" />
          }
        </div>

        <h1 className="text-4xl font-bold text-gray-900 mb-3">
          {loading ? t('payment.activating') : t('payment.successTitle')}
        </h1>
        <p className="text-lg text-gray-600 mb-2">
          {t('payment.successSubtitle')}
        </p>
        {error && (
          <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 mb-4">
            {error}
          </p>
        )}
        {!loading && (
          <p className="text-sm text-gray-400 mb-8">
            {t('payment.unlocked')}
          </p>
        )}

        <div className="space-y-3">
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg"
            disabled={loading}
            onClick={() => navigate(createPageUrl("Dashboard"))}
          >
            {t('payment.goToDashboard')}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <Button
            variant="outline"
            className="w-full"
            disabled={loading}
            onClick={() => navigate(createPageUrl("Profile"))}
          >
            {t('payment.viewProfile')}
          </Button>
        </div>
      </div>
    </div>
  );
}
