"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";

type ProductArea = {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  _count?: { projects: number };
};

type ResearcherOption = {
  id: string;
  name: string;
  email: string;
};

export default function ProductAreasPage() {
  const [items, setItems] = useState<ProductArea[]>([]);
  const [researchers, setResearchers] = useState<ResearcherOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [createdById, setCreatedById] = useState("");

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        (item.description?.toLowerCase() ?? "").includes(query)
    );
  }, [items, searchQuery]);

  async function loadData() {
    setIsLoading(true);
    setError(null);

    try {
      const [areasResponse, researchersResponse] = await Promise.all([
        fetch("/api/product-areas", { cache: "no-store" }),
        fetch("/api/researchers", { cache: "no-store" }),
      ]);

      const data = (await areasResponse.json()) as { data?: ProductArea[]; error?: string };
      const researchersData = (await researchersResponse.json()) as {
        data?: ResearcherOption[];
        error?: string;
      };

      if (!areasResponse.ok) {
        throw new Error(data.error ?? "Could not load Product Areas");
      }

      if (!researchersResponse.ok) {
        throw new Error(researchersData.error ?? "Could not load Researchers");
      }

      setItems(data.data ?? []);
      setResearchers(researchersData.data ?? []);

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
  }

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);
    setError(null);

    const payload = {
      name: name.trim(),
      description: description.trim() ? description.trim() : null,
      createdById: createdById.trim(),
    };

    try {
      const response = await fetch("/api/product-areas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not create Product Area");
      }

      setName("");
      setDescription("");
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
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">Product Areas</h1>
            <p className="mt-2 text-slate-600">
              Organize research efforts by product domain before creating projects.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            + New Area
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
              placeholder="Search by name..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <p className="mt-2 text-xs text-slate-500">
              {filteredItems.length} of {items.length} areas
            </p>
          </div>

          {/* List Body */}
          {isLoading ? (
            <div className="px-6 py-8 text-center text-sm text-slate-500">Loading...</div>
          ) : filteredItems.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-slate-500">
              {items.length === 0 ? "No product areas yet." : "No areas match your search."}
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {filteredItems.map((item) => (
                <li key={item.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <Link
                    href={`/product-areas/${item.id}`}
                    className="block min-w-0 flex-1 cursor-pointer"
                  >
                    <h3 className="font-semibold text-slate-900">{item.name}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.description || "No description"}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      📁 {item._count?.projects ?? 0} project{(item._count?.projects ?? 0) !== 1 ? "s" : ""}
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
        title="New Product Area"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-600">Name</span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Payments"
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
            <span className="text-xs font-semibold uppercase text-slate-600">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Scope and goals..."
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
              disabled={isSaving || !createdById}
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
