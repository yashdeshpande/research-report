"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

type ProductAreaOption = {
  id: string;
  name: string;
};

type ReportOption = {
  id: string;
  title: string;
  project: {
    id: string;
    name: string;
  };
};

type ResearcherOption = {
  id: string;
  name: string;
  email: string;
};

type InsightStatus = "PENDING_REVIEW" | "APPROVED" | "REVISED" | "REJECTED";

type ProjectInsight = {
  id: string;
  content: string;
  status: InsightStatus;
  reviewedAt: string | null;
  editorNotes: string | null;
  createdAt: string;
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

type ProjectChatMessage = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  createdAt: string;
  researcher: {
    id: string;
    name: string;
    email: string;
  };
};

type ProjectDetails = {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  productAreaId: string;
  researchPlan?: {
    id: string;
    updatedAt: string;
    lastEditedBy?: {
      id: string;
      name: string;
      email: string;
    };
  } | null;
  _count?: {
    reports: number;
    insights: number;
    documentChunks: number;
    chatMessages: number;
  };
};

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [item, setItem] = useState<ProjectDetails | null>(null);
  const [productAreas, setProductAreas] = useState<ProductAreaOption[]>([]);
  const [reports, setReports] = useState<ReportOption[]>([]);
  const [researchers, setResearchers] = useState<ResearcherOption[]>([]);
  const [insights, setInsights] = useState<ProjectInsight[]>([]);
  const [chatMessages, setChatMessages] = useState<ProjectChatMessage[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [productAreaId, setProductAreaId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreatingInsight, setIsCreatingInsight] = useState(false);
  const [reviewingInsightId, setReviewingInsightId] = useState<string | null>(null);
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [insightContent, setInsightContent] = useState("");
  const [insightReportId, setInsightReportId] = useState("");
  const [reviewedById, setReviewedById] = useState("");
  const [notesByInsightId, setNotesByInsightId] = useState<Record<string, string>>({});
  const [chatInput, setChatInput] = useState("");

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [projectResponse, areasResponse, insightsResponse, reportsResponse, researchersResponse, chatResponse] =
        await Promise.all([
        fetch(`/api/projects/${id}`, { cache: "no-store" }),
        fetch("/api/product-areas", { cache: "no-store" }),
        fetch(`/api/projects/${id}/insights`, { cache: "no-store" }),
        fetch("/api/reports", { cache: "no-store" }),
        fetch("/api/researchers", { cache: "no-store" }),
        fetch(`/api/projects/${id}/chat`, { cache: "no-store" }),
      ]);

      const projectData = (await projectResponse.json()) as { data?: ProjectDetails; error?: string };
      const areasData = (await areasResponse.json()) as {
        data?: ProductAreaOption[];
        error?: string;
      };
      const insightsData = (await insightsResponse.json()) as {
        data?: ProjectInsight[];
        error?: string;
      };
      const reportsData = (await reportsResponse.json()) as {
        data?: ReportOption[];
        error?: string;
      };
      const researchersData = (await researchersResponse.json()) as {
        data?: ResearcherOption[];
        error?: string;
      };
      const chatData = (await chatResponse.json()) as {
        data?: ProjectChatMessage[];
        error?: string;
      };

      if (!projectResponse.ok) {
        throw new Error(projectData.error ?? "Could not load Project");
      }

      if (!areasResponse.ok) {
        throw new Error(areasData.error ?? "Could not load Product Areas");
      }

      if (!insightsResponse.ok) {
        throw new Error(insightsData.error ?? "Could not load Insights");
      }

      if (!reportsResponse.ok) {
        throw new Error(reportsData.error ?? "Could not load Reports");
      }

      if (!researchersResponse.ok) {
        throw new Error(researchersData.error ?? "Could not load Researchers");
      }

      if (!chatResponse.ok) {
        throw new Error(chatData.error ?? "Could not load Chat Messages");
      }

      const loaded = projectData.data;

      if (!loaded) {
        throw new Error("Project not found");
      }

      setItem(loaded);
      setProductAreas(areasData.data ?? []);

      const projectReports = (reportsData.data ?? []).filter((report) => report.project.id === id);
      setReports(projectReports);
      setInsights(insightsData.data ?? []);
      setResearchers(researchersData.data ?? []);
      setChatMessages(chatData.data ?? []);

      setName(loaded.name);
      setDescription(loaded.description ?? "");
      setProductAreaId(loaded.productAreaId);
      setStartDate(loaded.startDate ? loaded.startDate.slice(0, 10) : "");
      setEndDate(loaded.endDate ? loaded.endDate.slice(0, 10) : "");

      if (projectReports.length > 0) {
        setInsightReportId((current) => current || projectReports[0].id);
      }

      if ((researchersData.data ?? []).length > 0) {
        setReviewedById((current) => current || (researchersData.data ?? [])[0].id);
      }
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id, loadData]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
          productAreaId,
          startDate: startDate || null,
          endDate: endDate || null,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not update Project");
      }

      await loadData();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unknown error";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this Project? This cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not delete Project");
      }

      router.push("/projects");
      router.refresh();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unknown error";
      setError(message);
    } finally {
      setIsDeleting(false);
    }
  }

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

  async function handleCreateInsight(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsCreatingInsight(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${id}/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: insightContent.trim(),
          generatedFromReportId: insightReportId,
        }),
      });

      const data = (await response.json()) as { data?: ProjectInsight; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not create Insight");
      }

      if (data.data) {
        setInsights((current) => [data.data as ProjectInsight, ...current]);
      }

      setInsightContent("");
      await loadData();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unknown error";
      setError(message);
    } finally {
      setIsCreatingInsight(false);
    }
  }

  async function handleReviewInsight(insightId: string, status: Exclude<InsightStatus, "PENDING_REVIEW">) {
    setReviewingInsightId(insightId);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${id}/insights/${insightId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reviewedById,
          editorNotes: (notesByInsightId[insightId] ?? "").trim() || null,
        }),
      });

      const data = (await response.json()) as { data?: ProjectInsight; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not update Insight");
      }

      if (data.data) {
        setInsights((current) =>
          current.map((insight) => (insight.id === insightId ? (data.data as ProjectInsight) : insight))
        );
      }
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unknown error";
      setError(message);
    } finally {
      setReviewingInsightId(null);
    }
  }

  async function handleSendChat(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedMessage = chatInput.trim();
    if (!trimmedMessage) {
      return;
    }

    if (!reviewedById) {
      setError("Select a researcher before sending chat messages.");
      return;
    }

    setIsSendingChat(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${id}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          researcherId: reviewedById,
          message: trimmedMessage,
        }),
      });

      const data = (await response.json()) as {
        data?: {
          userMessage: ProjectChatMessage;
          reply: ProjectChatMessage;
        };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not send message");
      }

      const payload = data.data;
      if (payload) {
        setChatMessages((current) => [...current, payload.userMessage, payload.reply]);
      }

      setChatInput("");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unknown error";
      setError(message);
    } finally {
      setIsSendingChat(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Project Details</h1>
          <Link
            href="/projects"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            Back
          </Link>
        </header>

        {error ? (
          <section className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </section>
        ) : null}

        {isLoading ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">Loading Project...</p>
          </section>
        ) : item ? (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Edit</h2>
              <form onSubmit={handleSave} className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  Name
                  <input
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  Product Area
                  <select
                    value={productAreaId}
                    onChange={(event) => setProductAreaId(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
                  >
                    {productAreas.map((area) => (
                      <option key={area.id} value={area.id}>
                        {area.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  Start Date
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  End Date
                  <input
                    type="date"
                    value={endDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
                  />
                </label>

                <label className="md:col-span-2 flex flex-col gap-1 text-sm text-slate-700">
                  Description
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="min-h-24 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
                  />
                </label>

                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-700">
              <h2 className="text-lg font-semibold">Dependencies</h2>
              <p className="mt-2">Reports: {item._count?.reports ?? 0}</p>
              <p>Insights: {item._count?.insights ?? 0}</p>
              <p>Document Chunks: {item._count?.documentChunks ?? 0}</p>
              <p>Chat Messages: {item._count?.chatMessages ?? 0}</p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-700">
              <h2 className="text-lg font-semibold">Research Plan</h2>
              <p className="mt-2">
                {item.researchPlan?.lastEditedBy
                  ? `Last edited by ${item.researchPlan.lastEditedBy.name} (${item.researchPlan.lastEditedBy.email})`
                  : "No edits yet"}
              </p>
              <p>
                Last Updated:{" "}
                {item.researchPlan?.updatedAt
                  ? new Date(item.researchPlan.updatedAt).toLocaleString()
                  : "Not saved yet"}
              </p>
              <Link
                href={`/projects/${id}/research-plan`}
                className="mt-4 inline-block rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Open Research Plan
              </Link>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-700">
              <h2 className="text-lg font-semibold">Insights Review</h2>
              <p className="mt-2 text-slate-600">
                Capture draft insights from reports and run approval decisions with reviewer notes.
              </p>

              <form onSubmit={handleCreateInsight} className="mt-4 space-y-3 rounded-lg border border-slate-200 p-4">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Source Report</span>
                  <select
                    required
                    value={insightReportId}
                    onChange={(event) => setInsightReportId(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
                  >
                    {reports.length === 0 ? <option value="">No reports available</option> : null}
                    {reports.map((report) => (
                      <option key={report.id} value={report.id}>
                        {report.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Draft Insight</span>
                  <textarea
                    required
                    minLength={10}
                    value={insightContent}
                    onChange={(event) => setInsightContent(event.target.value)}
                    className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
                    placeholder="Users abandon checkout when recovery options are not visible after a decline."
                  />
                </label>

                <button
                  type="submit"
                  disabled={isCreatingInsight || !insightReportId || !insightContent.trim()}
                  className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60"
                >
                  {isCreatingInsight ? "Creating..." : "Add Draft Insight"}
                </button>
              </form>

              <label className="mt-4 flex max-w-md flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Reviewer</span>
                <select
                  required
                  value={reviewedById}
                  onChange={(event) => setReviewedById(event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
                >
                  {researchers.length === 0 ? <option value="">No researchers available</option> : null}
                  {researchers.map((researcher) => (
                    <option key={researcher.id} value={researcher.id}>
                      {researcher.name} ({researcher.email})
                    </option>
                  ))}
                </select>
              </label>

              {insights.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600">No insights yet.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {insights.map((insight) => (
                    <li key={insight.id} className="rounded-lg border border-slate-200 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="text-sm font-medium text-slate-900">{insight.generatedFromReport.title}</p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getStatusClasses(
                            insight.status
                          )}`}
                        >
                          {insight.status.replace("_", " ")}
                        </span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{insight.content}</p>
                      <p className="mt-2 text-xs text-slate-500">
                        Created {new Date(insight.createdAt).toLocaleString()}
                        {insight.reviewedBy
                          ? ` • Reviewed by ${insight.reviewedBy.name} on ${insight.reviewedAt ? new Date(insight.reviewedAt).toLocaleString() : "-"}`
                          : ""}
                      </p>

                      <label className="mt-3 flex flex-col gap-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Editor Notes</span>
                        <textarea
                          value={notesByInsightId[insight.id] ?? insight.editorNotes ?? ""}
                          onChange={(event) =>
                            setNotesByInsightId((current) => ({
                              ...current,
                              [insight.id]: event.target.value,
                            }))
                          }
                          className="min-h-16 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
                          placeholder="Reasoning for this decision..."
                        />
                      </label>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={reviewingInsightId === insight.id || !reviewedById}
                          onClick={() => handleReviewInsight(insight.id, "APPROVED")}
                          className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          disabled={reviewingInsightId === insight.id || !reviewedById}
                          onClick={() => handleReviewInsight(insight.id, "REVISED")}
                          className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:opacity-60"
                        >
                          Needs Revision
                        </button>
                        <button
                          type="button"
                          disabled={reviewingInsightId === insight.id || !reviewedById}
                          onClick={() => handleReviewInsight(insight.id, "REJECTED")}
                          className="rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-100 disabled:opacity-60"
                        >
                          Reject
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm text-sm text-slate-700">
              <h2 className="text-lg font-semibold">Project Chat Assistant</h2>
              <p className="mt-2 text-slate-600">
                Ask questions scoped to this project. Responses prioritize approved insights, then revised and pending drafts.
              </p>

              <div className="mt-4 max-h-80 space-y-3 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 p-3">
                {chatMessages.length === 0 ? (
                  <p className="text-sm text-slate-600">No chat messages yet.</p>
                ) : (
                  chatMessages.map((message) => (
                    <article
                      key={message.id}
                      className={`rounded-lg px-3 py-2 ${
                        message.role === "USER"
                          ? "ml-8 border border-indigo-200 bg-indigo-50"
                          : "mr-8 border border-slate-200 bg-white"
                      }`}
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {message.role === "USER" ? "You" : "Assistant"} • {new Date(message.createdAt).toLocaleString()}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{message.content}</p>
                    </article>
                  ))
                )}
              </div>

              <form onSubmit={handleSendChat} className="mt-4 space-y-3">
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">Question</span>
                  <textarea
                    required
                    minLength={2}
                    value={chatInput}
                    onChange={(event) => setChatInput(event.target.value)}
                    className="min-h-20 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
                    placeholder="Summarize the strongest approved findings for this project and call out remaining risks."
                  />
                </label>
                <button
                  type="submit"
                  disabled={isSendingChat || !chatInput.trim() || !reviewedById}
                  className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60"
                >
                  {isSendingChat ? "Asking..." : "Ask Assistant"}
                </button>
              </form>
            </section>

            <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-rose-900">Danger Zone</h2>
              <p className="mt-2 text-sm text-rose-800">
                Deletion is blocked while linked research data still exists.
              </p>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="mt-4 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Delete Project"}
              </button>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
