"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Researcher = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
};

type IndexingStats = {
  reports: Partial<Record<string, number>>;
  researchPlans: Partial<Record<string, number>>;
  jobs: Partial<Record<string, number>>;
  totalChunks: number;
};

const INDEX_STATUSES = ["NOT_INDEXED", "QUEUED", "PROCESSING", "INDEXED", "FAILED"] as const;

const STATUS_STYLES: Record<string, string> = {
  NOT_INDEXED: "bg-slate-100 text-slate-600",
  QUEUED: "bg-amber-100 text-amber-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  INDEXED: "bg-emerald-100 text-emerald-700",
  FAILED: "bg-rose-100 text-rose-700",
};

function StatusPill({ label, count }: { label: string; count: number }) {
  if (count === 0) return null;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        STATUS_STYLES[label] ?? "bg-slate-100 text-slate-600"
      }`}
    >
      {label.replace("_", " ")}
      <span className="rounded-full bg-white/60 px-1.5 py-px font-bold">{count}</span>
    </span>
  );
}

export default function SettingsPage() {
  const [items, setItems] = useState<Researcher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [indexingStats, setIndexingStats] = useState<IndexingStats | null>(null);
  const [indexingStatsLoading, setIndexingStatsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBackfilling, setIsBackfilling] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) || item.email.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/researchers", { cache: "no-store" });
      const data = (await response.json()) as { data?: Researcher[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not load Researchers");
      }

      setItems(data.data ?? []);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadIndexingStats = useCallback(async () => {
    setIndexingStatsLoading(true);
    try {
      const res = await fetch("/api/indexing/process", { cache: "no-store" });
      const data = (await res.json()) as { data?: IndexingStats };
      setIndexingStats(data.data ?? null);
    } catch {
      // non-fatal
    } finally {
      setIndexingStatsLoading(false);
    }
  }, []);

  async function handleRunBackfill() {
    setIsBackfilling(true);
    try {
      await fetch("/api/indexing/backfill", { method: "POST" });
      await loadIndexingStats();
    } finally {
      setIsBackfilling(false);
    }
  }

  async function handleProcessJobs() {
    setIsProcessing(true);
    try {
      await fetch("/api/indexing/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit: 20 }),
      });
      await loadIndexingStats();
    } finally {
      setIsProcessing(false);
    }
  }

  useEffect(() => {
    loadData();
    loadIndexingStats();
  }, [loadData, loadIndexingStats]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/researchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          avatarUrl: avatarUrl.trim() ? avatarUrl.trim() : null,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not create Researcher");
      }

      setName("");
      setEmail("");
      setPassword("");
      setAvatarUrl("");
      setSuccessMessage("Researcher created.");
      await loadData();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unknown error";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="min-h-screen px-8 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Settings</h1>
          <p className="mt-2 text-slate-600">Manage workspace configuration and team members.</p>
        </div>

        {/* Alerts */}
        {error ? (
          <section className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </section>
        ) : null}

        {successMessage ? (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {successMessage}
          </section>
        ) : null}

        {/* Vector Indexing section */}
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Vector Embedding</h2>
          <p className="mt-1 text-sm text-slate-500">
            Track indexing progress for reports and research plans used by the search assistant.
          </p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
          {indexingStatsLoading ? (
            <div className="px-6 py-8 text-center text-sm text-slate-500">Loading indexing stats...</div>
          ) : indexingStats ? (
            <div className="divide-y divide-slate-100">
              {/* Summary row */}
              <div className="grid grid-cols-3 gap-6 px-6 py-5">
                <div className="text-center">
                  <p className="text-2xl font-bold text-slate-900">{indexingStats.totalChunks}</p>
                  <p className="mt-0.5 text-xs text-slate-500">Total chunks indexed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-emerald-600">
                    {(indexingStats.reports["INDEXED"] ?? 0) + (indexingStats.researchPlans["INDEXED"] ?? 0)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">Sources indexed</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-rose-600">
                    {(indexingStats.reports["FAILED"] ?? 0) + (indexingStats.researchPlans["FAILED"] ?? 0)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">Sources failed</p>
                </div>
              </div>

              {/* Reports breakdown */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">Reports</p>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {INDEX_STATUSES.map((s) => (
                      <StatusPill key={s} label={s} count={indexingStats.reports[s] ?? 0} />
                    ))}
                    {INDEX_STATUSES.every((s) => (indexingStats.reports[s] ?? 0) === 0) && (
                      <span className="text-xs text-slate-400">No reports</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Research plans breakdown */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">Research Plans</p>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {INDEX_STATUSES.map((s) => (
                      <StatusPill key={s} label={s} count={indexingStats.researchPlans[s] ?? 0} />
                    ))}
                    {INDEX_STATUSES.every((s) => (indexingStats.researchPlans[s] ?? 0) === 0) && (
                      <span className="text-xs text-slate-400">No research plans</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Job queue breakdown */}
              <div className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">Job queue</p>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {["QUEUED", "PROCESSING", "INDEXED", "FAILED"].map((s) => (
                      <StatusPill key={s} label={s} count={indexingStats.jobs[s] ?? 0} />
                    ))}
                    {["QUEUED", "PROCESSING", "INDEXED", "FAILED"].every(
                      (s) => (indexingStats.jobs[s] ?? 0) === 0,
                    ) && <span className="text-xs text-slate-400">No jobs</span>}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 px-6 py-4">
                <button
                  type="button"
                  onClick={() => loadIndexingStats()}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Refresh
                </button>
                <button
                  type="button"
                  onClick={handleRunBackfill}
                  disabled={isBackfilling}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  {isBackfilling ? "Enqueueing..." : "Enqueue unindexed"}
                </button>
                <button
                  type="button"
                  onClick={handleProcessJobs}
                  disabled={isProcessing}
                  className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                >
                  {isProcessing ? "Processing..." : "Process jobs"}
                </button>
              </div>
            </div>
          ) : (
            <div className="px-6 py-8 text-center text-sm text-slate-500">Could not load indexing stats.</div>
          )}
        </div>

        {/* Researchers section */}
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Researchers</h2>
          <p className="mt-1 text-sm text-slate-500">
            Team members who create and collaborate on research.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Create Form */}
          <section className="lg:col-span-1">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Add Researcher</h3>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold uppercase text-slate-600">Name</span>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="Alex Rivera"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase text-slate-600">Email</span>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="alex@company.com"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase text-slate-600">Password</span>
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="Min 8 chars"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase text-slate-600">Avatar URL</span>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(event) => setAvatarUrl(event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="https://example.com/avatar.png"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {isSaving ? "Creating..." : "Add Researcher"}
                </button>
              </form>
            </div>
          </section>

          {/* List */}
          <section className="lg:col-span-2">
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <p className="mt-2 text-xs text-slate-500">
                  {filteredItems.length} of {items.length} researchers
                </p>
              </div>

              {isLoading ? (
                <div className="px-6 py-8 text-center text-sm text-slate-500">Loading...</div>
              ) : filteredItems.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-slate-500">
                  {items.length === 0
                    ? "No researchers yet."
                    : "No researchers match your search."}
                </div>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {filteredItems.map((item) => (
                    <li key={item.id} className="px-6 py-4 transition-colors hover:bg-slate-50">
                      <h3 className="font-semibold text-slate-900">{item.name}</h3>
                      <p className="mt-1 text-sm text-slate-600">{item.email}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
