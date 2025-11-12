import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Check, 
  Sparkles, 
  Crown, 
  Zap,
  Star,
  AlertCircle
} from "lucide-react";

const plans = {
  free: {
    name: "Free",
    price: "₪0",
    period: "forever",
    icon: Sparkles,
    color: "from-gray-400 to-gray-500",
    features: [
      "Up to 5 job matches per day",
      "Basic job matching algorithm",
      "Manual job entry",
      "Application tracking",
      "Email support",
    ],
    limitations: [
      "No AI cover letter generation",
      "Limited job views per day",
      "No priority support",
    ]
  },
  pro: {
    name: "Pro",
    price: "₪69",
    period: "per month",
    icon: Crown,
    color: "from-indigo-500 to-purple-600",
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
    limitations: []
  }
};

export default function Pricing() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [upgrading, setUpgrading] = useState(false);
  const [showInfo, setShowInfo] = useState(true);

  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const updateSubscriptionMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setUpgrading(false);
    },
  });

  const handleUpgradeToPro = () => {
    // In production, this would redirect to Stripe Checkout
    // For now, we'll simulate the upgrade
    setUpgrading(true);
    
    // Simulate payment processing
    setTimeout(() => {
      updateSubscriptionMutation.mutate({
        subscription_tier: 'pro',
        subscription_status: 'active',
        subscription_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
    }, 1500);
  };

  const handleCancelSubscription = () => {
    if (confirm('Are you sure you want to cancel your Pro subscription?')) {
      updateSubscriptionMutation.mutate({
        subscription_tier: 'free',
        subscription_status: 'canceled',
      });
    }
  };

  const currentPlan = user?.subscription_tier || 'free';
  const isPro = currentPlan === 'pro';

  return (
    <div className="min-h-screen p-6 md:p-10 bg-white">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-semibold text-gray-900 mb-4">
            Supercharge Your Job Search
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start free and upgrade when you're ready to unlock AI-powered features
          </p>
        </div>

        {/* Info Alert */}
        {showInfo && (
          <Alert className="mb-8 border-indigo-200 bg-indigo-50">
            <AlertCircle className="w-4 h-4 text-indigo-600" />
            <AlertDescription className="text-indigo-900">
              <strong>Demo Mode:</strong> Payment processing requires backend functions to be enabled. 
              In production, this would integrate with Stripe/Paddle for secure payments.
              <button 
                onClick={() => setShowInfo(false)}
                className="ml-2 underline hover:no-underline"
              >
                Dismiss
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Current Plan Badge */}
        {user && (
          <div className="text-center mb-10">
            <Badge className={`text-base px-5 py-2 ${
              isPro ? 'bg-indigo-600' : 'bg-gray-600'
            }`}>
              Current Plan: {isPro ? '👑 Pro' : '✨ Free'}
            </Badge>
          </div>
        )}

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {Object.entries(plans).map(([key, plan]) => {
            const PlanIcon = plan.icon;
            const isCurrentPlan = currentPlan === key;
            
            return (
              <Card 
                key={key}
                className={`border transition-all ${
                  plan.popular ? 'border-indigo-600' : 'border-gray-100'
                } ${isCurrentPlan ? 'ring-2 ring-indigo-200' : ''}`}
              >
                <CardHeader className="text-center pb-8 pt-8">
                  {plan.popular && (
                    <Badge className="mb-4 bg-indigo-600">
                      <Star className="w-3 h-3 mr-1" />
                      Most Popular
                    </Badge>
                  )}
                  
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-lg ${key === 'pro' ? 'bg-indigo-600' : 'bg-gray-600'} flex items-center justify-center`}>
                    <PlanIcon className="w-8 h-8 text-white" />
                  </div>
                  
                  <CardTitle className="text-3xl mb-2">{plan.name}</CardTitle>
                  <div className="flex items-baseline justify-center gap-2 mb-2">
                    <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                    <span className="text-gray-600">/ {plan.period}</span>
                  </div>
                  
                  {isCurrentPlan && (
                    <Badge variant="outline" className="mt-2">
                      <Check className="w-3 h-3 mr-1" />
                      Your Current Plan
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
                        <span className="text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action Button */}
                  <div className="pt-6">
                    {key === 'free' ? (
                      isCurrentPlan ? (
                        <Button variant="outline" className="w-full" disabled>
                          Current Plan
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={handleCancelSubscription}
                          disabled={updateSubscriptionMutation.isPending}
                        >
                          Downgrade to Free
                        </Button>
                      )
                    ) : (
                      isCurrentPlan ? (
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={handleCancelSubscription}
                          disabled={updateSubscriptionMutation.isPending}
                        >
                          Cancel Subscription
                        </Button>
                      ) : (
                        <Button 
                          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-6 text-lg"
                          onClick={handleUpgradeToPro}
                          disabled={upgrading || updateSubscriptionMutation.isPending}
                        >
                          {upgrading ? (
                            <>
                              <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            <>
                              <Crown className="w-5 h-5 mr-2" />
                              Upgrade to Pro
                            </>
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
        <Card className="border border-gray-100">
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-center">Feature Comparison</CardTitle>
            <CardDescription className="text-center">
              See what's included in each plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2">
                    <th className="text-left py-4 px-4">Feature</th>
                    <th className="text-center py-4 px-4">Free</th>
                    <th className="text-center py-4 px-4 bg-indigo-50 rounded-t-lg">Pro</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b">
                    <td className="py-4 px-4 font-medium">Job matches per day</td>
                    <td className="text-center py-4 px-4">5</td>
                    <td className="text-center py-4 px-4 bg-indigo-50">Unlimited</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4 px-4 font-medium">AI Cover Letter Generator</td>
                    <td className="text-center py-4 px-4">❌</td>
                    <td className="text-center py-4 px-4 bg-indigo-50">✅</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4 px-4 font-medium">Job URL Extraction</td>
                    <td className="text-center py-4 px-4">❌</td>
                    <td className="text-center py-4 px-4 bg-indigo-50">✅</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4 px-4 font-medium">Application Tracking</td>
                    <td className="text-center py-4 px-4">✅</td>
                    <td className="text-center py-4 px-4 bg-indigo-50">✅</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-4 px-4 font-medium">Priority Support</td>
                    <td className="text-center py-4 px-4">❌</td>
                    <td className="text-center py-4 px-4 bg-indigo-50">✅</td>
                  </tr>
                  <tr>
                    <td className="py-4 px-4 font-medium">Interview Prep Tips</td>
                    <td className="text-center py-4 px-4">❌</td>
                    <td className="text-center py-4 px-4 bg-indigo-50 rounded-b-lg">✅</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* FAQ Section */}
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Questions?</h2>
          <p className="text-gray-600 mb-6">
            Contact us at support@jobmate.ai or check out our FAQ section
          </p>
          <Button variant="outline" onClick={() => navigate(createPageUrl("Dashboard"))}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}