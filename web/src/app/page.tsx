export default function Home() {
  return (
    <div className="flex min-h-screen flex-col px-8 py-12 text-slate-900">
      <div className="mx-auto w-full max-w-5xl space-y-10">
        <header className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Welcome to Research Repository
          </p>
          <h1 className="text-4xl font-bold tracking-tight">
            Phase 4: Insight Review Workflow
          </h1>
          <p className="max-w-3xl text-lg leading-7 text-slate-600">
            Manage researchers, organize by product areas, create projects with timelines, upload
            reports, build rich research plans with collaborative editing, and review project
            insights with explicit approval decisions.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-2">
          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold text-slate-900">📊 Getting Started</h2>
            <ol className="mt-4 space-y-2 text-sm text-slate-600">
              <li>1. Create researchers using the left sidebar</li>
              <li>2. Organize by creating Product Areas</li>
              <li>3. Create Projects with start/end dates</li>
              <li>4. Upload Reports to projects</li>
              <li>5. Build Research Plans collaboratively</li>
              <li>6. Review Insights with approval states</li>
            </ol>
          </article>

          <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold text-slate-900">🎯 Key Features</h2>
            <ul className="mt-4 space-y-2 text-sm text-slate-600">
              <li>✓ Multi-researcher collaboration</li>
              <li>✓ Project timeline planning</li>
              <li>✓ Rich-text research plans</li>
              <li>✓ Edit tracking & audit trail</li>
              <li>✓ Insight approval workflow</li>
              <li>✓ Safe entity deletion with guardrails</li>
            </ul>
          </article>
        </section>

        <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-6">
          <h2 className="font-semibold text-emerald-900">💡 Quick Tips</h2>
          <p className="mt-2 text-sm text-emerald-800">
            Use the navigation panel on the left to browse entities. Click any row to edit or view details.
            Reports are grouped within Projects to keep your research organized by scope.
          </p>
        </section>
      </div>
    </div>
  );
}
