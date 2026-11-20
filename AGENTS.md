# Working on Hamsade

The municipality app is in `apps/municipality`. Use `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` for municipal work. The mock command boundary lives in `apps/municipality/domain`. Keep it independent of NestJS, Prisma and real integrations until the user explicitly changes the scope. See `docs/MUNICIPALITY.md`.

## Working on the FORGE baseline

Before editing, read `AGENTS.md`, `.ai/STATE.md`, and `.ai/NEXT.md`. Check Git status and the active milestone in `docs/ROADMAP.md`. Use the existing checkout for this isolated task. Keep changes scoped to the active milestone.

Next.js owns presentation in `apps/web`. NestJS owns authorization, business logic, and database access in `apps/api`. Share runtime configuration through `@forge/config` and derive the web API contract from Nest OpenAPI via `@forge/api-client`.

Keep Persian copy centralized, use RTL at the document root, store timestamps in UTC, and use logical CSS properties. Use strict TypeScript. Put secrets in the process environment or a local ignored `.env` file. Never push to main without explicit permission.

Run `pnpm setup --dev` on a clean checkout to start the original FORGE apps. Before handoff, run the affected checks in `docs/TESTING.md` and update all four files under `.ai/` with observed outcomes. Only mark milestones VERIFIED after meeting their acceptance criteria.

Use local mocks for external services until the user requests a live integration. Document each mock and its local test workflow in `docs/MOCKS.md`.
