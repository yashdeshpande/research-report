# Research Repository Web App

This app supports a research team workflow for Product Areas, Projects, Reports, and project planning.

## Current Phase Coverage

- Phase 1: Core workflow is implemented (Product Areas, Projects, Reports, CRUD, safe delete checks).
- Phase 2: Implemented (project start/end dates, project Research Plan rich-text editor, last-editor tracking).

## Tech Stack

- Next.js App Router
- Prisma + PostgreSQL
- Zod request validation
- Tiptap editor for Research Plan rich text

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Set environment variables in `.env`:

```bash
DATABASE_URL="postgresql://..."
```

3. Generate Prisma client:

```bash
npm run db:generate
```

4. Apply schema to local database:

```bash
npm run db:push
```

5. Start the app:

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
	"researcherId": "<researcher-uuid>"
}
```

- Validates payload with Zod.
- Verifies project and researcher exist.
- Upserts research plan content and updates `lastEditedById`.

## Manual Test Checklist

1. Create at least one Product Area, one Project, and one Researcher record in your local DB.
2. Open Project details, set Start Date and End Date, and save.
3. Confirm invalid date range (end before start) is rejected.
4. Open Research Plan from Project details.
5. Enter rich text, provide an Editor Researcher ID, and click Save.
6. Refresh and confirm content persists.
7. Confirm last-edited metadata updates after save.
8. Confirm invalid project ids and invalid payloads return safe errors.

## Verification Commands

```bash
npm run lint
npx tsc --noEmit
npm run build
```
