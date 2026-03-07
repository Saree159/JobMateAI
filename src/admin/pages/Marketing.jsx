import React from 'react';
import ChartCard from '../components/ChartCard';
import KPICard from '../components/KPICard';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { DollarSign, Users, TrendingUp, Zap, Award } from 'lucide-react';

const GRID = { stroke: '#1e293b', strokeDasharray: '3 3' };
const AXIS = { tick: { fill: '#64748b', fontSize: 11 }, axisLine: false, tickLine: false };
const TT = {
  contentStyle: {
    background: '#0f172a',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    color: '#e2e8f0',
    fontSize: 12,
  },
};
const COLORS = {
  blue: '#3b82f6',
  green: '#22c55e',
  purple: '#a855f7',
  amber: '#f59e0b',
  pink: '#ec4899',
  gray: '#64748b',
};

const channelColorMap = {
  'LinkedIn Organic': '#3b82f6',
  'LinkedIn Paid': '#6366f1',
  'Instagram': '#ec4899',
  'SEO / Blog': '#22c55e',
  'Referrals': '#f59e0b',
  'Communities': '#a855f7',
};

const marketingChannels = [
  { channel: 'LinkedIn Organic', visitors: 28400, signups: 5120, activated: 3480, paid: 380, cac: 0, revenue: 5368, roi: '∞' },
  { channel: 'LinkedIn Paid', visitors: 14200, signups: 2840, activated: 1820, paid: 210, cac: 28.5, revenue: 2966, roi: '13.0x' },
  { channel: 'Instagram', visitors: 11800, signups: 1960, activated: 1180, paid: 124, cac: 24.2, revenue: 1751, roi: '15.3x' },
  { channel: 'SEO / Blog', visitors: 18600, signups: 3720, activated: 2480, paid: 280, cac: 0, revenue: 3953, roi: '∞' },
  { channel: 'Referrals', visitors: 8200, signups: 2460, activated: 1840, paid: 84, cac: 4.2, revenue: 1186, roi: '88.3x' },
  { channel: 'Communities', visitors: 6400, signups: 1920, activated: 1280, paid: 46, cac: 7.8, revenue: 650, roi: '47.6x' },
];

const signupsChartData = marketingChannels.map((c) => ({
  channel: c.channel.replace('LinkedIn ', 'LI ').replace('SEO / Blog', 'SEO'),
  signups: c.signups,
  fill: channelColorMap[c.channel] || COLORS.gray,
}));

const revenueChartData = marketingChannels.map((c) => ({
  name: c.channel,
  value: c.revenue,
  color: channelColorMap[c.channel] || COLORS.gray,
}));

const bestRoiChannel = 'Referrals';

