"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";

type SearchPayload = {
  reply: string;
  matches: {
    projects: Array<{ id: string; name: string; productArea: { id: string; name: string } }>;
    reports: Array<{ id: string; title: string; status: string; project: { id: string; name: string } }>;
    insights: Array<{ id: string; content: string; status: string; project: { id: string; name: string } }>;
    productAreas: Array<{ id: string; name: string }>;
    tags: Array<never>;
  };
};

const examplePrompts = [
  "Search for checkout insights across the repository",
  "Find reports related to onboarding friction",
  "Which projects mention support requests?",
  "What insights exist for pricing research?",
];

export default function Home() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/search/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmedQuery }),
      });

      const payload = (await response.json()) as { data?: SearchPayload; error?: string };

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not search the repository");
      }

      setResult(payload.data ?? null);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-8 py-10 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">
              Global Repository Assistant
            </p>
            <h1 className="text-5xl font-bold tracking-tight">Search Anything In The Repository</h1>
            <p className="max-w-3xl text-lg leading-8 text-slate-600">
              Use this assistant to search across projects, reports, insights, and the rest of the repository from
              one place. Ask direct questions, look for themes, or use it as a fast entry point into the records you
              need.
            </p>
          </div>

          <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-800">Assistant Instructions</h2>
            <p className="mt-3 text-sm leading-6 text-emerald-900">
              Search for anything in this repository using the chat assistant. It currently searches projects,
              reports, insights, and product areas. Tag search will appear after the taxonomy model is implemented.
            </p>
          </section>
        </header>

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              Ask the repository assistant
              <textarea
                required
                minLength={2}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-h-28 rounded-2xl border border-slate-300 px-4 py-3 text-base outline-none focus:border-emerald-500"
                placeholder="Search for checkout insights, related reports, and the projects they belong to."
              />
            </label>

            <div className="flex flex-wrap gap-2">
              {examplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => setQuery(prompt)}
                  className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
              >
                {isLoading ? "Searching..." : "Search Repository"}
              </button>
              <Link
                href="/insights"
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Open Insights
              </Link>
            </div>
          </form>
        </section>

        {error ? (
          <section className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </section>
        ) : null}

        {result ? (
          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Assistant Response</h2>
              <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-700">{result.reply}</p>
            </article>

            <div className="space-y-6">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">Projects</h3>
                {result.matches.projects.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No project matches.</p>
                ) : (
                  <ul className="mt-3 space-y-3 text-sm text-slate-700">
                    {result.matches.projects.map((project) => (
                      <li key={project.id}>
                        <Link href={`/projects/${project.id}`} className="font-medium text-slate-900 hover:text-emerald-700">
                          {project.name}
                        </Link>
                        <p className="text-xs text-slate-500">{project.productArea.name}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">Reports</h3>
                {result.matches.reports.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No report matches.</p>
                ) : (
                  <ul className="mt-3 space-y-3 text-sm text-slate-700">
                    {result.matches.reports.map((report) => (
                      <li key={report.id}>
                        <Link href={`/reports/${report.id}`} className="font-medium text-slate-900 hover:text-emerald-700">
                          {report.title}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {report.project.name} • {report.status}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">Insights</h3>
                {result.matches.insights.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">No insight matches.</p>
                ) : (
                  <ul className="mt-3 space-y-3 text-sm text-slate-700">
                    {result.matches.insights.map((insight) => (
                      <li key={insight.id}>
                        <p className="font-medium text-slate-900">{insight.content}</p>
                        <p className="text-xs text-slate-500">
                          {insight.project.name} • {insight.status}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">Tags</h3>
                <p className="mt-3 text-sm text-slate-500">
                  Tag search will appear after the taxonomy model is implemented.
                </p>
              </section>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
