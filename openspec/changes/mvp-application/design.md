## Context

The frontend is initialized with React 19, TypeScript, Vite, Tailwind CSS v4 and shadcn/ui (Base UI style). The backend and database are entirely missing. The app runs on a VPS via Docker Compose with separate containers for frontend, backend and PostgreSQL.

## Goals / Non-Goals

**Goals:**
- Implement complete full-stack application with auth, daily logs, dashboard, history, analytics and AI insights
- Implement mobile-first UI-approach for screen design
- Establish clean API contract between frontend and backend
- Support deployment via Docker Compose on a VPS
- Isolate LLM provider behind an abstraction so it can be swapped without changing app logic
- Run all statistical calculations server-side before sending context to LLM

**Non-Goals:**
- AI Chat feature (staged as future development per README §7)
- Detailed sleep tracking (duration, phases), detailed activities/meals — these are explicitly out of scope for MVP per README §18
- Domain layer extraction — use flat module organization on first pass
- Microservices architecture — single Node.js backend process
- User roles / multi-user support — single user per account at this stage

## Decisions

### 1. Authentication: JWT tokens stored in httpOnly cookies

**Decision:** Use JSON Web Tokens (JWT) stored in `httpOnly` cookies rather than localStorage or Authorization header.

**Rationale:** httpOnly cookies prevent XSS-based token theft, which is simpler and safer than managing tokens in client storage. For a personal wellness app where there is only one user per browser session, this approach minimizes complexity. Cookies are automatically sent with requests, removing the need for explicit Authorization headers on every call.

**Alternatives considered:**
- **Authorization header bearer tokens** — more common for REST APIs but requires manual management in axios/fetch config and is vulnerable to XSS if tokens leak into storage.
- **Session-based auth with server-side sessions** — adds Redis dependency; unnecessary complexity for a single-user app.

### 2. Backend framework: Express.js

**Decision:** Use Express as the HTTP framework for the Node.js backend.

**Rationale:** Simple, well-understood, no unnecessary abstractions. The README explicitly recommends "простой backend без избыточной архитектуры" (simple backend without excessive architecture). Express fits this requirement.

**Alternatives considered:**
- **Fastify** — faster, built-in schema validation; worth considering if performance becomes an issue.
- **Hono** — lighter weight, edge-compatible; overkill for VPS deployment.

### 3. Database access: Prisma ORM

**Decision:** Use Prisma as the ORM for PostgreSQL interaction.

**Rationale:** Strong TypeScript integration gives compile-time type safety for all database queries. Migrations are declarative and version-controlled. Query builder is sufficient for aggregation, filtering, and grouping needed by analytics. Zod will be used for request body validation at the API boundary.

**Alternatives considered:**
- **raw SQL with knex** — fine-grained control but loses type safety and migration DX.
- **TypeORM** — more complex decorators-based approach; unnecessary for this scale.

### 4. Password hashing: bcrypt

**Decision:** Use `bcrypt` for hashing passwords with salt rounds = 10–12.

**Rationale:** Battle-tested, compatible with Prisma's auth helpers. The recommended cost factor balances security with acceptable latency (~50ms per operation).

### 5. Analytics calculation: pure JavaScript/TypeScript functions

**Decision:** All statistical analysis (averages, correlations, best/worst days, relationships) SHALL be implemented as pure TypeScript functions operating on query results. These results are then formatted into structured objects suitable for both direct display and LLM prompting.

**Rationale:** This keeps statistical logic deterministic, testable, and independent of the LLM. The analytics spec explicitly forbids LLM from computing statistics. Calculations include: averages with rounding to 1 decimal, split comparisons (≥ 4 vs < 4), top/bottom rankings, trends detection.

### 6. LLM isolation: Provider interface pattern

**Decision:** Define an interface (or abstract class) called `LLMProvider` that the AI module depends on. Default implementation wraps OpenAI SDK (or equivalent). Configuration comes from environment variables (`LLM_API_KEY`, `LLM_MODEL`).

