import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Sparkles, Zap, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function UpgradePrompt({ open, onClose, feature, limit }) {
  const navigate = useNavigate();

  const handleUpgrade = () => {
    navigate(createPageUrl("Pricing"));
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-2xl text-center">
            Upgrade to Pro
          </DialogTitle>
          <DialogDescription className="text-center text-base">
            {limit || `You've reached the limit for ${feature} on the Free plan`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 space-y-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Crown className="w-5 h-5 text-indigo-600" />
              Pro Plan Benefits
            </h3>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Unlimited job matches
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                AI cover letter generation
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Job URL extraction
              </li>
              <li className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Priority support
              </li>
            </ul>
            <div className="pt-4 border-t border-indigo-200">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">₪69</span>
                <span className="text-gray-600">/ month</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Maybe Later
            </Button>
            <Button 
              onClick={handleUpgrade}
              className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
            >
              <Zap className="w-4 h-4 mr-2" />
              Upgrade Now
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}