# KNOWN_LIMITATIONS.md — RezervoNo

> Honest inventory of technical debt, known issues, and scalability concerns
> derived from the code and merge history. Items marked **(uncertain)** need
> confirmation against the running environment.

---

## 1. Deployment / Build

- **Front-end Vercel wiring is not in the repo.** After the design-system
  refactor, `apps/*` use absolute asset paths and there is no root `vercel.json`
  wiring the three front-ends. Each app must be configured as its own Vercel
  project with its own **Root Directory** (`apps/customer`, `apps/business`,
  `apps/company`). This is a dashboard task, not code. **(follow-up)**
- **`prisma migrate deploy` is unusable as-is.** The `prisma/migrations/manual/`
  folder is not a valid Prisma migration dir, so `migrate deploy` fails with
  **P3015**. CI uses `prisma db push` + a `psql` loop; production applies schema
  out-of-band. **The Docker `docker-entrypoint.sh` runs `migrate deploy`** —
  verify it tolerates/handles `manual/` for self-host, or it may fail on boot.
  **(caution)**
- **Manual migrations are forward-only** and must be committed the instant they
  are applied (past DB↔schema drift required the `022` reconciliation).

## 2. Frontend

- **Design system is duplicated, not packaged.** `shared/css/*` + `shared/js/icons.js`
  are copied into every app (`apps/*`, `demo-mvp/*`). A change must be propagated
  to all copies by hand; there is no sync/build step. Risk of drift.
- **`standalone/` and `demo-mvp/` are generated/duplicate frontends.** They can
  fall out of sync with `apps/*`. `standalone/` should be regenerated via
  `tools/build-standalone.py` after front-end changes. **(the standalone bundle
  works because module state is merged into one scope; the ES-module apps use
  setter functions instead — keep both patterns consistent.)**
- **No client-side test coverage beyond E2E.** Only Playwright E2E covers the
  customer app; business/company panels have **no automated tests**. **(uncertain)**
- **`apps/business/src-v2/*.jsx`** (a React dashboard) appears to be a
  preview/experiment not wired into the shipping vanilla-JS panel. Clarify its
  status or remove to avoid confusion. **(uncertain)**
- **Service-worker cache discipline is manual.** Forgetting to bump
  `CACHE_VERSION` ships stale assets to returning users.

## 3. Backend / Domain

- **No repository layer.** Services call Prisma (and raw SQL) directly. This is
  pragmatic but couples domain logic to the ORM and complicates unit testing
  (mitigated in the reservation engine via a DI port).
- **Reservation status enum carries legacy values** (`arrived`,
  `cancelled_by_user`, `cancelled_by_restaurant`) kept for backward compat with
  existing rows — a source of subtle bugs if new code forgets them. The
  "active-status set" (`reservation-status.ts`) must stay complete.
- **Queue is Postgres-based.** Great for consistency/idempotency, but every
  drain is a DB write burst; at very high job volume a dedicated broker
  (Redis/SQS) may be warranted.
- **Cron fan-out endpoints do bounded-concurrency loops** over all restaurants
  (e.g. waitlist maintenance). At large tenant counts these need pagination /
  work-sharding to stay within request timeouts. **(scalability)**

## 4. Security (open recommendations)

- **Token revocation** may not be fully wired (a `jti` exists for it; access
  tokens are short-lived). Verify logout and `Staff.isActive=false` promptly
  invalidate sessions. **(uncertain)**
- **`localStorage` tokens** are XSS-exposed; every front-end `innerHTML` sink
  must escape user data (`esc()`).
- **RLS is partial** (started in `manual/023`); not all tenant tables have it.
- **Rate-limit fail-open** (when Redis is down) reduces to a per-process
  in-memory floor — multi-instance deployments then allow `max × instances`.

See [SECURITY.md](./SECURITY.md) §11 for the full list.

## 5. Data / Migrations

- **`schema.prisma` had real drift from the live DB** (fields/FKs that existed
  only in Postgres) — reconciled in `022`, but the pattern (raw-SQL tables added
  without Prisma models) can recur. Keep every table represented in the schema.
- **Partitioning** (`reservations`, migration `011`) requires ongoing partition
  creation via the monthly `ensure-partitions` cron — a missed run eventually
  breaks inserts. **(operational)**

## 6. Observability

- **Some fail-open paths are log-only** (rate-limit degradation, auto-bans).
  Add alerting so silent Redis outages are noticed.
- Metrics endpoint is public unless `METRICS_TOKEN` is set — set it in prod.

## 7. Testing / CI

- **`test` job depends on `--test-force-exit`** because a module opens a Redis
  client that keeps the process alive; ideally the queue/redis client should be
  closable in tests (explicit teardown) rather than force-exiting.
- **E2E fully mocks the API** — it validates the customer UI/flows but not the
  real API contract end-to-end. Consider a small contract/integration suite
  against a real backend.
- No `e2e/package-lock.json` committed yet (CI note) — E2E installs are
  unpinned.

## 8. Scalability Concerns (summary)

| Area | Concern | Mitigation present | Further work |
|---|---|---|---|
| DB connections | Pool exhaustion under load | Pooled URL + `DB_CONNECTION_LIMIT`; optional read replica | Tune per traffic; add PgBouncer if not on Supabase pooler |
| Reservations | Double-booking under concurrency | Redis slot lock + exclusion constraint + serialization retry | Load-test hot restaurants; watch `CONCURRENCY_RETRY` rate |
| Job queue | DB write pressure | SKIP LOCKED, priority, backoff, DLQ | Broker if volume grows |
| Cron fan-out | Per-tenant loops | Bounded concurrency | Shard by tenant / paginate |
| Redis outage | Rate-limit weakens | In-memory floor | Alert + HA Redis / cluster |
| Front-end DS | Copy drift | — | Package/sync the design system |

## 9. Product / Feature Gaps (as observed)

- Chat is **polling-based** (no websockets) — fine for MVP, higher latency/load
  at scale.
- Payments are Zarinpal-only; refund flow exists as a `DepositStatus.refunded`
  state but the automated refund path is **(uncertain)**.
- Several restaurant-panel RBAC permission mappings are inferred; confirm the
  exact `permission` key per route against the handlers.
