"use client";

import Link from "next/link";
import {
  ChangeEvent,
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";

type EvidenceItem = {
  id: string;
  score: number;
  sourceType: "REPORT" | "RESEARCH_PLAN" | "INSIGHT";
  sourceId: string;
  projectId: string;
  chunkIndex: number;
  text: string;
  projectName: string;
  sourceLabel: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  evidence?: EvidenceItem[];
};

const EXAMPLE_PROMPTS = [
  "Search for checkout insights across the repository",
  "Find reports related to onboarding friction",
  "Which projects mention support requests?",
  "What insights exist for pricing research?",
];

function SourcesPanel({ evidence }: { evidence: EvidenceItem[] }) {
  const [open, setOpen] = useState(false);

  const unique = evidence.filter(
    (item, i, arr) => arr.findIndex((e) => e.sourceId === item.sourceId) === i,
  );

  if (unique.length === 0) return null;

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 transition-colors hover:text-slate-700"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.828 10.172a4 4 0 0 0-5.656 0l-4 4a4 4 0 1 0 5.656 5.656l1.102-1.101m-.758-4.899a4 4 0 0 0 5.656 0l4-4a4 4 0 0 0-5.656-5.656l-1.1 1.1"
          />
        </svg>
        {unique.length} source{unique.length !== 1 ? "s" : ""}
        <svg
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19 9-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <ul className="mt-2 space-y-1.5">
          {unique.map((item) => {
            const href =
              item.sourceType === "REPORT"
                ? `/reports/${item.sourceId}`
                : item.sourceType === "RESEARCH_PLAN"
                  ? `/projects/${item.projectId}/research-plan`
                  : `/projects/${item.projectId}`;

            const icon =
              item.sourceType === "REPORT"
                ? "📄"
                : item.sourceType === "RESEARCH_PLAN"
                  ? "📋"
                  : "💡";

            return (
              <li key={item.sourceId}>
                <Link
                  href={href}
                  className="flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs transition-colors hover:bg-slate-100"
                >
                  <span className="mt-0.5 shrink-0">{icon}</span>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-slate-800">
                      {item.sourceLabel}
                    </div>
                    <div className="truncate text-slate-500">in {item.projectName}</div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [placeholder, setPlaceholder] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const promptIndexRef = useRef(0);
  const charIndexRef = useRef(0);
  const phaseRef = useRef<"typing" | "holding" | "deleting">("typing");

  const hasMessages = messages.length > 0;

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Animated placeholder — cycles through example prompts while textarea is empty
  useEffect(() => {
    function clearAnim() {
      if (animTimerRef.current) {
        clearTimeout(animTimerRef.current);
        animTimerRef.current = null;
      }
    }

    if (query) {
      clearAnim();
      setPlaceholder("");
      return;
    }

    function tick() {
      const prompt = EXAMPLE_PROMPTS[promptIndexRef.current];

      if (phaseRef.current === "typing") {
        charIndexRef.current += 1;
        setPlaceholder(prompt.slice(0, charIndexRef.current));

        if (charIndexRef.current >= prompt.length) {
          phaseRef.current = "holding";
          animTimerRef.current = setTimeout(tick, 500);
        } else {
          animTimerRef.current = setTimeout(tick, 20);
        }
      } else if (phaseRef.current === "holding") {
        phaseRef.current = "deleting";
        animTimerRef.current = setTimeout(tick, 60);
      } else {
        charIndexRef.current -= 1;
        setPlaceholder(prompt.slice(0, charIndexRef.current));

        if (charIndexRef.current <= 0) {
          promptIndexRef.current =
            (promptIndexRef.current + 1) % EXAMPLE_PROMPTS.length;
          phaseRef.current = "typing";
          charIndexRef.current = 0;
          animTimerRef.current = setTimeout(tick, 400);
        } else {
          animTimerRef.current = setTimeout(tick, 60);
        }
      }
    }

    animTimerRef.current = setTimeout(tick, 800);
    return clearAnim;
  }, [query]);

  async function submitQuery(trimmedQuery: string) {
    if (!trimmedQuery || isLoading) return;

    setMessages((prev) => [...prev, { role: "user", content: trimmedQuery }]);
    setQuery("");
    setIsLoading(true);

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    try {
      const response = await fetch("/api/search/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmedQuery }),
      });

      const payload = (await response.json()) as {
        data?: { reply: string; evidence?: EvidenceItem[] };
        error?: string;
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Could not search the repository");
      }

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            payload.data?.reply ??
            "I could not find enough context to answer that.",
          evidence: payload.data?.evidence,
        },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Something went wrong: ${message}` },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    submitQuery(query.trim());
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      submitQuery(query.trim());
    }
  }

  function handleTextareaChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setQuery(event.target.value);
    event.target.style.height = "auto";
    event.target.style.height = `${Math.min(event.target.scrollHeight, 200)}px`;
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden bg-slate-50">
      {/* Compact header — only visible once the conversation has started */}
      {hasMessages ? (
        <header className="shrink-0 border-b border-slate-200 bg-white px-6 py-3 text-center">
          <p className="text-sm font-semibold text-slate-700">
            Ask Once. Search Everything.
          </p>
          <p className="text-xs text-slate-400">
            Agentic search across projects, reports, and insights.
          </p>
        </header>
      ) : null}

      {/* Messages / empty state */}
      <div className="flex-1 overflow-y-auto">
        {hasMessages ? (
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-6">
            {messages.map((msg, i) =>
              msg.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[75%] rounded-2xl bg-slate-900 px-4 py-3 text-sm leading-relaxed text-white">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex justify-start">
                  <div className="max-w-[85%] rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm leading-relaxed text-slate-800 shadow-sm">
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    {msg.evidence ? (
                      <SourcesPanel evidence={msg.evidence} />
                    ) : null}
                  </div>
                </div>
              ),
            )}

            {isLoading ? (
              <div className="flex justify-start">
                <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
                    <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                  </div>
                </div>
              </div>
            ) : null}

            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center px-6 pb-24 text-center">
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">
              Ask Once. Search Everything.
            </h1>
            <p className="mt-3 text-base text-slate-600">
              Agentic search across projects, reports, and insights.
            </p>
          </div>
        )}
      </div>

      {/* Input bar — pinned to the bottom */}
      <div className="shrink-0 border-t border-slate-200 bg-white px-4 py-4">
        <form
          onSubmit={handleSubmit}
          className="mx-auto flex max-w-3xl items-end gap-3"
        >
          <label className="sr-only" htmlFor="chat-input">
            Ask the assistant
          </label>
          <textarea
            ref={textareaRef}
            id="chat-input"
            value={query}
            onChange={handleTextareaChange}
            onKeyDown={handleKeyDown}
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white"
            placeholder={placeholder || "Ask anything about your research..."}
            style={{ minHeight: "48px", maxHeight: "200px" }}
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            aria-label="Send message"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12zm0 0h7.5"
                />
              </svg>
            )}
          </button>
        </form>
        {!hasMessages ? (
          <p className="mt-2 text-center text-xs text-slate-400">
            Press Enter to send · Shift+Enter for new line
          </p>
        ) : null}
      </div>
    </main>
  );
}
