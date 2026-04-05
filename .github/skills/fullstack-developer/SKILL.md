---
name: fullstack-developer
description: 'Build modern full-stack web applications with React/Next.js, Node.js APIs, and PostgreSQL/MongoDB. Use when implementing frontend features, backend routes, authentication, validation, database models, or deployment-ready web architecture.'
argument-hint: 'Describe the app/feature, stack choice, data model, and constraints.'
user-invocable: true
---

# Full-Stack Developer

## Outcome
Produce production-ready, type-safe full-stack features with clear structure, complete code, dependencies, environment configuration, and run instructions.

## When to Use
- Building end-to-end web features (UI + API + database)
- Creating React/Next.js pages and reusable components
- Implementing REST/GraphQL endpoints in Node.js/TypeScript
- Designing schemas and data access with Prisma/PostgreSQL/MongoDB
- Adding authentication, authorization, validation, and error handling
- Preparing deployment and CI basics

## Inputs to Collect
- Product goal and user flow
- Preferred stack: Next.js vs React+Node, REST vs GraphQL
- Data/storage requirements and chosen database
- Auth requirements and roles/permissions
- Non-functional constraints: performance, security, deployment target

## Workflow
1. Define architecture and boundaries.
2. Design data model and API contracts.
3. Implement backend handlers with validation and error responses.
4. Implement frontend UI/state with loading and error states.
5. Wire frontend-to-backend integration.
6. Add security, performance, and observability basics.
7. Verify with tests/manual checks and produce setup/deploy instructions.

## Decision Points
- Framework choice:
  - Use Next.js App Router for integrated frontend+API and SSR/SSG needs.
  - Use React + separate Node API when service boundaries are required.
- API style:
  - Use REST for straightforward resource-oriented endpoints.
  - Use GraphQL for complex client-driven data retrieval.
- Database:
  - Use PostgreSQL for relational integrity and complex joins.
  - Use MongoDB for flexible document-heavy data.
- State management:
  - Use React Query for server state.
  - Use Context/Zustand for local client state.

## Quality Criteria
- Type safety across frontend/backend boundaries
- Input validation on all write endpoints
- Consistent HTTP status codes and error shapes
- Proper loading/error/empty UI states
- Secure defaults: auth checks, sanitized input, parameterized queries
- Query efficiency: indexing, avoiding N+1 patterns
- Clear setup steps and environment variables documented

## Output Contract
When fulfilling a request, return:
1. File structure for all changed/created files
2. Complete code snippets (not partial pseudocode)
3. Required dependencies
4. Required environment variables
5. Local run/test/deploy steps

## Completion Checklist
- API endpoints validated and tested for happy + failure paths
- UI handles loading, success, empty, and error states
- Auth/authorization paths enforced
- Database schema + migrations in sync
- Build/lint/tests pass (or known gaps explicitly stated)
- Deployment notes included
