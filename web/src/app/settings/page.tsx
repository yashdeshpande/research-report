"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Researcher = {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
};

export default function SettingsPage() {
  const [items, setItems] = useState<Researcher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const filteredItems = useMemo(() => {
    const query = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) || item.email.toLowerCase().includes(query)
    );
  }, [items, searchQuery]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/researchers", { cache: "no-store" });
      const data = (await response.json()) as { data?: Researcher[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not load Researchers");
      }

      setItems(data.data ?? []);
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
    setSuccessMessage(null);

    try {
      const response = await fetch("/api/researchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          avatarUrl: avatarUrl.trim() ? avatarUrl.trim() : null,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Could not create Researcher");
      }

      setName("");
      setEmail("");
      setPassword("");
      setAvatarUrl("");
      setSuccessMessage("Researcher created.");
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
      <div className="mx-auto max-w-5xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Settings</h1>
          <p className="mt-2 text-slate-600">Manage workspace configuration and team members.</p>
        </div>

        {/* Alerts */}
        {error ? (
          <section className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error}
          </section>
        ) : null}

        {successMessage ? (
          <section className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {successMessage}
          </section>
        ) : null}

        {/* Researchers section */}
        <div>
          <h2 className="text-xl font-semibold text-slate-800">Researchers</h2>
          <p className="mt-1 text-sm text-slate-500">
            Team members who create and collaborate on research.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Create Form */}
          <section className="lg:col-span-1">
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-semibold text-slate-900">Add Researcher</h3>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold uppercase text-slate-600">Name</span>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="Alex Rivera"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase text-slate-600">Email</span>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="alex@company.com"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase text-slate-600">Password</span>
                  <input
                    required
                    type="password"
                    minLength={8}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="Min 8 chars"
                  />
                </label>

                <label className="block">
                  <span className="text-xs font-semibold uppercase text-slate-600">Avatar URL</span>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(event) => setAvatarUrl(event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="https://example.com/avatar.png"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                >
                  {isSaving ? "Creating..." : "Add Researcher"}
                </button>
              </form>
            </div>
          </section>

          {/* List */}
          <section className="lg:col-span-2">
            <div className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 px-6 py-4">
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <p className="mt-2 text-xs text-slate-500">
                  {filteredItems.length} of {items.length} researchers
                </p>
              </div>

              {isLoading ? (
                <div className="px-6 py-8 text-center text-sm text-slate-500">Loading...</div>
              ) : filteredItems.length === 0 ? (
                <div className="px-6 py-8 text-center text-sm text-slate-500">
                  {items.length === 0
                    ? "No researchers yet."
                    : "No researchers match your search."}
                </div>
              ) : (
                <ul className="divide-y divide-slate-200">
                  {filteredItems.map((item) => (
                    <li key={item.id} className="px-6 py-4 transition-colors hover:bg-slate-50">
                      <h3 className="font-semibold text-slate-900">{item.name}</h3>
                      <p className="mt-1 text-sm text-slate-600">{item.email}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
