<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# Research Repository — Agent Context

> This document is the single source of truth for any coding agent working on this codebase. Read it in full before writing or modifying any code. Every section is intentional.

---

## 1. Project Overview

**Research Repository** is a web application used by a non-technical stakeholder and their research team to upload, organize, and analyze research reports across product areas and projects. The core workflow is:

1. Researchers upload reports (PDFs, docs, CSVs, etc.) tagged to a Project.
2. AI-generated insights are drafted from those reports and go through a human review workflow (pending → approved/revised/rejected).
3. A per-project chat assistant answers questions using only that project's approved/revised insights and research plan.
4. A global search assistant surfaces relevant projects, reports, and insights via keyword + LLM synthesis.

**Domain language** — use these exact terms everywhere (code, comments, API responses, UI labels):
- `Researcher` — a human user of the app
- `ProductArea` — a domain grouping (e.g. "Payments")
- `Project` — a scoped research effort sitting inside a ProductArea
- `Report` — an uploaded source document belonging to a Project
- `ResearchPlan` — a rich-text structured plan (one per Project, upserted not versioned fully)
- `ResearchPlanRevision` — an immutable snapshot of a ResearchPlan at a point in time
- `Insight` / `ProjectInsight` — an AI-drafted or human-entered finding from a Report
- `InsightStatus` — `PENDING_REVIEW`, `APPROVED`, `REVISED`, `REJECTED`
- `ReportStatus` — `DRAFT`, `PUBLISHED`, `ARCHIVED`
- `DocumentChunk` — text chunk for vector storage (source can be REPORT, RESEARCH_PLAN, or INSIGHT)
- `ChatMessage` — a persisted chat turn (USER or ASSISTANT) scoped to a Project

---

## 2. Tech Stack (exact versions matter)

| Layer | Package | Version |
|---|---|---|
| Framework | `next` | **16.2.2** |
| UI runtime | `react`, `react-dom` | **19.2.4** |
| ORM | `@prisma/client`, `prisma` | **6.7.0** |
| Database | SQLite (via Prisma) | — |
| Validation | `zod` | **^4.3.6** |
| Auth library | `next-auth` | ^4.24.13 |
| Auth adapter | `@auth/prisma-adapter` | ^2.11.1 |
| Password hashing | `bcrypt` | ^6.0.0 |
| Rich text | `@tiptap/react`, `@tiptap/starter-kit` | ^3.22.2 |
| AI SDK | `ai` (Vercel AI SDK) | ^6.0.146 |
| Styles | `tailwindcss` | **^4** (PostCSS plugin, NOT `tailwind.config.js`) |
| Language | TypeScript | ^5 |
| Script runner | `tsx` | ^4.7.0 (for seed and scripts) |

**Critical version notes:**
- **Next.js 16**: Route handler `params` are a **`Promise`** — always `await context.params` before using them. Do not use the synchronous params pattern from older versions.
- **Tailwind v4**: Uses `@tailwindcss/postcss` plugin. There is no `tailwind.config.js`. All config lives in `postcss.config.mjs` and CSS. Do not create `tailwind.config.js`.
- **Zod v4**: API has changed from v3 — `.parse()`, `.safeParse()`, `.flatten()` work as expected, but some v3 chaining patterns may differ.
- **Prisma v6**: The generated client is output to `prisma/generated/client` (not the default). Always import from that path or via `@/lib/db`.

---

## 3. Repository Structure

```
web/                        ← Next.js app root (all code lives here)
├── prisma/
│   ├── schema.prisma       ← Source of truth for all data models
│   ├── seed.ts             ← Run with `npm run db:seed` (uses tsx)
│   └── generated/client/   ← Auto-generated Prisma client (never edit manually)
├── src/
│   ├── app/
│   │   ├── layout.tsx      ← Root layout; wraps all pages with <Sidebar>
│   │   ├── globals.css     ← Tailwind v4 global styles
│   │   ├── api/            ← All Route Handlers (Next.js App Router)
│   │   └── (pages)/        ← UI pages (all Client Components)
│   ├── components/
│   │   └── Modal.tsx       ← Reusable modal wrapper
│   └── lib/
│       ├── db.ts           ← Prisma singleton (import `db` from here)
│       ├── validation.ts   ← ALL Zod schemas (import schemas from here)
│       ├── components/
│       │   ├── Sidebar.tsx        ← Global nav sidebar
│       │   └── RichTextEditor.tsx ← Tiptap wrapper component
│       └── llm/
│           ├── index.ts           ← Exports `llmProvider` singleton
│           ├── types.ts           ← LLMProvider interface
│           └── ollama-provider.ts ← Ollama implementation of LLMProvider
└── uploads/                ← Local file storage directory (served via /api/uploads/[filename])
```

