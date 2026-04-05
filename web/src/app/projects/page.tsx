"use client";
"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/Modal";

type ProductAreaOption = {
  id: string;
  name: string;
};

type ResearcherOption = {
  id: string;
  name: string;
  email: string;
};

type Project = {
  id: string;
  name: string;
  description: string | null;
  startDate: string | null;
  endDate: string | null;
  productArea?: { id: string; name: string };
  _count?: { reports: number; insights: number };
};

export default function ProjectsPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [productAreas, setProductAreas] = useState<ProductAreaOption[]>([]);
  const [researchers, setResearchers] = useState<ResearcherOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [productAreaId, setProductAreaId] = useState("");
  const [createdById, setCreatedById] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        (item.description?.toLowerCase() ?? "").includes(query) ||
        (item.productArea?.name.toLowerCase() ?? "").includes(query)
    );
  }, [items, searchQuery]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [projectsResponse, areasResponse, researchersResponse] = await Promise.all([
        fetch("/api/projects", { cache: "no-store" }),
        fetch("/api/product-areas", { cache: "no-store" }),
        fetch("/api/researchers", { cache: "no-store" }),
      ]);

      const projectsData = (await projectsResponse.json()) as { data?: Project[]; error?: string };
      const areasData = (await areasResponse.json()) as {
        data?: ProductAreaOption[];
        error?: string;
      };
      const researchersData = (await researchersResponse.json()) as {
        data?: ResearcherOption[];
        error?: string;
      };

      if (!projectsResponse.ok) {
        throw new Error(projectsData.error ?? "Could not load Projects");
      }

      if (!areasResponse.ok) {
        throw new Error(areasData.error ?? "Could not load Product Areas");
      }

      if (!researchersResponse.ok) {
        throw new Error(researchersData.error ?? "Could not load Researchers");
      }

      setItems(projectsData.data ?? []);
      setProductAreas(areasData.data ?? []);
      setResearchers(researchersData.data ?? []);

      if ((areasData.data ?? []).length > 0) {
        const firstProductAreaId = (areasData.data ?? [])[0].id;
        setProductAreaId((current) => current || firstProductAreaId);
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
      const response = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
          productAreaId,
          createdById: createdById.trim(),
          startDate: startDate || null,
          endDate: endDate || null,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not create Project");
      }

      setName("");
      setDescription("");
      setStartDate("");
      setEndDate("");
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
            <h1 className="text-4xl font-bold tracking-tight text-slate-900">Projects</h1>
            <p className="mt-2 text-slate-600">
              Create research projects under a product area and define dates early.
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            + New Project
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
              placeholder="Search by name or area..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            <p className="mt-2 text-xs text-slate-500">
              {filteredItems.length} of {items.length} projects
            </p>
          </div>

          {/* List Body */}
          {isLoading ? (
            <div className="px-6 py-8 text-center text-sm text-slate-500">Loading...</div>
          ) : filteredItems.length === 0 ? (
            <div className="px-6 py-8 text-center text-sm text-slate-500">
              {items.length === 0 ? "No projects yet." : "No projects match your search."}
            </div>
          ) : (
            <ul className="divide-y divide-slate-200">
              {filteredItems.map((item) => (
                <li key={item.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                  <Link
                    href={`/projects/${item.id}`}
                    className="block min-w-0 flex-1 cursor-pointer"
                  >
                    <h3 className="font-semibold text-slate-900">{item.name}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.description || "No description"}
                    </p>
                    <p className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                      <span>📍 {item.productArea?.name ?? "Unknown Area"}</span>
                      <span>📊 {item._count?.reports ?? 0} reports</span>
                      <span>💡 {item._count?.insights ?? 0} insights</span>
                    </p>
                  </Link>
                    <Link
                      href={`/projects/${item.id}/research-plan`}
                      className="shrink-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Research Plan
                    </Link>
                  </div>
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
        title="New Project"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-600">Name</span>
            <input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Checkout Interviews Q2"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-600">Product Area</span>
            <select
              required
              value={productAreaId}
              onChange={(event) => setProductAreaId(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            >
              {productAreas.length === 0 ? <option value="">No Product Areas</option> : null}
              {productAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
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

          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase text-slate-600">Start Date</span>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase text-slate-600">End Date</span>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-semibold uppercase text-slate-600">Description</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              placeholder="Research objective and outcomes..."
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
              disabled={isSaving || !productAreaId || !createdById}
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
