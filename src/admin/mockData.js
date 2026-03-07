// ─── HireMatrix Admin Dashboard — Mock Data ───────────────────────────────

// ── Top-level KPIs ──────────────────────────────────────────────────────────
export const KPIs = {
  totalUsers: 18420,
  totalUsersGrowth: 12.4,
  activeUsersMAU: 6950,
  activeUsersWAU: 2840,
  activeUsersDAU: 487,
  dauMauRatio: 7.0,
  paidSubscribers: 1124,
  paidGrowth: 8.9,
  freeToPaidConversion: 6.1,
  MRR: 15870,
  MRRGrowth: 11.2,
  ARR: 190440,
  aiCostThisMonth: 3920,
  aiCostGrowth: 6.3,
  infraCostThisMonth: 1480,
  grossMargin: 66,
  jobsMatchedThisMonth: 248000,
  resumesTailoredThisMonth: 19400,
  applicationsTrackedThisMonth: 11200,
  dailyDigestOpenRate: 42,
  churn: 3.8,
  ARPU: 2.28,
  ARPPU: 14.12,
  CAC: 18.5,
  LTV: 371,
  newSignupsToday: 142,
  newSignupsWeek: 978,
  newSignupsMonth: 3820,
  activationRate: 68.4,
  paybackPeriod: 1.3,
};

// ── Monthly trend helpers ────────────────────────────────────────────────────
const months = ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

export const mrrTrend = [
  { month: 'Sep', value: 9200 },
  { month: 'Oct', value: 10500 },
  { month: 'Nov', value: 11800 },
  { month: 'Dec', value: 12900 },
  { month: 'Jan', value: 13800 },
  { month: 'Feb', value: 14270 },
  { month: 'Mar', value: 15870 },
];

export const userGrowthTrend = [
  { month: 'Sep', free: 8200, paid: 620 },
  { month: 'Oct', free: 9800, paid: 720 },
  { month: 'Nov', free: 11400, paid: 820 },
  { month: 'Dec', free: 13100, paid: 910 },
  { month: 'Jan', free: 14900, paid: 980 },
  { month: 'Feb', free: 16800, paid: 1050 },
  { month: 'Mar', free: 17296, paid: 1124 },
];

export const aiCostTrend = [
  { month: 'Sep', cost: 1820, revenue: 9200, margin: 2100 },
  { month: 'Oct', cost: 2150, revenue: 10500, margin: 2600 },
  { month: 'Nov', cost: 2480, revenue: 11800, margin: 3100 },
  { month: 'Dec', cost: 2870, revenue: 12900, margin: 3400 },
  { month: 'Jan', cost: 3200, revenue: 13800, margin: 3700 },
  { month: 'Feb', cost: 3580, revenue: 14270, margin: 3900 },
  { month: 'Mar', cost: 3920, revenue: 15870, margin: 4200 },
];

export const dailyActiveUsers = Array.from({ length: 30 }, (_, i) => ({
  day: `Mar ${i + 1}`,
  dau: Math.round(420 + Math.sin(i * 0.4) * 80 + Math.random() * 40),
}));

export const dailyAiCost = Array.from({ length: 30 }, (_, i) => ({
  day: `Mar ${i + 1}`,
  cost: Math.round(110 + Math.sin(i * 0.3) * 25 + Math.random() * 20),
  tokens: Math.round(580000 + Math.sin(i * 0.3) * 120000 + Math.random() * 80000),
}));

export const revenueBreakdown = [
  { month: 'Sep', premium: 4800, pro: 3200, addons: 1200 },
  { month: 'Oct', premium: 5500, pro: 3800, addons: 1200 },
  { month: 'Nov', premium: 6200, pro: 4300, addons: 1300 },
  { month: 'Dec', premium: 6900, pro: 4700, addons: 1300 },
  { month: 'Jan', premium: 7400, pro: 5100, addons: 1300 },
  { month: 'Feb', premium: 7700, pro: 5270, addons: 1300 },
  { month: 'Mar', premium: 8600, pro: 5870, addons: 1400 },
];

// ── Plan distribution ────────────────────────────────────────────────────────
export const planDistribution = [
  { name: 'Free', value: 17296, color: '#334155' },
  { name: 'Premium', value: 842, color: '#3b82f6' },
  { name: 'Pro', value: 282, color: '#22c55e' },
];

// ── AI token usage by feature ────────────────────────────────────────────────
export const tokensByFeature = [
  { feature: 'Resume Tailoring', tokens: 42800000, cost: 1712, pct: 43.7 },
  { feature: 'Job Matching', tokens: 28600000, cost: 1144, pct: 29.2 },
  { feature: 'Daily Digests', tokens: 12400000, cost: 496, pct: 12.6 },
  { feature: 'Cover Letters', tokens: 7200000, cost: 288, pct: 7.3 },
  { feature: 'Career Insights', tokens: 4800000, cost: 192, pct: 4.9 },
  { feature: 'Chat Assistant', tokens: 2400000, cost: 96, pct: 2.3 },
];

