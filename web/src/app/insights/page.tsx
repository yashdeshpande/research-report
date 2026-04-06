"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type InsightStatus = "PENDING_REVIEW" | "APPROVED" | "REVISED" | "REJECTED";

type Insight = {
  id: string;
  content: string;
  status: InsightStatus;
  createdAt: string;
  editorNotes: string | null;
  project: {
    id: string;
    name: string;
  };
  generatedFromReport: {
    id: string;
    title: string;
  };
  reviewedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
};

function getStatusClasses(status: InsightStatus) {
  if (status === "APPROVED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (status === "REVISED") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (status === "REJECTED") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  return "border-slate-200 bg-slate-50 text-slate-700";
}

export default function InsightsPage() {
  const [items, setItems] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [reportFilter, setReportFilter] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearchQuery(params.get("query") ?? "");
    setStatusFilter(params.get("status") ?? "");
    setProjectFilter(params.get("projectId") ?? "");
    setReportFilter(params.get("reportId") ?? "");
  }, []);

  useEffect(() => {
    async function loadInsights() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();

        if (searchQuery.trim()) {
          params.set("query", searchQuery.trim());
        }

        if (statusFilter) {
          params.set("status", statusFilter);
        }

        if (projectFilter) {
          params.set("projectId", projectFilter);
        }

        if (reportFilter) {
          params.set("reportId", reportFilter);
        }

        const response = await fetch(`/api/insights?${params.toString()}`, { cache: "no-store" });
        const payload = (await response.json()) as { data?: Insight[]; error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Could not load insights");
        }

        setItems(payload.data ?? []);
      } catch (requestError) {
        const message = requestError instanceof Error ? requestError.message : "Unknown error";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    void loadInsights();
  }, [projectFilter, reportFilter, searchQuery, statusFilter]);

  const groupedItems = useMemo(() => {
    return items.reduce<Record<string, Insight[]>>((groups, item) => {
      const key = item.status;
      groups[key] = groups[key] ? [...groups[key], item] : [item];
      return groups;
    }, {});
  }, [items]);

  return (
    <main className="min-h-screen bg-slate-50 px-8 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">
              Repository Insights
            </p>
            <h1 className="text-4xl font-bold tracking-tight">Insights</h1>
            <p className="mt-2 max-w-3xl text-slate-600">
              Browse insights independently of projects. Filter by content and status, then jump back to the
              originating report or project when you need more context.
            </p>
          </div>
          <Link
            href="/reports"
            className="w-fit rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Open Reports
          </Link>
        </header>

        {error ? (
          <section className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </section>
        ) : null}

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Search insight content
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search findings, themes, quotes, or report language..."
                className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-700">
              Status
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500"
              >
                <option value="">All statuses</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="APPROVED">Approved</option>
                <option value="REVISED">Revised</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </label>
          </div>

          {projectFilter || reportFilter ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {projectFilter ? (
                <button
                  type="button"
                  onClick={() => setProjectFilter("")}
                  className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Clear project filter
                </button>
              ) : null}
              {reportFilter ? (
                <button
                  type="button"
                  onClick={() => setReportFilter("")}
                  className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Clear report filter
                </button>
              ) : null}
            </div>
          ) : null}
        </section>

        {isLoading ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-600">
            Loading insights...
          </section>
        ) : items.length === 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-600">
            No insights match the current filters.
          </section>
        ) : (
          <section className="grid gap-6 xl:grid-cols-4">
            {(["PENDING_REVIEW", "APPROVED", "REVISED", "REJECTED"] as InsightStatus[]).map((status) => {
              const statusItems = groupedItems[status] ?? [];

              return (
                <div key={status} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
                    <h2 className="text-sm font-semibold text-slate-900">{status.replaceAll("_", " ")}</h2>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {statusItems.length}
                    </span>
                  </div>

                  {statusItems.length === 0 ? (
                    <p className="pt-4 text-sm text-slate-500">No insights in this column.</p>
                  ) : (
                    <ul className="space-y-3 pt-4">
                      {statusItems.map((insight) => (
                        <li key={insight.id} className="rounded-xl border border-slate-200 p-4">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getStatusClasses(
                              insight.status,
                            )}`}
                          >
                            {insight.status.replaceAll("_", " ")}
                          </span>
                          <p className="mt-3 whitespace-pre-wrap text-sm text-slate-800">{insight.content}</p>
                          <p className="mt-3 text-xs text-slate-500">
                            Project: {insight.project.name}
                          </p>
                          <p className="text-xs text-slate-500">Report: {insight.generatedFromReport.title}</p>
                          <p className="text-xs text-slate-500">
                            Created {new Date(insight.createdAt).toLocaleString()}
                          </p>
                          {insight.reviewedBy ? (
                            <p className="mt-2 text-xs text-slate-500">
                              Reviewed by {insight.reviewedBy.name}
                            </p>
                          ) : null}
                          <div className="mt-4 flex flex-wrap gap-2">
                            <Link
                              href={`/projects/${insight.project.id}`}
                              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Project
                            </Link>
                            <Link
                              href={`/reports/${insight.generatedFromReport.id}`}
                              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Report
                            </Link>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}