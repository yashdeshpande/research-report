"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { RichTextEditor } from "@/lib/components/RichTextEditor";

type JSONValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JSONValue }
  | JSONValue[];

type ResearchPlan = {
  id: string;
  projectId: string;
  content: Record<string, JSONValue>;
  updatedAt: string;
  lastEditedBy: {
    id: string;
    name: string;
    email: string;
  };
};

type Project = {
  id: string;
  name: string;
};

type ResearcherOption = {
  id: string;
  name: string;
  email: string;
};

type ResearchPlanRevision = {
  id: string;
  content: Record<string, JSONValue>;
  createdAt: string;
  editedBy: {
    id: string;
    name: string;
    email: string;
  };
};

const EMPTY_DOC: Record<string, JSONValue> = {
  type: "doc",
  content: [{ type: "paragraph" }],
};

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not saved yet";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Not saved yet";
  }

  return date.toLocaleString();
}

export default function ProjectResearchPlanPage() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [plan, setPlan] = useState<ResearchPlan | null>(null);
  const [history, setHistory] = useState<ResearchPlanRevision[]>([]);
  const [researchers, setResearchers] = useState<ResearcherOption[]>([]);
  const [content, setContent] = useState<Record<string, JSONValue>>(EMPTY_DOC);

  const [researcherId, setResearcherId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const lastEditedSummary = useMemo(() => {
    if (!plan?.lastEditedBy) {
      return "No edits yet";
    }

    return `Last edited by ${plan.lastEditedBy.name} (${plan.lastEditedBy.email}) on ${formatTimestamp(plan.updatedAt)}`;
  }, [plan]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [projectResponse, planResponse, historyResponse, researchersResponse] = await Promise.all([
        fetch(`/api/projects/${projectId}`, { cache: "no-store" }),
        fetch(`/api/research-plans/${projectId}`, { cache: "no-store" }),
        fetch(`/api/research-plans/${projectId}/history?limit=15`, { cache: "no-store" }),
        fetch("/api/researchers", { cache: "no-store" }),
      ]);

      const projectData = (await projectResponse.json()) as {
        data?: Project;
        error?: string;
      };

      const planData = (await planResponse.json()) as {
        data?: ResearchPlan | null;
        error?: string;
      };
      const historyData = (await historyResponse.json()) as {
        data?: ResearchPlanRevision[];
        error?: string;
      };
      const researchersData = (await researchersResponse.json()) as {
        data?: ResearcherOption[];
        error?: string;
      };

      if (!projectResponse.ok) {
        throw new Error(projectData.error ?? "Could not load Project");
      }

      if (!planResponse.ok) {
        throw new Error(planData.error ?? "Could not load Research Plan");
      }

      if (!researchersResponse.ok) {
        throw new Error(researchersData.error ?? "Could not load Researchers");
      }

      if (!historyResponse.ok) {
        throw new Error(historyData.error ?? "Could not load Research Plan history");
      }

      setProject(projectData.data ?? null);
      setPlan(planData.data ?? null);
      setHistory(historyData.data ?? []);
      setResearchers(researchersData.data ?? []);
      setContent(planData.data?.content ?? EMPTY_DOC);

      const firstResearcherId = (researchersData.data ?? [])[0]?.id ?? "";
      const lastEditedById = planData.data?.lastEditedBy?.id ?? "";
      setResearcherId(lastEditedById || firstResearcherId);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (projectId) {
      loadData();
    }
  }, [loadData, projectId]);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const response = await fetch(`/api/research-plans/${projectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          researcherId: researcherId.trim(),
        }),
      });

      const responseData = (await response.json()) as {
        data?: ResearchPlan;
        revision?: ResearchPlanRevision;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(responseData.error ?? "Could not save Research Plan");
      }

      setPlan(responseData.data ?? null);
      if (responseData.revision) {
        setHistory((current) => [responseData.revision as ResearchPlanRevision, ...current]);
      }
      setSuccessMessage("Research Plan saved.");
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unknown error";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700">
              Research Repository
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight">Research Plan</h1>
            <p className="mt-1 text-sm text-slate-600">{project?.name ?? "Project"}</p>
          </div>
          <Link
            href={`/projects/${projectId}`}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Back to Project
          </Link>
        </header>

        {error ? (
          <section className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </section>
        ) : null}

        {successMessage ? (
          <section className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {successMessage}
          </section>
        ) : null}

        {isLoading ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">Loading Research Plan...</p>
          </section>
        ) : (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Plan Content</h2>
              <p className="mt-1 text-sm text-slate-600">
                Write and save the project plan. This editor stores structured rich text.
              </p>
              <div className="mt-4">
                <RichTextEditor value={content} onChange={setContent} />
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Save</h2>
              <p className="mt-1 text-sm text-slate-600">{lastEditedSummary}</p>
              <label className="mt-4 flex flex-col gap-1 text-sm text-slate-700">
                Edited By
                <select
                  required
                  value={researcherId}
                  onChange={(event) => setResearcherId(event.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
                >
                  {researchers.length === 0 ? <option value="">No Researchers</option> : null}
                  {researchers.map((researcher) => (
                    <option key={researcher.id} value={researcher.id}>
                      {researcher.name} ({researcher.email})
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !researcherId.trim()}
                className="mt-4 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60"
              >
                {isSaving ? "Saving..." : "Save Research Plan"}
              </button>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Recent Edit History</h2>
              <p className="mt-1 text-sm text-slate-600">
                Latest saved versions for this project plan.
              </p>

              {history.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600">No saved revisions yet.</p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {history.map((revision) => (
                    <li
                      key={revision.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2"
                    >
                      <div className="text-sm text-slate-700">
                        <p className="font-medium">
                          {revision.editedBy.name} ({revision.editedBy.email})
                        </p>
                        <p className="text-xs text-slate-500">
                          Saved {formatTimestamp(revision.createdAt)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setContent(revision.content ?? EMPTY_DOC);
                          setResearcherId((current) => current || revision.editedBy.id);
                          setSuccessMessage("Loaded revision into editor. Save to apply.");
                        }}
                        className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Load In Editor
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
