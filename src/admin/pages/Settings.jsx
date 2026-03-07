import React, { useState } from 'react';
import { Save, Bell, DollarSign, Zap, Shield, Globe, Mail } from 'lucide-react';

const Section = ({ title, icon: Icon, children }) => (
  <div className="bg-card border border-white/5 rounded-2xl overflow-hidden">
    <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
      <Icon className="w-4 h-4 text-blue-400" />
      <p className="text-sm font-semibold text-white">{title}</p>
    </div>
    <div className="p-5 space-y-4">{children}</div>
  </div>
);

const Toggle = ({ label, description, defaultChecked }) => {
  const [on, setOn] = useState(defaultChecked ?? false);
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => setOn(!on)}
        className={`relative w-10 h-5.5 rounded-full transition-colors ${on ? 'bg-blue-600' : 'bg-white/10'}`}
        style={{ height: 22, width: 40, flexShrink: 0 }}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[20px]' : 'translate-x-0.5'}`}
          style={{ width: 16, height: 16 }}
        />
      </button>
    </div>
  );
};

const Input = ({ label, defaultValue, type = 'text', prefix }) => (
  <div>
    <label className="block text-xs font-medium text-gray-400 mb-1">{label}</label>
    <div className="flex items-center bg-white/5 border border-white/10 rounded-lg overflow-hidden focus-within:border-blue-500/50">
      {prefix && <span className="px-3 py-2.5 text-sm text-gray-400 border-r border-white/10">{prefix}</span>}
      <input
        type={type}
        defaultValue={defaultValue}
        className="flex-1 bg-transparent px-3 py-2.5 text-sm text-white placeholder-gray-500 outline-none"
      />
    </div>
  </div>
);

export default function Settings() {
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-6 space-y-6 min-h-full max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">Admin Settings</h2>
          <p className="text-sm text-gray-400 mt-0.5">Configure thresholds, alerts, and platform settings</p>
        </div>
        <button
          onClick={handleSave}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            saved ? 'bg-green-600/20 text-green-300 border border-green-500/30' : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          <Save className="w-4 h-4" />
          {saved ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <Section title="Alert Thresholds" icon={Bell}>
        <Input label="Token cost spike threshold (% above 7-day average)" defaultValue="30" type="number" />
        <Input label="Churn alert threshold (%/week)" defaultValue="4" type="number" />
        <Input label="Checkout conversion drop alert (%)" defaultValue="20" type="number" />
        <Input label="Daily digest open rate floor (%)" defaultValue="35" type="number" />
      </Section>

      <Section title="Revenue & Billing" icon={DollarSign}>
        <Input label="Monthly AI cost budget (USD)" defaultValue="5000" type="number" prefix="$" />
        <Input label="Infra cost budget (USD/month)" defaultValue="2000" type="number" prefix="$" />
        <Input label="PayPal Webhook URL" defaultValue="https://api.hirematrix.ai/webhooks/paypal" />
        <Toggle label="Auto-downgrade users on payment failure" description="Revert to free plan after 3 failed payment attempts" defaultChecked={true} />
      </Section>

      <Section title="AI & Token Limits" icon={Zap}>
        <Input label="Max tokens per resume tailoring request" defaultValue="4096" type="number" />
        <Input label="Max resume tailoring requests per free user/month" defaultValue="3" type="number" />
        <Input label="Max resume tailoring requests per paid user/month" defaultValue="50" type="number" />
        <Toggle label="Enable GPT-4o for premium features only" description="Free users get GPT-4o-mini; premium gets GPT-4o" defaultChecked={true} />
        <Toggle label="Log all AI prompts for audit" description="Store prompt/completion pairs for cost attribution" defaultChecked={false} />
      </Section>

      <Section title="Security" icon={Shield}>
        <Toggle label="Require email verification on signup" defaultChecked={true} />
        <Toggle label="Enable rate limiting on AI endpoints" defaultChecked={true} />
        <Toggle label="Block suspected prompt injection attempts" defaultChecked={true} />
        <Input label="JWT token expiry (hours)" defaultValue="24" type="number" />
        <Input label="Admin access IP whitelist (comma-separated)" defaultValue="0.0.0.0/0" />
      </Section>

      <Section title="Notifications" icon={Mail}>
        <Input label="Alert notification email" defaultValue="hirematrix.ai@gmail.com" type="email" />
        <Toggle label="Daily KPI summary email" defaultChecked={true} />
        <Toggle label="Weekly investor report email" defaultChecked={false} />
        <Toggle label="Slack webhook for critical alerts" defaultChecked={false} />
        <Input label="Slack webhook URL" defaultValue="" />
      </Section>

      <Section title="Platform" icon={Globe}>
        <Input label="App URL" defaultValue="https://app.hirematrix.ai" />
        <Input label="API base URL" defaultValue="https://api.hirematrix.ai" />
        <Toggle label="Maintenance mode" description="Shows maintenance page to all non-admin users" defaultChecked={false} />
        <Toggle label="Enable Hebrew (RTL) language option" defaultChecked={true} />
        <Toggle label="Enable Israeli job board scraping" defaultChecked={true} />
      </Section>
    </div>
  );
}
