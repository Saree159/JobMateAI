import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/lib/AuthContext";
import { billingApi, userApi } from "@/api/jobmate";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Sparkles,
  Crown,
  Star,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

const MONTHLY_PRICE = 69;
const ANNUAL_PRICE = 588; // ₪49/mo × 12

const plans = {
  free: {
    name: "Free",
    icon: Sparkles,
    features: [
      "Up to 5 job matches per day",
      "Basic job matching algorithm",
      "Manual job entry",
      "Application tracking",
      "Email support",
    ],
  },
  pro: {
    name: "Pro",
    icon: Crown,
    popular: true,
    features: [
      "Unlimited job matches",
      "AI-powered cover letter generation",
      "Advanced matching algorithm",
      "Job URL extraction",
      "Priority email support",
      "Interview preparation tips",
      "Salary insights",
      "Application analytics",
    ],
  },
};

export default function Pricing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [billingPeriod, setBillingPeriod] = useState("monthly");
  const [loadingCheckout, setLoadingCheckout] = useState(false);
  const [loadingCancel, setLoadingCancel] = useState(false);

  const currentPlan = user?.subscription_tier || "free";
  const isPro = currentPlan === "pro";

  const handleUpgradeToPro = async () => {
    setLoadingCheckout(true);
    try {
      const { url } = await billingApi.getCheckoutUrl(billingPeriod);
      window.location.href = url;
    } catch (err) {
      toast.error(err.message || "Could not start checkout. Please try again.");
      setLoadingCheckout(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm("Are you sure you want to cancel your Pro subscription?")) return;
    setLoadingCancel(true);
    try {
      await billingApi.cancelSubscription();
      // Refresh user from backend so subscription_tier reflects 'free'
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
    <div className="p-4 md:p-10 overflow-x-hidden">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-semibold text-gray-900 mb-4">
            {t('pricing.title')}
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">
            {t('pricing.subtitle')}
          </p>
        </div>

        {/* Current Plan Badge */}
        {user && (
          <div className="text-center mb-8">
            <Badge className={`text-base px-5 py-2 ${isPro ? "bg-blue-600" : "bg-gray-600"}`}>
              {`${t('pricing.currentPlan')}: ${isPro ? t('pricing.currentPlanPro') : t('pricing.currentPlanFree')}`}
            </Badge>
          </div>
        )}

        {/* Billing Period Toggle */}
        <div className="flex items-center justify-center gap-4 mb-10">
          <span className={`font-medium ${billingPeriod === "monthly" ? "text-gray-900" : "text-gray-400"}`}>
            {t('pricing.monthly')}
          </span>
          <button
            onClick={() => setBillingPeriod(p => p === "monthly" ? "annual" : "monthly")}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              billingPeriod === "annual" ? "bg-blue-600" : "bg-gray-300"
            }`}
          >
            <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
              billingPeriod === "annual" ? "translate-x-7" : ""
            }`} />
          </button>
          <span className={`font-medium ${billingPeriod === "annual" ? "text-gray-900" : "text-gray-400"}`}>
            {t('pricing.annual')}
          </span>
          {billingPeriod === "annual" && (
            <Badge className="bg-green-100 text-green-700 border-green-200">{t('pricing.save')}</Badge>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {Object.entries(plans).map(([key, plan]) => {
            const PlanIcon = plan.icon;
            const isCurrentPlan = currentPlan === key;

            const priceDisplay = key === "free"
              ? { main: "₪0", sub: t('pricing.forever') }
              : billingPeriod === "monthly"
                ? { main: `₪${MONTHLY_PRICE}`, sub: t('pricing.perMonth') }
                : { main: `₪${ANNUAL_PRICE}`, sub: `per year (₪${Math.round(ANNUAL_PRICE / 12)}/mo)` };

            return (
              <Card
                key={key}
                className={`border transition-all ${
                  plan.popular ? "border-blue-600" : "border-gray-100"
                } ${isCurrentPlan ? "ring-2 ring-blue-200" : ""}`}
              >
                <CardHeader className="text-center pb-8 pt-8">
                  {plan.popular && (
                    <Badge className="mb-4 bg-blue-600 self-center">
                      <Star className="w-3 h-3 mr-1" />
                      {t('pricing.mostPopular')}
                    </Badge>
                  )}

                  <div className={`w-16 h-16 mx-auto mb-4 rounded-lg ${
                    key === "pro" ? "bg-blue-600" : "bg-gray-600"
                  } flex items-center justify-center`}>
                    <PlanIcon className="w-8 h-8 text-gray-900" />
                  </div>

                  <CardTitle className="text-3xl mb-2">{plan.name}</CardTitle>
                  <div className="flex items-baseline justify-center gap-2 mb-2">
                    <span className="text-5xl font-bold text-gray-900">{priceDisplay.main}</span>
                    <span className="text-gray-400 text-sm">/ {priceDisplay.sub}</span>
                  </div>

                  {isCurrentPlan && (
                    <Badge variant="outline" className="mt-2 self-center">
                      <Check className="w-3 h-3 mr-1" />
                      {t('pricing.yourPlan')}
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Features */}
                  <div className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Check className="w-3 h-3 text-green-600" />
                        </div>
                        <span className="text-gray-300">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <div className="pt-6">
                    {key === "free" ? (
                      isCurrentPlan ? (
                        <Button variant="outline" className="w-full" disabled>
                          Current Plan
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={handleCancelSubscription}
                          disabled={loadingCancel}
                        >
                          {loadingCancel ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('pricing.cancelling')}</>
                          ) : t('pricing.downgradeToFree')}
                        </Button>
                      )
                    ) : (
                      isCurrentPlan ? (
                        <Button
                          variant="outline"
                          className="w-full border-red-200 text-red-600 hover:bg-red-900/30"
                          onClick={handleCancelSubscription}
                          disabled={loadingCancel}
                        >
                          {loadingCancel ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('pricing.cancelling')}</>
                          ) : t('pricing.cancelSubscription')}
                        </Button>
                      ) : (
                        <Button
                          className="w-full bg-blue-600 hover:bg-blue-700 text-gray-900 font-medium py-6 text-lg"
                          onClick={handleUpgradeToPro}
                          disabled={loadingCheckout}
                        >
                          {loadingCheckout ? (
                            <><Loader2 className="w-5 h-5 mr-2 animate-spin" />{t('pricing.redirecting')}</>
                          ) : (
                            <><Crown className="w-5 h-5 mr-2" />{t('pricing.upgradeToPro')}</>
                          )}
                        </Button>
                      )
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Feature Comparison Table */}
        <Card className="border border-gray-100 mb-12">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-center">{t('pricing.featureComparison')}</CardTitle>
            <CardDescription className="text-center">{t('pricing.featureComparisonSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2">
                    <th className="text-left py-4 px-4">{t('pricing.feature')}</th>
                    <th className="text-center py-4 px-4">{t('pricing.free')}</th>
                    <th className="text-center py-4 px-4 bg-blue-900/20 rounded-t-lg">{t('pricing.pro')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    [t('pricing.jobMatchesPerDay'), "5", t('pricing.unlimited')],
                    ["AI Cover Letter Generator", "❌", "✅"],
                    ["Job URL Extraction", "❌", "✅"],
                    ["Application Tracking", "✅", "✅"],
                    ["Priority Support", "❌", "✅"],
                    ["Interview Prep Tips", "❌", "✅"],
                  ].map(([feature, free, pro], idx, arr) => (
                    <tr key={idx} className={idx < arr.length - 1 ? "border-b" : ""}>
                      <td className="py-4 px-4 font-medium">{feature}</td>
                      <td className="text-center py-4 px-4">{free}</td>
                      <td className="text-center py-4 px-4 bg-blue-900/20">{pro}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center">
          <p className="text-gray-400 mb-6">
            {t('pricing.questions')} {t('pricing.contactUs')} <a href="mailto:hirematrix.ai@gmail.com" className="text-blue-600 underline">hirematrix.ai@gmail.com</a>
          </p>
          <Button variant="outline" onClick={() => navigate(createPageUrl("Dashboard"))}>
            {t('pricing.backToDashboard')}
          </Button>
        </div>

      </div>
    </div>
  );
}
