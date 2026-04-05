import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Clock, CheckCircle2, Sparkles } from "lucide-react";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

function fetchWaitlist() {
  const token = localStorage.getItem("hirematex_auth_token");
  return fetch(`${API_BASE}/api/admin/waitlist`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => {
    if (!r.ok) throw new Error("Failed to load waitlist");
    return r.json();
  });
}

const FEATURES = [
  { key: "cover_letter",        label: "Cover Letter" },
  { key: "interview_questions", label: "Interview Prep" },
  { key: "salary_estimate",     label: "Salary" },
  { key: "resume_gaps",         label: "Gap Analysis" },
  { key: "resume_rewrite",      label: "CV Rewrite" },
];

export default function AdminWaitlist() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-waitlist"],
    queryFn: fetchWaitlist,
    staleTime: 30_000,
  });

  const entries = data?.entries || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Sparkles className="w-7 h-7 text-blue-500" />
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Pro Waitlist</h1>
          <p className="text-sm text-gray-400">Users who requested early Pro access</p>
        </div>
        {data && (
          <Badge className="ml-auto bg-blue-600 text-white text-base px-4 py-1">
            {data.total} total
          </Badge>
        )}
      </div>

      {isLoading && (
        <div className="text-gray-400 text-center py-16">Loading…</div>
      )}
      {error && (
        <div className="text-red-400 text-center py-16">{error.message}</div>
      )}

      {!isLoading && entries.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center text-gray-400">
            No waitlist entries yet.
          </CardContent>
        </Card>
      )}

      {entries.length > 0 && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400 text-left">
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Joined</th>
                    <th className="px-4 py-3">Account</th>
                    <th className="px-4 py-3">Tier</th>
                    <th className="px-4 py-3 text-center" colSpan={FEATURES.length}>
                      Today's Usage
                    </th>
                  </tr>
                  <tr className="border-b border-gray-700 text-gray-500 text-xs text-left">
                    <th /><th /><th /><th /><th /><th />
                    {FEATURES.map((f) => (
                      <th key={f.key} className="px-2 py-1 text-center font-normal">
                        {f.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {entries.map((e, i) => (
                    <tr
                      key={e.id}
                      className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors"
                    >
                      <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                      <td className="px-4 py-3 font-medium text-gray-100">
                        {e.full_name || <span className="text-gray-500 italic">—</span>}
                      </td>
                      <td className="px-4 py-3 text-blue-400">{e.email}</td>
                      <td className="px-4 py-3 text-gray-400">
                        {new Date(e.joined_at).toLocaleDateString("en-GB", {
                          timeZone: "Asia/Jerusalem",
                          day: "2-digit", month: "short", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        {e.has_account ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {e.tier ? (
                          <Badge className={e.tier === "pro" ? "bg-blue-600" : "bg-gray-600"}>
                            {e.tier}
                          </Badge>
                        ) : (
                          <span className="text-gray-600">—</span>
                        )}
                      </td>
                      {FEATURES.map((f) => {
                        const count = e.usage_today?.[f.key] ?? 0;
                        return (
                          <td key={f.key} className="px-2 py-3 text-center">
                            {count > 0 ? (
                              <span className={`font-semibold ${count >= 5 ? "text-red-400" : "text-amber-400"}`}>
                                {count}/5
                              </span>
                            ) : (
                              <span className="text-gray-600">0</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
