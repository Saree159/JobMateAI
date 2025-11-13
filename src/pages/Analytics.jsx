import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Target, Clock, Award, Briefcase } from "lucide-react";
import jobMateAPI from "@/api/jobmate";

export default function AnalyticsDashboard() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ["analytics", "dashboard"],
    queryFn: async () => {
      const response = await jobMateAPI.get("/api/analytics/dashboard");
      return response.data;
    },
  });

  const { data: insights } = useQuery({
    queryKey: ["analytics", "insights"],
    queryFn: async () => {
      const response = await jobMateAPI.get("/api/analytics/insights");
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!analytics) return null;

  const { stats, monthly_trends, match_score_distribution, top_companies, status_funnel } = analytics;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
        <p className="text-muted-foreground">
          Track your job search progress and get actionable insights
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_applications}</div>
            <p className="text-xs text-muted-foreground">
              Across all stages
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.success_rate}%</div>
            <p className="text-xs text-muted-foreground">
              Offers received
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Match Score</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avg_match_score ? `${stats.avg_match_score}%` : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              Job compatibility
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Time to Interview</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.avg_time_to_interview ? `${stats.avg_time_to_interview}d` : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              From application
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Application Status Breakdown</CardTitle>
            <CardDescription>Distribution across pipeline stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.by_status).map(([status, count]) => {
                const percentage = (count / stats.total_applications) * 100;
                const statusColors = {
                  saved: "bg-gray-500",
                  applied: "bg-blue-500",
                  interview: "bg-purple-500",
                  offer: "bg-green-500",
                  rejected: "bg-red-500",
                };
                
                return (
                  <div key={status} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize font-medium">{status}</span>
                      <span className="text-muted-foreground">
                        {count} ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${statusColors[status]}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Conversion Funnel</CardTitle>
            <CardDescription>Success rates between stages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Saved → Applied</span>
                <span className="text-2xl font-bold text-blue-600">
                  {status_funnel.saved_to_applied_rate}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Applied → Interview</span>
                <span className="text-2xl font-bold text-purple-600">
                  {status_funnel.applied_to_interview_rate}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Interview → Offer</span>
                <span className="text-2xl font-bold text-green-600">
                  {status_funnel.interview_to_offer_rate}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monthly Trends */}
      <Card>
        <CardHeader>
          <CardTitle>Monthly Trends</CardTitle>
          <CardDescription>Application activity over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {monthly_trends.length === 0 ? (
              <p className="text-sm text-muted-foreground">No data available yet</p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {monthly_trends.map((trend) => (
                  <div key={trend.month} className="border-b pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">
                        {new Date(trend.month + "-01").toLocaleDateString("en-US", {
                          month: "long",
                          year: "numeric",
                        })}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {trend.applications} applications
                      </span>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <span className="text-purple-600">
                        {trend.interviews} interviews
                      </span>
                      <span className="text-green-600">
                        {trend.offers} offers
                      </span>
                      <span className="text-red-600">
                        {trend.rejections} rejections
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Match Score Distribution */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Match Score Distribution</CardTitle>
            <CardDescription>Quality of job matches</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(match_score_distribution).map(([range, count]) => {
                const totalScored = Object.values(match_score_distribution).reduce(
                  (sum, val) => sum + val,
                  0
                );
                const percentage = totalScored > 0 ? (count / totalScored) * 100 : 0;
                
                return (
                  <div key={range} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{range}%</span>
                      <span className="text-muted-foreground">{count} jobs</span>
                    </div>
                    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Companies</CardTitle>
            <CardDescription>Most applications sent to</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {top_companies.length === 0 ? (
                <p className="text-sm text-muted-foreground">No data available yet</p>
              ) : (
                top_companies.map((item, index) => (
                  <div key={item.company} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="font-medium">{item.company}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {item.count} {item.count === 1 ? "application" : "applications"}
                    </span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights & Recommendations */}
      {insights && (
        <Card>
          <CardHeader>
            <CardTitle>AI-Powered Insights</CardTitle>
            <CardDescription>Personalized recommendations for your job search</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.insights.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    Insights
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {insights.insights.map((insight, i) => (
                      <li key={i} className="text-muted-foreground">• {insight}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {insights.recommendations.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Target className="h-4 w-4 text-green-600" />
                    Recommendations
                  </h4>
                  <ul className="space-y-1 text-sm">
                    {insights.recommendations.map((rec, i) => (
                      <li key={i} className="text-muted-foreground">• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
