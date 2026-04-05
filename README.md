# Research Report Repository

A modern full-stack web application for managing research projects, reports, and insights with a local SQLite database.

## Project Structure

```
research-report/
├── web/                    # Next.js application
│   ├── src/
│   │   ├── app/           # App router pages and API routes
│   │   ├── lib/           # Utilities (db, validation)
│   │   └── components/    # React components
│   ├── prisma/            # Database schema and migrations
│   │   ├── schema.prisma  # Data model
│   │   ├── seed.ts        # Database seeding script
│   │   └── dev.db         # Local SQLite database
│   └── package.json       # Dependencies and scripts
```

## Tech Stack

- **Frontend**: React 19, Next.js 16, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite (local) with Prisma ORM
- **Validation**: Zod schemas

## Getting Started

### Prerequisites

- Node.js 20+
- npm or yarn

### Installation

```bash
cd web
npm install
```

### Database Setup

Push the schema to SQLite and seed with sample data:

```bash
npm run db:push      # Create database schema
npm run db:seed      # Populate with sample data
```

### Development

Start the development server:

```bash
npm run dev -- --port 3001
```

The app will be available at `http://localhost:3001`

## Available Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run db:generate` - Regenerate Prisma client
- `npm run db:push` - Sync schema with database
- `npm run db:migrate` - Create and execute migrations
- `npm run db:seed` - Populate database with seed data
- `npm run db:studio` - Open Prisma Studio

## Features

### Product Areas
- Organize research by product domain
- Search and filter by name or description
- Create new areas with owner assignment

### Projects
- Create projects under product areas
- Set start and end dates
- Track reports and insights per project
- Search across projects and areas

### Reports
- Upload research reports with metadata
- Track report status (DRAFT, PUBLISHED, ARCHIVED)
- Add notes and context to reports
- Search by title, file name, or project

### UI/UX
- Two-column responsive layout (form + list)
- Real-time search with result counter
- Sticky create forms for easy access
- Status badges and visual indicators
- Hover effects and smooth transitions

## Data Model

### Core Models
- **Researcher**: Users who create and manage content
- **ProductArea**: Domain-level organization
- **Project**: Research initiative under a product area
- **Report**: Research output/artifact
- **ProjectInsight**: AI-generated or reviewed insights
- **ResearchPlan**: Strategic planning for a project

## Project Status

Current version includes:
- ✅ Local SQLite database
- ✅ CRUD operations for areas, projects, reports
- ✅ Search functionality across all pages
- ✅ Modern responsive UI
- ⚠️ Research plan features (in progress)
- ⚠️ Insights management (planned)
- ⚠️ AI integration (planned)

## Known Issues

- Research plan CTA needs implementation
- Some detail page features incomplete
- AI context handling to be implemented

## Development Notes

The application uses:
- **Prisma** for type-safe database access
- **Zod** for runtime validation
- **Next.js API Routes** for backend endpoints
- **SQLite** for local development (easily switchable to PostgreSQL)

All ID validation is configured for CUID format to support SQLite.

## Contributing

When making changes:
1. Update the relevant models in `prisma/schema.prisma` if needed
2. Generate Prisma client: `npm run db:generate`
3. Run the application and test locally
4. Commit with descriptive messages

## Future Improvements

- [ ] User authentication
- [ ] Advanced research plan editor
- [ ] AI-powered insight generation
- [ ] Full-text search on reports
- [ ] Embedding and RAG capabilities
- [ ] Chat interface for research exploration
- [ ] Export reports to various formats
- [ ] Analytics and reporting dashboard
