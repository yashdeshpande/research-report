"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";

type ReportDetails = {
  id: string;
  title: string;
  notes: string | null;
  fileUrl: string;
  fileName: string;
  fileSize: number | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt: string | null;
  project?: {
    id: string;
    name: string;
  };
};

export default function ReportDetailsPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [item, setItem] = useState<ReportDetails | null>(null);

  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "ARCHIVED">("DRAFT");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadItem = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reports/${id}`, { cache: "no-store" });
      const data = (await response.json()) as { data?: ReportDetails; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not load Report");
      }

      const loaded = data.data;

      if (!loaded) {
        throw new Error("Report not found");
      }

      setItem(loaded);
      setTitle(loaded.title);
      setNotes(loaded.notes ?? "");
      setFileUrl(loaded.fileUrl);
      setFileName(loaded.fileName);
      setFileSize(loaded.fileSize?.toString() ?? "");
      setStatus(loaded.status);
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
      const response = await fetch(`/api/reports/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          notes: notes.trim() ? notes.trim() : null,
          fileUrl: fileUrl.trim(),
          fileName: fileName.trim(),
          fileSize: fileSize ? Number(fileSize) : null,
          status,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not update Report");
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
    if (!confirm("Delete this Report? This cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/reports/${id}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not delete Report");
      }

      const backHref = item?.project?.id ? `/projects/${item.project.id}` : "/projects";
      router.push(backHref);
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
          <h1 className="text-2xl font-semibold tracking-tight">Report Details</h1>
          <Link
            href={item?.project?.id ? `/projects/${item.project.id}` : "/projects"}
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
            <p className="text-sm text-slate-600">Loading Report...</p>
          </section>
        ) : item ? (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Edit</h2>
              <form onSubmit={handleSave} className="mt-4 grid gap-4 md:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  Title
                  <input
                    required
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  Status
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value as typeof status)}
                    className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500"
                  >
                    <option value="DRAFT">DRAFT</option>
                    <option value="PUBLISHED">PUBLISHED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  File URL
                  <input
                    required
                    type="url"
                    value={fileUrl}
                    onChange={(event) => setFileUrl(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  File Name
                  <input
                    required
                    value={fileName}
                    onChange={(event) => setFileName(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm text-slate-700">
                  File Size (bytes)
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={fileSize}
                    onChange={(event) => setFileSize(event.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500"
                  />
                </label>

                <label className="md:col-span-2 flex flex-col gap-1 text-sm text-slate-700">
                  Notes
                  <textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    className="min-h-24 rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-emerald-500"
                  />
                </label>

                <div className="md:col-span-2 flex items-center gap-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="rounded-lg border border-rose-300 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60"
                  >
                    {isDeleting ? "Deleting..." : "Delete Report"}
                  </button>
                </div>
              </form>
            </section>
          </>
        ) : null}
      </div>
    </main>
  );
}
