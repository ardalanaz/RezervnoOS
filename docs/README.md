# RezervoNo — Documentation

Canonical technical documentation for the RezervoNo platform, generated from the
merged repository. Intended for onboarding senior engineers.

## Read in this order

1. [PROJECT_KNOWLEDGE.md](./PROJECT_KNOWLEDGE.md) — overview, goals, stack, repo
   layout, workflow, conventions, branch strategy, build & CI/CD.
2. [ARCHITECTURE.md](./ARCHITECTURE.md) — system diagram, frontend/backend,
   data flow, auth/authorization, request lifecycle, caching, queue, logging,
   monitoring, external services.
3. [DATABASE.md](./DATABASE.md) — tables, relationships, ER diagram, migrations,
   indexes, constraints, transactions, soft-delete, future notes.
4. [API_REFERENCE.md](./API_REFERENCE.md) — every endpoint (route, method, auth,
   body, response, errors, examples).
5. [FRONTEND.md](./FRONTEND.md) — structure, routing, layout, components, state,
   data fetching, forms, validation, UI patterns, theme.
6. [BACKEND.md](./BACKEND.md) — controllers, guards, services, utilities, jobs,
   configuration, dependency graph.
7. [DEPLOYMENT.md](./DEPLOYMENT.md) — local, Docker, Compose, Vercel, database,
   secrets, rollback.
8. [ENVIRONMENT.md](./ENVIRONMENT.md) — every environment variable.
9. [SECURITY.md](./SECURITY.md) — authN/authZ, tokens, sessions, CSRF, XSS,
   SQLi, rate limiting, secrets, recommendations.
10. [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md) — tech debt, known issues,
    scalability, future improvements.

The root [README.md](../README.md) is the quick-start / operator entry point.

## Conventions in these docs

- Everything is based on the **current repository**; nothing is invented.
- Inferences that couldn't be fully verified are marked **(uncertain)**.
- Diagrams are Mermaid (render on GitHub).

## Historical / audit docs (context, not canonical)

`API-CONTRACT.md`, `FINAL-PRODUCTION-AUDIT.md`,
`FRONTEND-BACKEND-SECURITY-AUDIT-2026-07-21.md`, `PROJECT-AUDIT-HANDOFF*.md`,
`AUDIT-FIXES-*.md`, `CHAT-FEATURE-2026-07-20.md`, `SUPABASE-SECURITY.md`,
and the `design/` folder. These predate this documentation set and are kept for
history; where they conflict with the canonical docs above, the canonical docs
win.
