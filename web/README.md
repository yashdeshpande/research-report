# Research Repository Web App

This app supports a research team workflow for Product Areas, Projects, Reports, Insights, and project planning.

## Current Phase Coverage

- Phase 1: Core workflow is implemented (Product Areas, Projects, Reports, CRUD, safe delete checks).
- Phase 2: Implemented (project start/end dates, project Research Plan rich-text editor, last-editor tracking).
- Phase 3: Implemented (Research Plan edit history with revision snapshots and restore-in-editor flow).
- Phase 4: Implemented (project-scoped insights APIs, now surfaced through a dedicated repository insights area).
- Phase 5: Implemented (repository-wide assistant on Home plus repository insights browsing).

## Tech Stack

- Next.js App Router
- Prisma + SQLite (local file)
- Zod request validation
- Tiptap editor for Research Plan rich text

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Set environment variables in `.env`:

```bash
DATABASE_URL="file:./dev.db"
LLM_PROVIDER="ollama"
OLLAMA_BASE_URL="http://127.0.0.1:11434"
OLLAMA_CHAT_MODEL="llama3.1"
OLLAMA_EMBED_MODEL="nomic-embed-text"
QDRANT_URL="http://127.0.0.1:6333"
QDRANT_COLLECTION="research_chunks"
```

3. Generate Prisma client:

```bash
npm run db:generate
```

4. Apply schema to local database:

```bash
npm run db:push
```

5. Seed sample data (optional):

```bash
npm run db:seed
```

6. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Research Plan APIs (Phase 2)

### GET `/api/research-plans/:projectId`
- Validates project id.
- Verifies project exists.
- Returns the project research plan (or `null` if not created yet) with last editor info.

### PATCH `/api/research-plans/:projectId`
Request body:

```json
{
	"content": {
		"type": "doc",
		"content": [{ "type": "paragraph" }]
	},
	"researcherId": "<researcher-id>"
}
```

- Validates payload with Zod.
- Verifies project and researcher exist.
- Upserts research plan content and updates `lastEditedById`.
- Creates an immutable revision snapshot in `research_plan_revisions`.

### GET `/api/research-plans/:projectId/history?limit=15`
- Validates project id and query params.
- Returns recent revision snapshots including editor metadata.
- Default limit is 20, maximum is 100.

## Project Insight APIs (Phase 4)

### GET `/api/projects/:id/insights`
- Lists project-scoped insights with source report and reviewer metadata.

### POST `/api/projects/:id/insights`
Request body:

```json
{
	"content": "Insight text...",
	"generatedFromReportId": "<report-id>"
}
```

- Validates payload.
- Enforces that source report belongs to the same project.
- Creates an insight in `PENDING_REVIEW` status.

### PATCH `/api/projects/:id/insights/:insightId`
Request body:

```json
{
	"status": "APPROVED",
	"reviewedById": "<researcher-id>",
	"editorNotes": "Optional review rationale"
}
```

- Validates payload.
- Enforces project scope for the targeted insight.
- Updates status, reviewer, reviewed timestamp, and notes.

## Repository Insights APIs

### GET `/api/insights?query=&status=&projectId=&reportId=`
- Lists insights across the repository.
- Supports filtering by content query, status, project, and source report.
- Returns linked project and report metadata for navigation.

## Repository Assistant API (Phase 5)

### POST `/api/search/assistant`
Request body:

```json
{
	"message": "Search for checkout insights, reports, and related projects across the repository"
}
```

- Validates the freeform repository search request.
- Searches projects, reports, insights, and product areas.
- Returns both structured matches and an assistant response grounded in those matches.
- Calls configured LLM provider (default: Ollama).

## Indexing Pipeline (In Progress)

- Report creation and Research Plan save now enqueue async indexing jobs.
- Indexing jobs extract text, split into chunks, store plain chunks in `document_chunks`, and upsert embeddings to Qdrant.
- Global assistant search now uses hybrid retrieval (keyword matches + vector evidence snippets).

### Trigger indexing manually

```bash
npm run indexing:process
```

### Trigger indexing via API

`POST /api/indexing/process`

Request body:

```json
{
	"limit": 3
}
```

- `limit` is optional (default `2`, max `20`).

## Manual Test Checklist

1. Create at least one Product Area, one Project, and one Researcher record in your local DB.
2. Open Project details, set Start Date and End Date, and save.
3. Confirm invalid date range (end before start) is rejected.
4. Open Research Plan from Project details.
5. Enter rich text, choose an editor researcher, and click Save.
6. Confirm a new row appears in Recent Edit History.
7. Use Load In Editor on an older revision and save again.
8. Refresh and confirm content + history persist.
9. Confirm invalid project ids and invalid payloads return safe errors.
10. Open Home and ask the global assistant to search for projects, reports, and insights.
11. Confirm the assistant response and the match lists reflect repository data.
12. Open the dedicated Insights page and verify filtering by search text and status.
13. Open a Project detail page and confirm it links out to Reports and Insights instead of embedding insight review and chat.

## Verification Commands

```bash
npm run lint
npx tsc --noEmit
npm run build
```
