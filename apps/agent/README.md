# Deep Agent Runtime

The `apps/agent` workspace hosts the LangGraph runtime that powers Deep Agents. It ships a Gemini-backed research agent, wires specialist subagents, and layers in tool adapters so long-form research requests can combine planning, browsing, critique, and artifact management.

## What Sets This Agent Apart
- **Graph-native collaboration**: Planner, researcher, and critic subagents run inside a shared LangGraph state so todos, files, and critiques stay synchronized without extra orchestration glue.
- **Filesystem-backed memory**: Research artifacts land in a structured virtual filesystem (`/research/plans`, `/research/searches`, `/research/critiques`) with deterministic paths, giving every phase durable context, auditability, and resumability that ordinary chat-bound agents lack.
- **Deliberate escalation**: The planner enforces artifact gates before research or critique can proceed, preventing runaway browsing loops and ensuring each subagent builds on verified groundwork.
- **Toolbelt fusion**: Built-in middleware composes Gemini, MCP servers (Copilot, DeepWiki, Sequential Thinking), and HTTP search adapters (Tavily, Exa) with deduping and retry semantics, giving each subagent a curated, typed toolset.
- **Resilient runtime**: Middleware guards enforce timeouts, classify retryable failures, and offer minimal fallback tools so requests still complete when optional integrations degrade.
- **Instructional control**: Core prompts live alongside environment-driven overrides, enabling operators to layer domain-specific guidance without forking the runtime.
- **Proxy-ready contract**: Shared types and auth helpers let the Next.js UI stream the same annotated state the graph uses, making the experience consistent across transports.

## Architecture Overview

### Runtime entrypoints
- `src/main.ts` lazily boots the Deep Research graph, normalizes uploaded files, and falls back to a minimal toolset if advanced integrations fail.
- `langgraph.json` declares the exported graph (`deepAgentGraph`) for `langgraph dev`/`langgraph build`.
- `src/auth.ts` and `src/types/` define the contracts shared with the Next.js proxy.

### Deep Agent Core (experimental)
- `src/deep-agent-experimental/` preserves parity with the established runtime design while staying compatible with LangGraph's stable `createReactAgent` helper.
- `agent.ts` merges builtin middleware tools (filesystem, todo management, task routing) with caller-provided tools and instructions, and optionally attaches subagents.
- `sub-agent.ts` builds the `task` tool: it dispatches to registered subagents, ensures planner artifacts exist, and synchronizes outputs back into the shared state.
- `middleware/stable.ts` holds the filesystem/todo tools plus message modifiers that teach the model how to use them.
- `state.ts` defines the annotated LangGraph state channels (`messages`, `todos`, `files`) so tool invocations can update the mock filesystem and todo list exactly the way the runtime expects.

### Deep Research Program
- `src/agents/deep-research/agent.ts` instantiates the Deep Research agent with low-temperature Gemini, instructions, and the merged toolbelt.
- `nodes.ts` registers three subagents:
  - `planner-agent` writes structured plans, todos, and cached path metadata under `/research/plans/`.
  - `research-agent` executes Tavily/Exa web searches, saves raw findings to `/research/searches/` and `/research/findings/`.
  - `critique-agent` runs fact-checking and structural critique tools, persisting reviews in `/research/critiques/`.
- `middleware/*` provides typed tool collections for each subagent (planner, research, critique) and helper utilities such as plan writers and shared path constants.
- `tools.ts` composes middleware tools with MCP-provided tools, filters reserved names, and deduplicates instances so downstream LangGraph wiring stays stable.

### Tooling & Integrations
- `src/utils/` contains service adapters and shared runtime helpers:
  - `tavily/` and `exa/` wrap external search APIs with retry/backoff (`withRetry`), timeout guards, and typed responses.
  - `mcp.ts` orchestrates Multi-Server MCP clients, caches tool descriptors per server, and auto-loads Sequential Thinking, DeepWiki, GitHub Copilot (when a PAT is present), and optional env-configured servers.
  - `errors.ts` standardizes retryable errors, user-facing formatting, and safe tool execution fallbacks.

A legacy `src/deep-agent/` directory remains for the previous runtime; new features land in `deep-agent-experimental` and will supersede the legacy stack once stabilized.

## Directory Reference