export const costByModel = [
  { name: 'GPT-4o', value: 2116, color: '#3b82f6' },
  { name: 'GPT-4o-mini', value: 980, color: '#22c55e' },
  { name: 'Embeddings', value: 588, color: '#a855f7' },
  { name: 'Whisper / other', value: 236, color: '#f59e0b' },
];

export const aiEfficiencyTable = [
  { feature: 'Resume Tailoring', requests: 19400, tokensIn: 28400000, tokensOut: 14400000, totalTokens: 42800000, cost: 1712, costPerReq: 0.088, convImpact: '+31%', roi: '4.2x' },
  { feature: 'Job Match Scoring', requests: 248000, tokensIn: 18200000, tokensOut: 10400000, totalTokens: 28600000, cost: 1144, costPerReq: 0.0046, convImpact: '+18%', roi: '6.8x' },
  { feature: 'Daily Job Digest', requests: 6950, tokensIn: 8400000, tokensOut: 4000000, totalTokens: 12400000, cost: 496, costPerReq: 0.071, convImpact: '+9%', roi: '3.1x' },
  { feature: 'Cover Letter Gen', requests: 8200, tokensIn: 4800000, tokensOut: 2400000, totalTokens: 7200000, cost: 288, costPerReq: 0.035, convImpact: '+12%', roi: '3.8x' },
  { feature: 'Career Insights', requests: 4100, tokensIn: 3200000, tokensOut: 1600000, totalTokens: 4800000, cost: 192, costPerReq: 0.047, convImpact: '+8%', roi: '2.9x' },
];

// ── Funnel ───────────────────────────────────────────────────────────────────
export const funnelStages = [
  { stage: 'Visitors', count: 89400, pct: 100, dropoff: 0 },
  { stage: 'Signups', count: 18420, pct: 20.6, dropoff: 79.4 },
  { stage: 'Resume Uploaded', count: 12600, pct: 68.4, dropoff: 31.6 },
  { stage: 'First Job Match', count: 9840, pct: 78.1, dropoff: 21.9 },
  { stage: 'First Resume Tailored', count: 6120, pct: 62.2, dropoff: 37.8 },
  { stage: 'First App Tracked', count: 4280, pct: 69.9, dropoff: 30.1 },
  { stage: 'Upgraded to Paid', count: 1124, pct: 26.3, dropoff: 73.7 },
  { stage: 'Retained 30d', count: 940, pct: 83.6, dropoff: 16.4 },
];

// ── Cohort retention ─────────────────────────────────────────────────────────
export const cohortRetention = [
  { cohort: 'Sep 2024', d1: 82, d7: 58, d30: 41, d90: 28 },
  { cohort: 'Oct 2024', d1: 84, d7: 61, d30: 43, d90: 30 },
  { cohort: 'Nov 2024', d1: 83, d7: 59, d30: 42, d90: 31 },
  { cohort: 'Dec 2024', d1: 86, d7: 63, d30: 45, d90: 32 },
  { cohort: 'Jan 2025', d1: 85, d7: 62, d30: 44, d90: null },
  { cohort: 'Feb 2025', d1: 87, d7: 64, d30: null, d90: null },
  { cohort: 'Mar 2025', d1: 88, d7: null, d30: null, d90: null },
];

export const retentionCurve = [
  { day: 'D1', free: 68, paid: 88 },
  { day: 'D3', free: 52, paid: 76 },
  { day: 'D7', free: 41, paid: 64 },
  { day: 'D14', free: 32, paid: 56 },
  { day: 'D30', free: 24, paid: 47 },
  { day: 'D60', free: 18, paid: 40 },
  { day: 'D90', free: 14, paid: 35 },
];

// ── Marketing ────────────────────────────────────────────────────────────────
export const marketingChannels = [
  { channel: 'LinkedIn Organic', visitors: 28400, signups: 5120, activated: 3480, paid: 380, cac: 0, revenue: 5368, ltv: 371, roi: '∞' },
  { channel: 'LinkedIn Paid', visitors: 14200, signups: 2840, activated: 1820, paid: 210, cac: 28.5, revenue: 2966, ltv: 371, roi: '13.0x' },
  { channel: 'Instagram', visitors: 11800, signups: 1960, activated: 1180, paid: 124, cac: 24.2, revenue: 1751, ltv: 371, roi: '15.3x' },
  { channel: 'SEO / Blog', visitors: 18600, signups: 3720, activated: 2480, paid: 280, cac: 0, revenue: 3953, ltv: 371, roi: '∞' },
  { channel: 'Referrals', visitors: 8200, signups: 2460, activated: 1840, paid: 84, cac: 4.2, revenue: 1186, ltv: 371, roi: '88.3x' },
  { channel: 'Communities', visitors: 6400, signups: 1920, activated: 1280, paid: 46, cac: 7.8, revenue: 650, ltv: 371, roi: '47.6x' },
];

// ── Users by geography ───────────────────────────────────────────────────────
export const usersByCountry = [
  { country: 'Israel', users: 11240, pct: 61.1 },
  { country: 'United States', users: 3180, pct: 17.3 },
  { country: 'United Kingdom', users: 980, pct: 5.3 },
  { country: 'Canada', users: 740, pct: 4.0 },
  { country: 'Germany', users: 520, pct: 2.8 },
  { country: 'Other', users: 1760, pct: 9.5 },
];

