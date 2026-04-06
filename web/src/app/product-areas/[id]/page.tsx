"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/Modal";

type ProductAreaDetails = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  projects: Array<{ id: string; name: string; description: string | null }>;
  _count?: { projects: number };
};

export default function ProductAreaDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [item, setItem] = useState<ProductAreaDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const loadItem = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/product-areas/${id}`, { cache: "no-store" });
      const data = (await response.json()) as { data?: ProductAreaDetails; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not load Product Area");
      }

      const loaded = data.data;

      if (!loaded) {
        throw new Error("Product Area not found");
      }

      setItem(loaded);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unknown error";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) {
      loadItem();
    }
  }, [id, loadItem]);

  function openEditModal() {
    if (!item) return;
    setEditName(item.name);
    setEditDescription(item.description ?? "");
    setEditOpen(true);
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/product-areas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDescription.trim() ? editDescription.trim() : null,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not update Product Area");
      }

      setEditOpen(false);
      await loadItem();
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : "Unknown error";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this Product Area? This cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/product-areas/${id}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not delete Product Area");
      }

      router.push("/product-areas");
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

        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          <div>
            <Link
              href="/product-areas"
              className="text-xs font-medium text-slate-500 hover:text-indigo-600"
            >
              &larr; Back to Product Areas
            </Link>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              {item?.name ?? "Product Area Details"}
            </h1>
          </div>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting || !item}
            className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
          >
            {isDeleting ? "Deleting..." : "Delete Area"}
          </button>
        </header>

        {/* Error banner */}
        {error && (
          <section className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </section>
        )}

        {isLoading ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <p className="text-sm text-slate-600">Loading Product Area...</p>
          </section>
        ) : item ? (
          <>
            {/* Overview */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Overview</h2>
                <button
                  type="button"
                  onClick={openEditModal}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  Edit
                </button>
              </div>

              <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Name
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">{item.name}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Projects
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900">
                    {item._count?.projects ?? item.projects.length} project
                    {(item._count?.projects ?? item.projects.length) !== 1 ? "s" : ""}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Description
                  </dt>
                  <dd className="mt-1 text-sm leading-relaxed text-slate-900">
                    {item.description || "—"}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Linked Projects */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Linked Projects</h2>

              {item.projects.length === 0 ? (
                <div className="mt-6 flex flex-col items-center gap-2 py-10 text-center">
                  <svg
                    className="h-12 w-12 text-slate-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"
                    />
                  </svg>
                  <p className="text-sm font-medium text-slate-500">No projects yet</p>
                  <Link
                    href="/projects"
                    className="mt-1 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Create a project &rarr;
                  </Link>
                </div>
              ) : (
                <ul className="mt-4 divide-y divide-slate-200">
                  {item.projects.map((project) => (
                    <li key={project.id} className="py-3 hover:bg-slate-50 transition-colors -mx-6 px-6">
                      <Link href={`/projects/${project.id}`} className="block">
                        <p className="text-sm font-medium text-slate-900">{project.name}</p>
                        {project.description && (
                          <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                            {project.description}
                          </p>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Product Area"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-600">Name</span>
            <input
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Payments"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-600">Description</span>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Scope and goals..."
            />
          </label>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setEditOpen(false)}
              className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
    </main>
  );
}