| Path | Purpose |
| --- | --- |
| `src/main.ts` | LangGraph entrypoint, agent bootstrap, file normalization helpers. |
| `src/agents/` | Agent factories (`deep-research`, `code-assistant` placeholder) and shared prompts/middleware. |
| `src/deep-agent-experimental/` | Experimental core runtime: agent creation, middleware, state annotations, task tool. |
| `src/utils/` | Service adapters (Tavily, Exa, MCP) and retry/error helpers. |
| `src/mcp/` | MCP client wiring, server config parsing, and type definitions. |
| `src/shared/` | Model factory (`createAgentModel`), shared types, and request payload helpers. |
| `src/types/` | Public TypeScript contracts shared with the proxy/web app. |
| `__tests__` folders | Co-located Vitest suites for middleware, tools, and state reducers. |
| `dist/` | Build output generated by `npm run build --workspace apps/agent`. |

## Prerequisites

- Node.js 20+
- npm 10+
- Gemini access (`GOOGLE_API_KEY` or `GOOGLE_GENAI_API_KEY`)
- Optional: Tavily, Exa, GitHub Copilot, or custom MCP credentials depending on the tools you enable

Run `npm install` once at the monorepo root to hydrate all workspaces.

## Environment Configuration

Copy the example file and populate values before running locally:

```bash
cp apps/agent/.env.example apps/agent/.env
```

Key variables:

- `GOOGLE_API_KEY` / `GOOGLE_GENAI_API_KEY` – Gemini credentials (required).
- `GOOGLE_GENAI_MODEL` – Override the default `gemini-2.5-flash` model.
- `TAVILY_API_KEY` – Enables the Tavily search tool.
- `EXA_API_KEY` – Enables Exa document retrieval.
- `GITHUB_PAT` – Unlocks the GitHub Copilot MCP server (repo + read:org scopes recommended).
- `MCP_*` variables – Configure additional MCP servers loaded by `src/mcp/config.ts`.
- `DEEP_AGENT_INSTRUCTIONS` – Override bundled research instructions without editing source.
- `LANGGRAPH_AUTH_*` – Auth settings shared with the proxy UI (issuer, audience, secret).

## Development & Build Commands

From the repository root:

- `npm run dev --workspace apps/agent` – Start the LangGraph dev server with hot reload.
- `npm run typecheck --workspace apps/agent` – Strict TypeScript gate (recommended before commits).
- `npm run build --workspace apps/agent` – Emit production bundles to `dist/`.
- `npm run build:server --workspace apps/agent` – Build the LangGraph server bundle declared in `langgraph.json`.
- `npm run lint --workspace apps/agent` / `npm run format --workspace apps/agent` – Biome linting and formatting checks.

## Request Lifecycle

1. Incoming requests flow through `invokeDeepAgent` in `src/main.ts`, which coerces messages/files into LangChain-compatible objects.
2. `createDeepResearchAgent` provisions the runtime via `createDeepAgent`, attaching middleware tools, subagents, and instruction prompts.
3. The generated LangGraph agent manages todos/files, dispatches planner/research/critique subagents through the `task` tool, and streams tool results back into state.
4. Tool invocations leverage `src/utils/*` adapters, which handle retries, rate limits, and MCP connections before returning structured results to the graph.

## Extending the Runtime

- **Introduce new tools**: add the adapter under `src/utils/`, export a typed tool from the relevant middleware module, then aggregate it in `agents/<agent>/tools.ts`.
- **Add subagents**: author a `SubAgent` definition in `src/agents/<agent>/nodes.ts`, register specialized tools, and update the factory to include the subagent.
- **Customize prompts**: tweak instruction files in `src/agents/<agent>/prompts.ts` or supply overrides via environment variables.
- **Support new MCP servers**: declare environment variables consumed by `src/mcp/config.ts`; the loader will attach them (with retries and caching) at startup.

## Testing & Quality

- Unit and integration specs live beside their targets in `__tests__/` directories (Vitest).
- Run `npm run typecheck --workspace apps/agent` as a minimum quality gate; add Vitest coverage for complex middleware and tool adapters.
- Prefer adding deterministic fixtures for planner/research tool behavior to keep regression detection simple.

## Troubleshooting

- **MCP startup delays**: `src/utils/mcp.ts` enforces 5s connection timeouts and caches failures; check environment variables or remote availability if tools are missing.
- **Rate limit or timeout errors**: surface through `errors.ts` helpers—retryable failures are retried automatically, but repeated failures propagate as `DeepAgentError` subclasses.
- **Missing planner artifacts**: the `task` tool blocks research/critique subagents until planner outputs exist; rerun the planner subagent via the task tool if you see `MissingArtifact` payloads.

The runtime will continue converging on the experimental core; expect incremental migrations from `src/deep-agent/` to `src/deep-agent-experimental/` as new capabilities harden.
