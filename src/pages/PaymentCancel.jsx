import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";

export default function PaymentCancel() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-md w-full text-center">

        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
          <XCircle className="w-10 h-10 text-gray-400" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-3">{t('payment.cancelledTitle')}</h1>
        <p className="text-gray-400 mb-8">
          {t('payment.cancelledSubtitle')}
        </p>

        <div className="space-y-3">
          <Button
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={() => navigate(createPageUrl("Pricing"))}
          >
            {t('payment.backToPricing')}
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate(createPageUrl("Dashboard"))}
          >
            {t('payment.goToDashboard')}
          </Button>
        </div>
      </div>
    </div>
  );
}