export default function MarketingPage() {
  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Marketing</h1>
        <p className="text-gray-400 text-sm mt-1">Channel performance, CAC, and ROI analysis</p>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-sm text-amber-300">
        <strong>Note:</strong> Marketing attribution data (UTM tracking, channel signups, ROI) requires a UTM parameter logging system and analytics integration. The data shown below is illustrative. Connect your analytics platform to populate this with real numbers.
      </div>

      {/* Header placeholder to maintain structure */}
      <div className="hidden">
        <h1 className="text-2xl font-bold text-white">Marketing</h1>
        <p className="text-gray-400 text-sm mt-1">
          Channel performance, CAC, and ROI analysis
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard
          title="Total Ad Spend"
          value={4820}
          format="currency"
          change={3.2}
          icon={DollarSign}
          iconColor="text-pink-400"
          accent={COLORS.pink}
        />
        <KPICard
          title="CAC"
          value="18.50"
          suffix=""
          change={-2.1}
          icon={Users}
          iconColor="text-blue-400"
          accent={COLORS.blue}
          format="number"
        />
        <KPICard
          title="Overall Conversion"
          value={6.1}
          format="percent"
          change={0.5}
          icon={TrendingUp}
          iconColor="text-green-400"
          accent={COLORS.green}
        />
        <KPICard
          title="Best Channel ROI"
          value="88.3"
          suffix="x"
          change={12}
          icon={Award}
          iconColor="text-amber-400"
          accent={COLORS.amber}
        />
        <KPICard
          title="LTV:CAC Ratio"
          value="20.1"
          suffix="x"
          change={1.4}
          icon={Zap}
          iconColor="text-purple-400"
          accent={COLORS.purple}
        />
      </div>

      {/* Full-width Channel Table */}
      <ChartCard
        title="Marketing Channel Performance"
        subtitle="Full funnel breakdown from visitor to paid revenue"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 uppercase tracking-wider border-b border-white/5">
                <th className="text-left py-3 pr-4 font-medium">Channel</th>
                <th className="text-right py-3 px-3 font-medium">Visitors</th>
                <th className="text-right py-3 px-3 font-medium">Signups</th>
                <th className="text-right py-3 px-3 font-medium">Activated</th>
                <th className="text-right py-3 px-3 font-medium">Paid</th>
                <th className="text-right py-3 px-3 font-medium">CAC</th>
                <th className="text-right py-3 px-3 font-medium">Revenue</th>
                <th className="text-right py-3 pl-3 font-medium">ROI</th>
              </tr>
            </thead>
            <tbody>
              {marketingChannels.map((row, i) => {
                const signupRate = ((row.signups / row.visitors) * 100).toFixed(1);
                const activationRate = ((row.activated / row.signups) * 100).toFixed(1);
                const paidRate = ((row.paid / row.signups) * 100).toFixed(1);
                const isBest = row.channel === bestRoiChannel;

                return (
                  <tr
                    key={row.channel}
                    className={`border-b border-white/5 hover:bg-white/5 transition-colors ${
                      isBest
                        ? 'bg-amber-500/5 border-l-2 border-l-amber-500/40'
                        : i % 2 === 0
                        ? 'bg-white/[0.02]'
                        : ''
                    }`}
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: channelColorMap[row.channel] || COLORS.gray }}
                        />
                        <span className={`font-semibold ${isBest ? 'text-amber-400' : 'text-white'}`}>
                          {row.channel}
                        </span>
                        {isBest && (
                          <span className="text-xs px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded-md font-medium">
                            Best ROI
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right text-gray-300">
                      {row.visitors.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div>
                        <p className="text-blue-400 font-semibold">{row.signups.toLocaleString()}</p>
                        <p className="text-gray-600 text-xs">{signupRate}%</p>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div>
                        <p className="text-purple-400 font-semibold">{row.activated.toLocaleString()}</p>
                        <p className="text-gray-600 text-xs">{activationRate}%</p>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div>
                        <p className="text-green-400 font-semibold">{row.paid}</p>
                        <p className="text-gray-600 text-xs">{paidRate}%</p>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right text-gray-300">
                      {row.cac === 0 ? (
                        <span className="text-green-400 font-semibold">₪0</span>
                      ) : (
                        `₪${row.cac}`
                      )}
                    </td>
                    <td className="py-3 px-3 text-right text-white font-semibold">
                      ₪{row.revenue.toLocaleString()}
                    </td>
                    <td className="py-3 pl-3 text-right">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                          row.roi === '∞'
                            ? 'bg-green-500/20 text-green-400'
                            : parseFloat(row.roi) >= 40
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-blue-500/20 text-blue-400'
                        }`}
                      >
                        {row.roi}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Signups by Channel — Horizontal BarChart */}
        <ChartCard
          title="Signups by Channel"
          subtitle="Total signups attributed per source"
        >
          <div style={{ height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={signupsChartData} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid {...GRID} horizontal={false} />
                <XAxis
                  type="number"
                  {...AXIS}
                  tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                />
                <YAxis
                  type="category"
                  dataKey="channel"
                  width={80}
                  tick={{ fill: '#94a3b8', fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  {...TT}
                  formatter={(v) => [v.toLocaleString(), 'Signups']}
                />
                <Bar dataKey="signups" radius={[0, 4, 4, 0]}>
                  {signupsChartData.map((entry) => (
                    <Cell key={entry.channel} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        {/* Revenue by Channel — PieChart */}
        <ChartCard
          title="Revenue by Channel"
          subtitle="₪ revenue attributed per traffic source"
        >
          <div className="flex gap-4">
            <div style={{ height: 260, flex: '0 0 180px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={82}
                    dataKey="value"
                    labelLine={false}
                  >
                    {revenueChartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    {...TT}
                    formatter={(v, name) => [`₪${v.toLocaleString()}`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2 py-4">
              {revenueChartData.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: item.color }}
                    />
                    <span className="text-gray-400 truncate">
                      {item.name.replace('LinkedIn ', 'LI ').replace('SEO / Blog', 'SEO')}
                    </span>
                  </div>
                  <span className="text-white font-semibold ml-2">
                    ₪{item.value.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
