# Research Repository Working Instructions

This repository is owned by a non-technical stakeholder. All implementations must prioritize safety, clarity, and long-term scalability.

## Core Principles

1. Prefer small, reversible changes over large rewrites.
2. Do not make destructive schema or data operations without a rollback path.
3. Validate all API inputs at the boundary using schema validation.
4. Protect multi-tenant boundaries: project-scoped data must not leak across projects.
5. Keep strong defaults: least privilege access, explicit authorization checks, and secure password handling.
6. Add tests with features that impact data integrity, authorization, or AI context handling.
7. Update docs when behavior changes so the owner can review outcomes without reading deep code.

## Engineering Defaults

1. Use PostgreSQL + Prisma for relational integrity and maintainable migrations.
2. Keep AI providers abstracted behind a stable interface so local and cloud models are swappable.
3. Treat generated AI insights as draft content requiring human review before publication.
4. Scope chatbot retrieval to current project only and favor approved insights over draft insights.
5. Use idempotent background jobs for insight generation and embedding pipelines.

## Pull Request Quality Bar

1. Include a short summary of user-visible behavior changes.
2. Include migration and rollback notes for database changes.
3. Include verification steps for auth, permissions, and project data boundaries.
4. Keep naming consistent with domain language: Researcher, Product Area, Project, Report, Insight.