export const usersByProfession = [
  { name: 'Software Engineer', value: 6840, color: '#3b82f6' },
  { name: 'Product Manager', value: 2760, color: '#22c55e' },
  { name: 'Data Analyst', value: 2480, color: '#a855f7' },
  { name: 'Marketing', value: 1840, color: '#f59e0b' },
  { name: 'Finance', value: 1380, color: '#ec4899' },
  { name: 'Operations', value: 3120, color: '#64748b' },
];

// ── Infrastructure ───────────────────────────────────────────────────────────
export const infraCosts = [
  { month: 'Sep', hosting: 480, database: 220, scraping: 180, email: 80, storage: 60, total: 1020 },
  { month: 'Oct', hosting: 520, database: 240, scraping: 200, email: 85, storage: 65, total: 1110 },
  { month: 'Nov', hosting: 560, database: 260, scraping: 220, email: 90, storage: 70, total: 1200 },
  { month: 'Dec', hosting: 600, database: 280, scraping: 240, email: 95, storage: 75, total: 1290 },
  { month: 'Jan', hosting: 620, database: 290, scraping: 250, email: 100, storage: 80, total: 1340 },
  { month: 'Feb', hosting: 640, database: 295, scraping: 255, email: 102, storage: 82, total: 1374 },
  { month: 'Mar', hosting: 660, database: 300, scraping: 260, email: 105, storage: 85, total: 1480 },
];

export const infraBreakdown = [
  { name: 'Cloud Hosting', value: 660, color: '#3b82f6' },
  { name: 'Database', value: 300, color: '#22c55e' },
  { name: 'Scraping/Crawl', value: 260, color: '#a855f7' },
  { name: 'Email Infra', value: 105, color: '#f59e0b' },
  { name: 'Storage', value: 85, color: '#64748b' },
  { name: 'Other', value: 70, color: '#ec4899' },
];

// ── Alerts ───────────────────────────────────────────────────────────────────
export const alerts = [
  { id: 1, severity: 'critical', title: 'Token cost spike detected', detail: 'Resume tailoring costs up 42% vs 7-day average. Current: $148/day vs avg $104/day.', time: '12 min ago', feature: 'Resume Tailoring' },
  { id: 2, severity: 'warning', title: 'Churn increased this week', detail: 'Weekly churn rate rose from 3.2% to 4.6%. 18 paid users cancelled in last 7 days.', time: '2 hours ago', feature: 'Retention' },
  { id: 3, severity: 'warning', title: 'Conversion drop on premium checkout', detail: 'Checkout conversion down from 12.4% to 8.1% today. Possible PayPal issue.', time: '4 hours ago', feature: 'Revenue' },
  { id: 4, severity: 'warning', title: 'Daily digest open rate dropped', detail: 'Open rate fell to 31% today vs 42% weekly avg. Email deliverability may be impacted.', time: '6 hours ago', feature: 'Digests' },
  { id: 5, severity: 'info', title: 'New MRR milestone approaching', detail: 'At current growth rate, MRR will cross ₪16,000 within 3 days.', time: '8 hours ago', feature: 'Revenue' },
  { id: 6, severity: 'info', title: 'Job scraping pipeline healthy', detail: 'Drushim.co.il: 1,842 new jobs indexed today. GotFriends: 628 new jobs.', time: '1 hour ago', feature: 'Scraping' },
  { id: 7, severity: 'critical', title: 'Unusual API spend by feature', detail: 'Cover letter generation consumed 3.2x normal tokens. Possible prompt injection attempt.', time: '35 min ago', feature: 'Cover Letters' },
];

// ── Feature engagement ───────────────────────────────────────────────────────
export const featureEngagement = [
  { feature: 'Job Matching', adoption: 94, weeklyUsage: 4.2, retentionImpact: 'Very High', paidConversion: '+31%' },
  { feature: 'AI Resume Tailoring', adoption: 68, weeklyUsage: 1.8, retentionImpact: 'High', paidConversion: '+44%' },
  { feature: 'Application Tracker', adoption: 52, weeklyUsage: 2.4, retentionImpact: 'High', paidConversion: '+22%' },
  { feature: 'Daily Digests', adoption: 78, weeklyUsage: 5.1, retentionImpact: 'Medium', paidConversion: '+12%' },
  { feature: 'Analytics Insights', adoption: 34, weeklyUsage: 1.1, retentionImpact: 'Medium', paidConversion: '+18%' },
  { feature: 'Saved Jobs', adoption: 81, weeklyUsage: 3.6, retentionImpact: 'Low', paidConversion: '+8%' },
];

// ── Sparkline helpers ────────────────────────────────────────────────────────
export const spark7 = (base, variance) =>
  Array.from({ length: 7 }, (_, i) => ({
    v: Math.max(0, Math.round(base + (Math.random() - 0.5) * variance * 2)),
  }));
