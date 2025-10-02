# Repository Guidelines

## Project Structure & Module Organization
- Monorepo driven by npm workspaces with `apps/agent` (LangGraph runtime) and `apps/web` (Next.js proxy UI).
- Agent entry flows from `apps/agent/src/agent.ts`; shared wiring and tool utilities live under `apps/agent/src/utils`.
- Next.js API routes reside in `apps/web/src/app/api/[..._path]/route.ts`, while UI pages live under `apps/web/src/app`.
- Place new helpers beside their consumers, keep filenames lowercase, and mirror source folders with `__tests__` directories for specs.

## Build, Test, and Development Commands
- `npm install` once at the repo root to hydrate all workspace dependencies.
- `npm run dev --workspaces` starts both the agent and web experiences; focus on one via `npm run dev --workspace apps/agent` or `apps/web`.
- `npm run build --workspace <package>` emits production bundles; `npm run typecheck --workspace apps/agent` enforces strict typing.
- Run formatters and linters from the root with `npm run format` and `npm run lint` before pushing.

## Coding Style & Naming Conventions
- All code is TypeScript with ES modules, two-space indentation, trailing commas, camelCase identifiers, and PascalCase types/interfaces.
- Use Biome for formatting and linting; avoid mixing stylistic edits with behavior changes.
- Prefer imperative verb names for async helpers (e.g., `loadDefaultTools`) and ensure components and files stay lowercase and purposeful.

## Testing Guidelines
- Co-locate tests in `__tests__` folders; name files `<name>.test.ts` to mirror their targets.
- Lean on `npm run typecheck --workspace apps/agent` as the minimum gate until richer suites land.
- Adopt Vitest or Jest for logic-heavy modules and target 80% statement coverage as suites mature.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`feat:`, `fix:`, `chore:`) with subjects under 72 characters and reference validation commands.
- Pull requests should list executed checks, link issues (`Refs #123`), and include screenshots or payload samples for UI/API changes.
- Request reviewers early and keep discussions centered on observable behavior and regression risk.

## Security & Configuration Tips
- Copy `apps/agent/.env.example` to `.env`; provide `GOOGLE_API_KEY` or `GOOGLE_GENAI_API_KEY` locally without committing secrets.
- Update `langgraph.json` when adjusting graph nodes or tool catalogs so `langgraph dev` and `langgraph build` stay in sync.
- Favor deployment secret stores for production credentials and review new dependencies for compliance with license and security policies.
