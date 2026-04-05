"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

type ProductAreaDetails = {
  id: string;
  name: string;
  description: string | null;
  projects: Array<{ id: string; name: string }>;
  _count?: { projects: number };
};

export default function ProductAreaDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [item, setItem] = useState<ProductAreaDetails | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setName(loaded.name);
      setDescription(loaded.description ?? "");
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

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/product-areas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not update Product Area");
      }

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
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">Product Area Details</h1>
          <Link
            href="/product-areas"
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
            <p className="text-sm text-slate-600">Loading Product Area...</p>
          </section>
        ) : item ? (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Edit</h2>
              <form onSubmit={handleSave} className="mt-4 grid gap-4">
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  Name
                  <input
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-500"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  Description
                  <textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="min-h-24 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-teal-500"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-fit rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </form>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Linked Projects</h2>
              {item.projects.length === 0 ? (
                <p className="mt-2 text-sm text-slate-600">No linked projects.</p>
              ) : (
                <ul className="mt-3 space-y-2">
                  {item.projects.map((project) => (
                    <li key={project.id} className="text-sm text-slate-700">
                      {project.name}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-rose-900">Danger Zone</h2>
              <p className="mt-2 text-sm text-rose-800">
                Deletion is blocked while this Product Area has linked projects.
              </p>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="mt-4 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-60"
              >
                {isDeleting ? "Deleting..." : "Delete Product Area"}
              </button>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
