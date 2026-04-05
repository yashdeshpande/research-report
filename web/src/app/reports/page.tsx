"use client";

"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";

type ProjectOption = {
  id: string;
  name: string;
};

type ResearcherOption = {
  id: string;
  name: string;
  email: string;
};

type Report = {
  id: string;
  title: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  fileName: string;
  notes: string | null;
  project?: { id: string; name: string };
  createdAt: string;
};

export default function ReportsPage() {
  const [items, setItems] = useState<Report[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [researchers, setResearchers] = useState<ResearcherOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [projectId, setProjectId] = useState("");
  const [createdById, setCreatedById] = useState("");

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        (item.notes?.toLowerCase() ?? "").includes(query) ||
        item.fileName.toLowerCase().includes(query) ||
        (item.project?.name.toLowerCase() ?? "").includes(query)
    );
  }, [items, searchQuery]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [reportsResponse, projectsResponse, researchersResponse] = await Promise.all([
        fetch("/api/reports", { cache: "no-store" }),
        fetch("/api/projects", { cache: "no-store" }),
        fetch("/api/researchers", { cache: "no-store" }),
      ]);

      const reportsData = (await reportsResponse.json()) as { data?: Report[]; error?: string };
      const projectsData = (await projectsResponse.json()) as {
        data?: ProjectOption[];
        error?: string;
      };
      const researchersData = (await researchersResponse.json()) as {
        data?: ResearcherOption[];
        error?: string;
      };

      if (!reportsResponse.ok) {
        throw new Error(reportsData.error ?? "Could not load Reports");
      }

      if (!projectsResponse.ok) {
        throw new Error(projectsData.error ?? "Could not load Projects");
      }

      if (!researchersResponse.ok) {
        throw new Error(researchersData.error ?? "Could not load Researchers");
      }

      setItems(reportsData.data ?? []);
      setProjects(projectsData.data ?? []);
      setResearchers(researchersData.data ?? []);

      if ((projectsData.data ?? []).length > 0) {
        const firstProjectId = (projectsData.data ?? [])[0].id;
        setProjectId((current) => current || firstProjectId);
      }

      if ((researchersData.data ?? []).length > 0) {
        const firstResearcherId = (researchersData.data ?? [])[0].id;
        setCreatedById((current) => current || firstResearcherId);
      }
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          notes: notes.trim() ? notes.trim() : null,
          fileUrl: fileUrl.trim(),
          fileName: fileName.trim(),
          fileSize: fileSize ? Number(fileSize) : null,
          projectId,
          createdById: createdById.trim(),
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not create Report");
      }

      setTitle("");
      setNotes("");
      setFileUrl("");
      setFileName("");
      setFileSize("");
      setIsModalOpen(false);
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
      <div className="mx-auto max-w-4xl space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">Reports</h1>
            <p className="mt-2 text-slate-600">
              Add report files to projects and keep optional notes as supporting context.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            + New Report
          </button>
        </div>

        {/* Alerts */}
        {error ? (
          <section className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </section>
        ) : null}

        {/* List */}
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
          {/* Search Header */}
          <div className="border-b border-slate-200 px-6 py-4">
            <input
              type="text"
              placeholder="Search by title, file, or project..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <p className="mt-2 text-xs text-slate-500">
              {filteredItems.length} of {items.length} reports
            </p>
          </div>

          {/* List Body */}
          {isLoading ? (
            <div className="px-6 py-8 text-center text-sm text-slate-500">Loading...</div>
          ) : filteredItems.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-slate-500">
              {items.length === 0 ? "No reports yet." : "No reports match your search."}
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {filteredItems.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/reports/${item.id}`}
                    className="block px-6 py-4 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-slate-900">{item.title}</h3>
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                        item.status === "PUBLISHED" 
                          ? "bg-green-100 text-green-800" 
                          : item.status === "ARCHIVED"
                          ? "bg-gray-100 text-gray-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.notes || "No notes"}
                    </p>
                    <p className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span>📄 {item.fileName}</span>
                      <span>📂 {item.project?.name ?? "Unknown Project"}</span>
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="New Report"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-600">Title</span>
            <input
              required
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Interview Summary: Checkout"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-600">Project</span>
            <select
              required
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              {projects.length === 0 ? <option value="">No Projects</option> : null}
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-600">File URL</span>
            <input
              required
              type="url"
              value={fileUrl}
              onChange={(event) => setFileUrl(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="https://..."
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-600">File Name</span>
            <input
              required
              value={fileName}
              onChange={(event) => setFileName(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="checkout-report.pdf"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-600">File Size (bytes)</span>
            <input
              type="number"
              min={0}
              step={1}
              value={fileSize}
              onChange={(event) => setFileSize(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="102400"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-600">Created By</span>
            <select
              required
              value={createdById}
              onChange={(event) => setCreatedById(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              {researchers.length === 0 ? <option value="">No Researchers</option> : null}
              {researchers.map((researcher) => (
                <option key={researcher.id} value={researcher.id}>
                  {researcher.name} ({researcher.email})
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-600">Notes</span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Context and notes..."
              rows={3}
            />
          </label>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !projectId || !createdById}
              className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {isSaving ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
