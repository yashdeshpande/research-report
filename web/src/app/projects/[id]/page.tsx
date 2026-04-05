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

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [productAreaId, setProductAreaId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [projectResponse, areasResponse] = await Promise.all([
        fetch(`/api/projects/${id}`, { cache: "no-store" }),
        fetch("/api/product-areas", { cache: "no-store" }),
      ]);

      const projectData = (await projectResponse.json()) as { data?: ProjectDetails; error?: string };
      const areasData = (await areasResponse.json()) as {
        data?: ProductAreaOption[];
        error?: string;
      };

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