**Import alias:** `@/` maps to `src/`. Use `@/lib/db`, `@/lib/validation`, `@/lib/llm`, etc.

---

## 4. Database Schema Summary

Database: **SQLite** (local file, path in `DATABASE_URL` env var). Do not assume Postgres features (no `@db.Date`, no full-text search, no arrays).

**All IDs are CUIDs** (`@default(cuid())`), not UUIDs. Never validate IDs with `z.string().uuid()`. Use the shared `idSchema = z.string().trim().min(1).max(64)` from `validation.ts`.

### Models & key fields

**`Researcher`** (`researchers` table)
- `id`, `name`, `email` (unique), `passwordHash`, `avatarUrl?`, `createdAt`, `updatedAt`
- Passwords are hashed with `bcrypt` at cost factor 12. `passwordHash` is **never** returned by any GET endpoint.

**`ProductArea`** (`product_areas` table)
- `id`, `name`, `description?`, `createdById → Researcher`, `createdAt`, `updatedAt`

**`Project`** (`projects` table)
- `id`, `name`, `description?`, `startDate?`, `endDate?`
- `productAreaId → ProductArea`, `createdById → Researcher`
- Has `researchPlan?` (1:1), `reports[]`, `insights[]`, `documentChunks[]`, `chatMessages[]`

**`ResearchPlan`** (`research_plans` table)
- `id`, `projectId` (unique — one plan per project), `content` (JSON, Tiptap doc format), `fileUrl?`, `fileName?`, `fileSize?`
- `lastEditedById → Researcher`
- Has `revisions[]` (`ResearchPlanRevision`)

**`ResearchPlanRevision`** (`research_plan_revisions` table)
- Immutable snapshots. `id`, `researchPlanId`, `editedById`, `content` (JSON), `createdAt`
- Created automatically on every PATCH to the research plan (inside a `$transaction`).

**`Report`** (`reports` table)
- `id`, `title`, `notes?`, `fileUrl`, `fileName`, `fileSize?`
- `status: ReportStatus` (DRAFT | PUBLISHED | ARCHIVED), default DRAFT
- `projectId → Project`, `createdById → Researcher`, `publishedAt?`
- Has `contributors[]` (ReportContributor join table) and `generatedInsights[]`

**`ReportContributor`** (`report_contributors` table)
- Join table: `reportId`, `researcherId`, `role: ContributorRole` (AUTHOR | CONTRIBUTOR)
- Unique constraint on `[reportId, researcherId]`
- The creator of a Report is auto-added as `AUTHOR` on POST.

**`ProjectInsight`** (`project_insights` table)
- `id`, `projectId → Project`, `content` (string), `status: InsightStatus` (PENDING_REVIEW default)
- `generatedFromReportId → Report` (must be in same project — enforced in API)
- `reviewedById? → Researcher`, `reviewedAt?`, `editorNotes?`

**`DocumentChunk`** (`document_chunks` table)
- `id`, `sourceType: SourceType` (REPORT | RESEARCH_PLAN | INSIGHT), `sourceId`, `projectId`, `chunkText`
- Reserved for future vector/embedding pipeline. Not yet used in chat retrieval (chat uses direct DB queries).

**`ChatMessage`** (`chat_messages` table)
- `id`, `projectId → Project`, `researcherId → Researcher`, `role: ChatRole` (USER | ASSISTANT), `content`, `createdAt`

### Seed data

`npm run db:seed` populates: 3 researchers, 3 product areas, several projects with reports, research plans, plan revisions, insights (mixed statuses), and chat messages. The seed **deletes all existing data first** in dependency order (chat → chunks → insights → contributors → revisions → plans → reports → projects → areas → researchers).

