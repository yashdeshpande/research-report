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
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900 md:px-8">
      <div className="mx-auto flex min-h-[88vh] w-full max-w-6xl flex-col items-center justify-center">
        <section className="w-full max-w-5xl text-center">
          <header className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">Ask Once. Search Everything.</h1>
            <p className="text-base text-slate-600">Agentic search across projects, reports, and insights.</p>
          </header>
        </section>

        <section className="mx-auto w-full max-w-5xl mt-16">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <form onSubmit={handleSubmit} className="p-4 md:p-5">
              <label className="sr-only" htmlFor="agentic-search-input">
                Ask the assistant
              </label>
              <textarea
                id="agentic-search-input"
                required
                minLength={2}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-h-28 w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-base text-center outline-none focus:border-slate-500"
                placeholder="Search for related insights, their source reports, and linked projects"
              />

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                {examplePrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setQuery(prompt)}
                    className="rounded-md border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                <div className="text-xs text-slate-500">Projects • Reports • Insights • Product Areas</div>
                <div className="flex items-center justify-center gap-2">
                  <Link
                    href="/insights"
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Insights
                  </Link>
                  <button
                    type="submit"
                    disabled={isLoading || !query.trim()}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-60"
                  >
                    {isLoading ? "Searching..." : "Run Search"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>

        {error ? (
          <section className="mx-auto mt-4 w-full max-w-5xl rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm text-rose-800">
            {error}
          </section>
        ) : null}

        {result ? (
          <section className="mx-auto mt-6 w-full max-w-5xl space-y-4 pb-8 text-center">
            <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-600">Assistant Response</h2>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-slate-700">{result.reply}</p>
            </article>

            <section className="grid gap-4 md:grid-cols-3">
              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Projects</h3>
                {result.matches.projects.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">None</p>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm text-slate-700">
                    {result.matches.projects.slice(0, 4).map((project) => (
                      <li key={project.id}>
                        <Link href={`/projects/${project.id}`} className="font-medium text-slate-900 hover:text-slate-700">
                          {project.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Reports</h3>
                {result.matches.reports.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">None</p>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm text-slate-700">
                    {result.matches.reports.slice(0, 4).map((report) => (
                      <li key={report.id}>
                        <Link href={`/reports/${report.id}`} className="font-medium text-slate-900 hover:text-slate-700">
                          {report.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </article>

              <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Insights</h3>
                {result.matches.insights.length === 0 ? (
                  <p className="mt-3 text-sm text-slate-500">None</p>
                ) : (
                  <ul className="mt-2 space-y-2 text-sm text-slate-700">
                    {result.matches.insights.slice(0, 4).map((insight) => (
                      <li key={insight.id} className="line-clamp-2 text-left">
                        {insight.content}
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            </section>
          </section>
        ) : null}
      </div>
    </main>
  );
}