```
backend/src/modules/ai/llm-provider.ts       // interface definition
backend/src/modules/ai/openai-provider.ts    // default implementation
backend/src/modules/ai/context-builder.ts    // prepares analytics data for LLM
backend/src/modules/ai/insights-service.ts   // orchestrates context → LLM → parse response
```

**Rationale:** Changing the LLM provider (e.g., from OpenAI to Anthropic, or switching models) only requires implementing the interface and updating configuration — zero changes to `insights-service.ts`.

### 7. Frontend state management: React Query (TanStack Query)

**Decision:** Use TanStack Query for server state management (fetching, caching, syncing daily logs, analytics and insights). Local form state uses React hooks + zod resolver.

**Rationale:** Eliminates boilerplate manual fetching/loading/error handling. Provides built-in cache invalidation (e.g., after saving a daily log, invalidate dashboard and energy chart queries). Integrates cleanly with zod for runtime validation.

**Alternatives considered:**
- **SWR** — lighter but less feature-complete for complex invalidation strategies.
- **Raw axios + useState** — more code, no deduplication or automatic refetching.

### 8. Charts: Recharts

**Decision:** Use `recharts@3.x` for all visualizations (energy line chart on dashboard, multi-line comparison chart in analytics).

**Rationale:** Already listed in the tech stack (INIT.md). Compatible with Tailwind styling. Supports area, line, bar charts natively.

### 9. Project structure: Flat modules without domain layer

**Decision:** Follow README §13 exactly — `frontend/src/features/` for UI features, `backend/src/modules/` for backend modules. No `/domain` directory at this stage.

**Rationale:** Explicitly recommended in README: "На первом этапе не выделять отдельный domain/ слой." Extract later if complexity demands it.

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| LLM API costs / rate limits | Cache generated insights. Only regenerate when data freshness expires or user manually triggers. Use moderate-cost model (e.g., o3-mini or GPT-4o-mini). |
| Single-user bottleneck | The current design assumes one active user per login. If multi-user growth becomes needed later, add `user_id` lookups everywhere and tenant-aware constraints. Early enough since schema already has `user_id`. |
| CORS issues with Docker containers | Configure Express cors middleware during dev; set explicit Origin allowlist in production. Mount Next.js reverse proxy or use Nginx in Docker Compose to eliminate CORS entirely. |
| LLM response non-determinism | Validate LLM output against a JSON schema using Zod before rendering. Provide graceful fallback ("Недостаточно данных для выводов на данный момент"). Prompt engineering: specify exact JSON format strictly. |

## Exceptions & Decisions

### Confidence badge colors — exception from neutral palette rule  
The AI Insights page uses `green/yellow/orange` for `high/medium/low` confidence badges instead of the project-wide blue/slate neutral palette. This is an accepted exception because:
1. Confidence levels are universally understood by color semantics (green = good/high, yellow = medium, orange/red = low/caution)
2. Users immediately recognize the meaning without reading labels
3. The labels themselves are written in Russian next to each badge

## Migration Plan

Phase-based rollout aligned with README §18:

1. **Phase 1 — MVP**: Auth → Daily Logs CRUD → Dashboard → History. Deploy and verify each module independently.
2. **Phase 2 — Analytics**: Summary, charts, comparisons, energy relationships, best/worst days.
3. **Phase 3 — AI Insights**: LLM integration with precomputed analytics as context.

Deployment order in Docker Compose: postgres → backend → frontend. Backend health checks ensure DB connectivity before starting. Frontend serves static files via nginx in production.

Rollback: Since database migrations are additive (Prisma handles forward migrations), rollback is safe — just revert container images. Existing data remains intact in persistent volume.

## Open Questions

- Which specific LLM provider and model? OpenAI (GPT-4o-mini, recommended for structured output + cost) or Anthropic? Can be decided at implementation time.
- Should we run vite dev behind nginx in Docker or expose it directly? Direct exposure complicates CORS; adding nginx simplifies the setup. Can be decided at Phase 1 deployment.
- Should insights have a last-generated timestamp and auto-expire? Yes, store `last_insights_generated_at` in the user table or a separate table. Decide whether to check against the daily_logs table or maintain a dedicated row per user. Deferred to implementation.
