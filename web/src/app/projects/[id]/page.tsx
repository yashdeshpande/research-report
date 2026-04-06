"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

type ProductAreaOption = {
  id: string;
  name: string;
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
    insights: number;
  };
};

type Report = {
  id: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  fileName: string;
  notes: string | null;
  createdAt: string;
};

type ResearcherOption = {
  id: string;
  name: string;
  email: string;
};

export default function ProjectDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [item, setItem] = useState<ProjectDetails | null>(null);
  const [productAreas, setProductAreas] = useState<ProductAreaOption[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [productAreaId, setProductAreaId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [reports, setReports] = useState<Report[]>([]);
  const [researchers, setResearchers] = useState<ResearcherOption[]>([]);

  const [reportTitle, setReportTitle] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [reportFileUrl, setReportFileUrl] = useState("");
  const [reportFileName, setReportFileName] = useState("");
  const [reportFileSize, setReportFileSize] = useState("");
  const [reportCreatedById, setReportCreatedById] = useState("");
  const [isSavingReport, setIsSavingReport] = useState(false);
  const [showAddReport, setShowAddReport] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [projectResponse, areasResponse, reportsResponse, researchersResponse] = await Promise.all([
        fetch(`/api/projects/${id}`, { cache: "no-store" }),
        fetch("/api/product-areas", { cache: "no-store" }),
        fetch(`/api/reports?projectId=${id}`, { cache: "no-store" }),
        fetch("/api/researchers", { cache: "no-store" }),
      ]);

      const projectData = (await projectResponse.json()) as { data?: ProjectDetails; error?: string };
      const areasData = (await areasResponse.json()) as { data?: ProductAreaOption[]; error?: string };
      const reportsData = (await reportsResponse.json()) as { data?: Report[]; error?: string };
      const researchersData = (await researchersResponse.json()) as { data?: ResearcherOption[]; error?: string };

      if (!projectResponse.ok) {
        throw new Error(projectData.error ?? "Could not load Project");
      }

      if (!areasResponse.ok) {
        throw new Error(areasData.error ?? "Could not load Product Areas");
      }

      const loaded = projectData.data;

      if (!loaded) {
        throw new Error("Project not found");
      }

      setItem(loaded);
      setProductAreas(areasData.data ?? []);
      setReports(reportsData.data ?? []);

      const researchersList = researchersData.data ?? [];
      setResearchers(researchersList);
      if (researchersList.length > 0) {
        setReportCreatedById((current) => current || researchersList[0].id);
      }

      setName(loaded.name);
      setDescription(loaded.description ?? "");
      setProductAreaId(loaded.productAreaId);
      setStartDate(loaded.startDate ? loaded.startDate.slice(0, 10) : "");
      setEndDate(loaded.endDate ? loaded.endDate.slice(0, 10) : "");
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

  async function handleAddReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSavingReport(true);
    setError(null);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: reportTitle.trim(),
          notes: reportNotes.trim() ? reportNotes.trim() : null,
          fileUrl: reportFileUrl.trim(),
          fileName: reportFileName.trim(),
          fileSize: reportFileSize ? Number(reportFileSize) : null,
          projectId: id,
          createdById: reportCreatedById,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not add Report");
      }

      setReportTitle("");
      setReportNotes("");
      setReportFileUrl("");
      setReportFileName("");
      setReportFileSize("");
      setShowAddReport(false);

      const reportsResponse = await fetch(`/api/reports?projectId=${id}`, { cache: "no-store" });
      const reportsData = (await reportsResponse.json()) as { data?: Report[] };
      setReports(reportsData.data ?? []);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unknown error";
      setError(message);
    } finally {
      setIsSavingReport(false);
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

                <div className="md:col-span-2 flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                  >
                    {isDeleting ? "Deleting..." : "Delete Project"}
                  </button>
                </div>
              </form>
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

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Reports</h2>
                <button
                  type="button"
                  onClick={() => setShowAddReport((v) => !v)}
                  className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  {showAddReport ? "Cancel" : "+ Add Report"}
                </button>
              </div>

              {showAddReport ? (
                <form onSubmit={handleAddReport} className="mt-4 grid gap-4 md:grid-cols-2 border-t border-slate-100 pt-4">
                  <label className="flex flex-col gap-1 text-sm text-slate-700">
                    Title
                    <input
                      required
                      value={reportTitle}
                      onChange={(e) => setReportTitle(e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm text-slate-700">
                    Uploaded By
                    <select
                      required
                      value={reportCreatedById}
                      onChange={(e) => setReportCreatedById(e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
                    >
                      {researchers.length === 0 ? (
                        <option value="">No researchers — add one in Settings</option>
                      ) : (
                        researchers.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))
                      )}
                    </select>
                  </label>

                  <label className="flex flex-col gap-1 text-sm text-slate-700">
                    File URL
                    <input
                      required
                      type="url"
                      value={reportFileUrl}
                      onChange={(e) => setReportFileUrl(e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm text-slate-700">
                    File Name
                    <input
                      required
                      value={reportFileName}
                      onChange={(e) => setReportFileName(e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm text-slate-700">
                    File Size (bytes)
                    <input
                      type="number"
                      min={0}
                      value={reportFileSize}
                      onChange={(e) => setReportFileSize(e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
                    />
                  </label>

                  <label className="flex flex-col gap-1 text-sm text-slate-700">
                    Notes
                    <textarea
                      value={reportNotes}
                      onChange={(e) => setReportNotes(e.target.value)}
                      className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-indigo-500"
                    />
                  </label>

                  <div className="md:col-span-2">
                    <button
                      type="submit"
                      disabled={isSavingReport || researchers.length === 0}
                      className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                    >
                      {isSavingReport ? "Adding..." : "Add Report"}
                    </button>
                  </div>
                </form>
              ) : null}

              {reports.length === 0 ? (
                <p className="mt-4 text-sm text-slate-500">
                  No reports yet. Click &ldquo;+ Add Report&rdquo; to upload one.
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-slate-100">
                  {reports.map((report) => (
                    <li key={report.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{report.title}</p>
                        <p className="text-xs text-slate-500">
                          {report.fileName} &middot; {report.status} &middot;{" "}
                          {new Date(report.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Link
                        href={`/reports/${report.id}`}
                        className="ml-4 shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Open
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold">Insights</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {item._count?.insights ?? 0} insight{(item._count?.insights ?? 0) !== 1 ? "s" : ""} from this project
                  </p>
                </div>
                <Link
                  href={`/insights?projectId=${id}`}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Open Insights
                </Link>
              </div>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
