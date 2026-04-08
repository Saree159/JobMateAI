import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/AuthContext";
import { userApi } from "@/api/jobmate";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check, X, Loader2, Crown, Zap, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import WaitlistDialog from "@/components/ui/WaitlistDialog";

const MONTHLY_PRICE = 69;
const ANNUAL_PRICE = 588;

const FREE_FEATURES = [
  { text: "2 job refreshes per day", included: true },
  { text: "AI match scoring", included: true },
  { text: "Application tracking", included: true },
  { text: "Manual job entry", included: true },
  { text: "AI cover letter generation", included: false },
  { text: "Unlimited job refreshes", included: false },
  { text: "Priority support", included: false },
  { text: "Interview prep tips", included: false },
];

const PRO_FEATURES = [
  { text: "Unlimited job refreshes", included: true },
  { text: "AI match scoring", included: true },
  { text: "Application tracking", included: true },
  { text: "AI cover letter generation", included: true },
  { text: "Advanced matching algorithm", included: true },
  { text: "Priority support", included: true },
  { text: "Interview prep tips", included: true },
  { text: "Salary insights", included: true },
];

export default function Pricing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState("monthly");
  const [loadingCancel, setLoadingCancel] = useState(false);
  const [showWaitlist, setShowWaitlist] = useState(false);

  const currentPlan = user?.subscription_tier || "free";
  const isPro = currentPlan === "pro";

  const monthlyPrice = billingPeriod === "annual" ? Math.round(ANNUAL_PRICE / 12) : MONTHLY_PRICE;
  const annualTotal = ANNUAL_PRICE;
  const savings = MONTHLY_PRICE * 12 - ANNUAL_PRICE;

  const handleCancelSubscription = async () => {
    if (!window.confirm("Are you sure you want to cancel your Pro subscription?")) return;
    setLoadingCancel(true);
    try {
      await billingApi.cancelSubscription();
      const freshUser = await userApi.getById(user.id);
      updateUser(freshUser);
      toast.success("Subscription cancelled. You are now on the Free plan.");
    } catch (err) {
      toast.error(err.message || "Failed to cancel subscription.");
    } finally {
      setLoadingCancel(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-12">
      <WaitlistDialog open={showWaitlist} onClose={() => setShowWaitlist(false)} />
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Simple, transparent pricing
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto">
            Start free, upgrade when you're ready to accelerate your job search.
          </p>
        </div>

        {/* Billing toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <span className={`text-sm font-medium ${billingPeriod === "monthly" ? "text-gray-900" : "text-gray-400"}`}>Monthly</span>
          <button
            onClick={() => setBillingPeriod(p => p === "monthly" ? "annual" : "monthly")}
            className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none ${billingPeriod === "annual" ? "bg-blue-600" : "bg-gray-200"}`}
          >
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${billingPeriod === "annual" ? "translate-x-5" : ""}`} />
          </button>
          <span className={`text-sm font-medium ${billingPeriod === "annual" ? "text-gray-900" : "text-gray-400"}`}>Annual</span>
          {billingPeriod === "annual" && (
            <span className="text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
              Save ₪{savings}
            </span>
          )}
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">

          {/* Free */}
          <div className={`bg-white rounded-2xl border p-8 flex flex-col ${!isPro ? "border-gray-900 ring-1 ring-gray-900" : "border-gray-200"}`}>
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Free</span>
                {!isPro && <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">Current plan</span>}
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-bold text-gray-900">₪0</span>
                <span className="text-gray-400 text-sm">/ forever</span>
              </div>
              <p className="text-gray-500 text-sm">Everything you need to get started.</p>
            </div>

            <div className="space-y-3 flex-1 mb-8">
              {FREE_FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  {f.included
                    ? <div className="w-4 h-4 rounded-full bg-gray-900 flex items-center justify-center shrink-0"><Check className="w-2.5 h-2.5 text-white" strokeWidth={3} /></div>
                    : <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center shrink-0"><X className="w-2.5 h-2.5 text-gray-400" strokeWidth={3} /></div>
                  }
                  <span className={`text-sm ${f.included ? "text-gray-700" : "text-gray-400"}`}>{f.text}</span>
                </div>
              ))}
            </div>

            <Button
              variant="outline"
              className="w-full border-gray-200 text-gray-600 h-11"
              disabled={!isPro}
              onClick={isPro ? handleCancelSubscription : undefined}
            >
              {isPro ? (loadingCancel ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cancelling...</> : "Downgrade to Free") : "Current Plan"}
            </Button>
          </div>

          {/* Pro */}
          <div className={`bg-gray-900 rounded-2xl p-8 flex flex-col relative overflow-hidden ${isPro ? "ring-2 ring-blue-500" : ""}`}>
            {/* glow */}
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />

            <div className="mb-6 relative">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white/60 uppercase tracking-wider">Pro</span>
                  <span className="text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" />Most popular
                  </span>
                </div>
                {isPro && <span className="text-xs font-medium bg-white/10 text-white/70 px-2.5 py-1 rounded-full">Current plan</span>}
              </div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-4xl font-bold text-white">₪{monthlyPrice}</span>
                <span className="text-white/40 text-sm">/ mo</span>
              </div>
              {billingPeriod === "annual" && (
                <p className="text-white/40 text-xs">Billed ₪{annualTotal}/year</p>
              )}
              <p className="text-white/50 text-sm mt-1">Unlimited access to all features.</p>
            </div>

            <div className="space-y-3 flex-1 mb-8 relative">
              {PRO_FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                    <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                  </div>
                  <span className="text-sm text-white/80">{f.text}</span>
                </div>
              ))}
            </div>

            <div className="relative">
              {isPro ? (
                <Button
                  variant="outline"
                  className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 h-11 bg-transparent"
                  onClick={handleCancelSubscription}
                  disabled={loadingCancel}
                >
                  {loadingCancel ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Cancelling...</> : "Cancel Subscription"}
                </Button>
              ) : (
                <Button
                  className="w-full bg-white hover:bg-gray-100 text-gray-900 font-semibold h-11 group"
                  onClick={() => setShowWaitlist(true)}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Join Pro Waitlist
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Comparison table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-10">
          <div className="px-6 py-5 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Feature comparison</h2>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider">Feature</th>
                <th className="text-center py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider w-24">Free</th>
                <th className="text-center py-3 px-6 text-xs font-medium text-gray-400 uppercase tracking-wider w-24">Pro</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {[
                ["Job refreshes / day", "2", "Unlimited"],
                ["AI match scoring", true, true],
                ["Application tracking", true, true],
                ["AI cover letter generation", false, true],
                ["Interview prep tips", false, true],
                ["Priority support", false, true],
              ].map(([feature, free, pro], i) => (
                <tr key={i} className="hover:bg-gray-50/50">
                  <td className="py-3.5 px-6 text-sm text-gray-700">{feature}</td>
                  <td className="py-3.5 px-6 text-center">
                    {typeof free === "boolean"
                      ? free
                        ? <Check className="w-4 h-4 text-gray-500 mx-auto" />
                        : <X className="w-4 h-4 text-gray-300 mx-auto" />
                      : <span className="text-sm text-gray-600 font-medium">{free}</span>
                    }
                  </td>
                  <td className="py-3.5 px-6 text-center">
                    {typeof pro === "boolean"
                      ? pro
                        ? <Check className="w-4 h-4 text-blue-600 mx-auto" />
                        : <X className="w-4 h-4 text-gray-300 mx-auto" />
                      : <span className="text-sm text-blue-600 font-semibold">{pro}</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-4">
            Questions? <a href="mailto:hirematrix.ai@gmail.com" className="text-blue-600 hover:underline">hirematrix.ai@gmail.com</a>
          </p>
          <Button variant="ghost" size="sm" onClick={() => navigate(createPageUrl("Dashboard"))} className="text-gray-400 hover:text-gray-600">
            Back to Dashboard
          </Button>
        </div>

      </div>
    </div>
  );
}