---

## 5. API Route Reference

All routes return JSON. Success: `{ data: ... }`. Errors: `{ error: "...", issues?: ... }`.

**Pattern used in every dynamic route handler:**
```ts
// params is a Promise in Next.js 16 — always await it
export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const params = await context.params;
  const parsed = paramsSchema.safeParse(params);
  if (!parsed.success) return NextResponse.json({ error: "..." }, { status: 400 });
  // ...
}
```

### Routes table

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/researchers` | List all researchers (id, name, email only — no hash) |
| POST | `/api/researchers` | Create researcher (bcrypt hash, email uniqueness check) |
| GET | `/api/product-areas` | List product areas |
| POST | `/api/product-areas` | Create product area |
| GET | `/api/product-areas/[id]` | Get product area by ID |
| PATCH | `/api/product-areas/[id]` | Update product area |
| GET | `/api/projects` | List all projects (includes productArea, createdBy, `_count`) |
| POST | `/api/projects` | Create project (validates endDate >= startDate) |
| GET | `/api/projects/[id]` | Get project with researchPlan summary, `_count` |
| PATCH | `/api/projects/[id]` | Update project fields |
| GET | `/api/projects/[id]/insights` | List insights for a project |
| POST | `/api/projects/[id]/insights` | Create insight (validates report is in same project) |
| PATCH | `/api/projects/[id]/insights/[insightId]` | Review insight (set APPROVED/REVISED/REJECTED) |
| GET | `/api/projects/[id]/chat` | Get chat history for a project |
| POST | `/api/projects/[id]/chat` | Send a message; builds RAG context from insights + research plan |
| GET | `/api/reports` | List reports, optional `?projectId=` filter |
| POST | `/api/reports` | Upload report metadata (file upload is separate) |
| GET | `/api/reports/[id]` | Get report by ID |
| PATCH | `/api/reports/[id]` | Update report (title, notes, status, etc.) |
| GET | `/api/research-plans/[projectId]` | Get research plan for a project |
| PATCH | `/api/research-plans/[projectId]` | Upsert research plan + write revision in `$transaction` |
| GET | `/api/research-plans/[projectId]/history` | List plan revisions (`?limit=20`) |
| GET | `/api/insights` | Global insight listing (`?projectId=`, `?reportId=`, `?status=`, `?query=`) |
| POST | `/api/uploads` | Upload a file (multipart/form-data, field name `file`) |
| GET | `/api/uploads/[filename]` | Serve an uploaded file from `uploads/` directory |
| POST | `/api/search/assistant` | Global search: keyword match + LLM synthesis across all entities |

### File upload details
- Max size: 50 MB
- Allowed extensions: `.pdf`, `.doc`, `.docx`, `.txt`, `.md`, `.csv`, `.xlsx`, `.xls`, `.ppt`, `.pptx`
- Files saved to `web/uploads/<random-hex>-<timestamp><ext>`
- Served back at `/api/uploads/[filename]` (GET)
- `fileUrl` stored in DB is the relative path `/api/uploads/<safeFileName>`

---

## 6. Validation — Central Schema File

**All Zod schemas live in `src/lib/validation.ts`.** Do not create inline schemas in route handlers.

| Schema | Used by |
|---|---|
| `researcherCreateSchema` | POST /api/researchers |
| `productAreaCreateSchema` | POST /api/product-areas |
| `productAreaUpdateSchema` | PATCH /api/product-areas/[id] |
| `projectCreateSchema` | POST /api/projects |
| `projectUpdateSchema` | PATCH /api/projects/[id] |
| `reportCreateSchema` | POST /api/reports |
| `reportUpdateSchema` | PATCH /api/reports/[id] |
| `researchPlanUpdateSchema` | PATCH /api/research-plans/[projectId] |
| `projectInsightCreateSchema` | POST /api/projects/[id]/insights |
| `projectInsightReviewSchema` | PATCH /api/projects/[id]/insights/[insightId] |
| `projectChatRequestSchema` | POST /api/projects/[id]/chat |

**ID handling rule:** All entity IDs are CUIDs. The shared `idSchema` (`z.string().trim().min(1).max(64)`) is defined once at the top of `validation.ts` and reused for every foreign key field. Never use `z.string().uuid()` for IDs.

---

## 7. LLM Abstraction Layer

Location: `src/lib/llm/`

The `LLMProvider` interface (`types.ts`) exposes:
```ts
interface LLMProvider {
  name: LLMProviderName;             // "ollama" | "openai" | "anthropic"
  chat(messages: ChatMessageInput[]): Promise<ChatResult>;  // { text: string }
  embed(input: string): Promise<EmbedResult>;               // { vector: number[] }
}
```

The singleton `llmProvider` exported from `src/lib/llm/index.ts` is the only entry point. **Import `llmProvider` from `@/lib/llm`; never instantiate providers directly.**

**Environment variables:**
```
LLM_PROVIDER=ollama          # default; set to "openai" or "anthropic" when cloud adapters added
OLLAMA_BASE_URL=http://127.0.0.1:11434   # default
OLLAMA_CHAT_MODEL=llama3.1               # default
OLLAMA_EMBED_MODEL=nomic-embed-text      # default
```

Only `OllamaProvider` is implemented. The `switch` in `index.ts` falls through to Ollama for all provider names until cloud adapters are added. When adding a cloud provider, create a new `*-provider.ts` file implementing `LLMProvider` and add a case to the switch — do not modify the interface.

### Chat retrieval strategy (Phase 5)

`POST /api/projects/[id]/chat` builds an in-context RAG block without vector search:
1. Loads all `ProjectInsight` records for the project (grouped by status).
2. Loads the project's `ResearchPlan.content` (JSON, converted to plain text via `toPlainText()`).
3. Injects into a system prompt: up to 8 APPROVED insights, 6 REVISED, 4 PENDING_REVIEW, and 6000 chars of plan text.
4. Appends full chat history from `ChatMessage` (USER/ASSISTANT turns).
5. Calls `llmProvider.chat()` and persists both the user message and assistant response.

**Priority rule:** APPROVED > REVISED > PENDING_REVIEW. Pending insights are explicitly labelled as low-confidence in the prompt.

---

## 8. Frontend Pages

All pages are **Client Components** (`"use client"`). There is no server-side data fetching in pages — all data is fetched via `fetch()` to the `/api/*` routes after mount.

| Path | File | Description |
|---|---|---|
| `/` | `src/app/page.tsx` | Home / dashboard |
| `/product-areas` | `src/app/product-areas/page.tsx` | List + create product areas |
| `/product-areas/[id]` | `src/app/product-areas/[id]/page.tsx` | Product area detail |
| `/projects` | `src/app/projects/page.tsx` | List + create projects |
| `/projects/[id]` | `src/app/projects/[id]/page.tsx` | Project detail: reports, insights, chat panel |
| `/projects/[id]/research-plan` | `src/app/projects/[id]/research-plan/page.tsx` | Rich text research plan editor with revision history |
| `/reports` | `src/app/reports/page.tsx` | Global reports list |
| `/reports/[id]` | `src/app/reports/[id]/page.tsx` | Report detail |
| `/insights` | `src/app/insights/page.tsx` | Global insights list with filters |
| `/researchers` | `src/app/researchers/page.tsx` | Researcher management |
| `/settings` | `src/app/settings/page.tsx` | Settings |

**Sidebar navigation** (`src/lib/components/Sidebar.tsx`): Home, Product Areas, Projects, Insights; Settings in footer. Active link detection uses `usePathname()`.

**RichTextEditor** (`src/lib/components/RichTextEditor.tsx`): Wraps Tiptap with `useEditor()` + `EditorContent`. Accepts and emits Tiptap JSON doc format (`{ type: "doc", content: [...] }`). The research plan page uses this component.

**Modal** (`src/components/Modal.tsx`): Generic modal wrapper. Used for create/edit dialogs across pages.

---

## 9. Multi-Tenancy & Data Boundaries

**Project scoping is the primary isolation boundary.** Enforce it in every route that touches project-owned data:

- Insights: verify `insight.projectId === params.id` before returning or modifying.
- Insights creation: verify `report.projectId === params.id` (report must belong to same project).
- Chat: all messages stored with `projectId`, retrieval always filtered by `projectId`.
- Research plan: keyed by `projectId` (unique FK).
- There is currently **no authentication middleware** — auth is not enforced at the HTTP layer yet. Do not build features that depend on session-based auth existing. When auth is added, it will use `next-auth` with the `@auth/prisma-adapter`.

---

## 10. Engineering Conventions

### Error responses
- `400` — Invalid params or body (include `{ error, issues }` from Zod flatten)
- `404` — Entity not found
- `409` — Uniqueness conflict (e.g., duplicate researcher email)
- `500` — Unexpected internal error

All route handlers wrap `POST`/`PATCH` in `try/catch` and return `500` on unhandled errors. `GET` handlers do not use try/catch unless the query can throw for a known reason.

### Transactions
Use `db.$transaction(async tx => { ... })` when multiple writes must be atomic. The research plan upsert + revision write is the canonical example.

### Prisma import
Always import `db` from `@/lib/db`. The generated client is at `prisma/generated/client` (non-default output path). The `db.ts` singleton pattern prevents connection exhaustion in Next.js dev hot-reloads.

### Passwords
- Hash with `bcrypt.hash(password, 12)` on write.
- Verify with `bcrypt.compare(plain, hash)`.
- `passwordHash` is **never** included in any `select` clause returned to clients.

### No test files currently exist
There are zero `*.test.ts` files. When adding features that touch data integrity, auth, or project boundaries, add minimal tests. The codebase uses `tsx` for scripts; Jest or Vitest would need to be added as a devDependency.

---

## 11. Development Commands

Run from `web/` directory:

```sh
npm run dev           # Start Next.js dev server (default port 3000)
npm run build         # Production build
npm run lint          # ESLint (eslint-config-next)
npx tsc --noEmit      # Type-check without emitting

npm run db:generate   # Regenerate Prisma client after schema changes
npm run db:push       # Push schema to DB (dev only, no migration file)
npm run db:migrate    # Create and apply a migration (generates migration file)
npm run db:studio     # Open Prisma Studio (browser DB GUI)
npm run db:seed       # Reset and seed the database
```

**After any `schema.prisma` change:** run `npm run db:generate` to regenerate the client, then `npm run db:push` (or `db:migrate` for tracked migration). The generated client at `prisma/generated/client` must stay in sync with the schema.

**Environment:** Create a `.env` file in `web/` with at minimum:
```
DATABASE_URL="file:./dev.db"
```

---

## 12. What Has Been Built (Phase History)

| Phase | Feature |
|---|---|
| 1 | Baseline: Researcher, ProductArea, Project, Report CRUD; file upload/serve |
| 2 | Project start/end dates; ResearchPlan rich-text editor (Tiptap); `lastEditedById` tracking |
| 3 | `ResearchPlanRevision` model; plan save writes revision snapshot in transaction; history endpoint + UI load-in-editor |
| 4 | `ProjectInsight` CRUD; project-scoped insight creation (enforces same-project report); human review workflow (approve/revise/reject) via PATCH |
| 5 | Per-project chat assistant; in-context RAG (no vector DB); chat history persisted in `ChatMessage`; `DocumentChunk` model scaffolded for future vectors |

Vector search (`DocumentChunk`) is scaffolded in the schema but **not yet wired up**. The current chat uses direct DB queries.

---

## 13. Things to Avoid

- Do not introduce `uuid` validation for entity IDs — they are CUIDs.
- Do not create `tailwind.config.js` — Tailwind v4 doesn't use it.
- Do not use synchronous `context.params` in route handlers — always `await context.params`.
- Do not add inline Zod schemas in route files — put them in `validation.ts`.
- Do not return `passwordHash` in any API response.
- Do not perform cross-project data reads — always filter by `projectId` where applicable.
- Do not import from `@prisma/client` directly — import `db` from `@/lib/db` or types from `prisma/generated/client`.
- Do not run destructive DB operations (`DROP`, bulk delete) without a seed/rollback path.
- Do not add features that assume vector search is operational — it is not yet implemented.
