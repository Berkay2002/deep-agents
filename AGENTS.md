# Repository Guidelines

## Project Structure & Module Organization
The monorepo uses npm workspaces with `apps/agent` for the LangGraph runtime and `apps/web` for the Next.js proxy UI. Agent flow entry lives in `apps/agent/src/agent.ts`, with shared wiring and tool helpers under `apps/agent/src/utils`. Web routes start in `apps/web/src/app/api/[..._path]/route.ts`, and UI pages reside under `apps/web/src/app`. Co-locate new helpers beside their consumers and keep filenames lowercase. Place tests in `__tests__` folders near the code they exercise.

## Build, Test, and Development Commands
Install dependencies once at the root: `npm install`. Run both workspaces during development with `npm run dev --workspaces`, or focus on a package via `npm run dev --workspace apps/agent`. Build artifacts using `npm run build --workspace <package>`. Type-check the agent with `npm run typecheck --workspace apps/agent`. Execute format and lint passes from the root using `npm run format` and `npm run lint`.

## Coding Style & Naming Conventions
All code is TypeScript with ES modules, two-space indentation, trailing commas, and camelCase function or variable names. Use PascalCase for types and interfaces, and imperative verbs for async helpers (e.g., `loadDefaultTools`). Keep filenames lowercase and purposeful (`agent.ts`, `route.ts`). Format and lint before committing; do not mix stylistic changes with behavioral updates.

## Testing Guidelines
Rely on `npm run typecheck --workspace apps/agent` as the baseline gate until workloads gain richer suites. Adopt Vitest or Jest when adding logic-heavy modules; name test files `<name>.test.ts` and mirror the source folder (e.g., `apps/agent/src/__tests__/agent.test.ts`). Target 80% statement coverage as suites grow and expose runnable scripts via `npm run test --workspace <package>`.

## Commit & Pull Request Guidelines
Follow Conventional Commit prefixes such as `feat:`, `fix:`, and `chore:` with subjects under 72 characters. Commits should explain intent and note validation commands. Pull requests need a short checklist of tests executed, linked issues using `Refs #123`, and screenshots or payload samples for UI or API changes. Tag reviewers early and keep discussions focused on observable behavior.

## Security & Configuration Tips
Copy `apps/agent/.env.example` to `.env` and supply `GOOGLE_API_KEY` or `GOOGLE_GENAI_API_KEY`; override `GOOGLE_GENAI_MODEL` only if needed. Never commit secrets; use local `.env` files and deployment secret stores. Update `langgraph.json` whenever graph nodes or tool catalogs change so `langgraph dev` and `langgraph build` stay aligned.
