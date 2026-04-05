# Research Repository Web App

This app supports a research team workflow for Product Areas, Projects, Reports, and project planning.

## Current Phase Coverage

- Phase 1: Core workflow is implemented (Product Areas, Projects, Reports, CRUD, safe delete checks).
- Phase 2: Implemented (project start/end dates, project Research Plan rich-text editor, last-editor tracking).
- Phase 3: Implemented (Research Plan edit history with revision snapshots and restore-in-editor flow).
- Phase 4: Implemented (Project Insights review workflow with status transitions and reviewer notes).
- Phase 5: Implemented (Project-scoped chat assistant with retrieval grounded in Research Plan + Insights).

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

## Project Chat APIs (Phase 5)

### GET `/api/projects/:id/chat`
- Lists project-scoped chat messages in chronological order.

### POST `/api/projects/:id/chat`
Request body:

```json
{
	"researcherId": "<researcher-id>",
	"message": "What are the strongest approved findings for this project?"
}
```

- Validates payload and project/researcher existence.
- Builds retrieval context from:
	- Approved insights (highest confidence)
	- Revised insights (caution)
	- Pending insights (draft/low confidence)
	- Research Plan content
- Calls configured LLM provider (default: Ollama).
- Persists both user and assistant messages as project-scoped chat history.

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
10. In Project Details, create a draft insight from a project report.
11. Review it as APPROVED / REVISED / REJECTED and verify reviewer metadata updates.
12. Ask a project chat question and verify response references approved insights first.

## Verification Commands

```bash
npm run lint
npx tsc --noEmit
npm run build
```
