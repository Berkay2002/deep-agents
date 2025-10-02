# Deep Agent Runtime

The `apps/agent` workspace packages the LangGraph runtime that powers Deep Agents. It exposes a Gemini-backed research agent, orchestrates specialist subagents, and wires in shared tooling so deployments can answer long-form prompts with optional file context.

## Key capabilities

- **Deep research workflow** – `src/main.ts` lazily boots the `deepResearchAgent` export for LangGraph, falling back to a minimal agent if advanced tooling fails to load, and normalises uploaded files so the graph can accept attachments from the web UI or SDK clients.
- **Composable agent core** – `src/deep-agent/agent.ts` builds a ReAct-style LangGraph with shared middleware, task decomposition, and interrupt hooks so that additional agents can reuse the same foundation.
- **Specialist subagents** – `src/agents/deep-research` declares planner, researcher, and critique subagents that run through the task tool, enabling multi-step plans with automatic tool selection.
- **Tool orchestration** – `src/utils` provides adapters for Tavily, Exa, and MCP servers. The MCP integration automatically discovers Sequential Thinking, DeepWiki, optional GitHub Copilot, and environment-provided servers with retries and caching.
- **Configurable prompts and safety** – Default instructions live in `src/agents/deep-research/prompts.ts`, but you can replace them through environment variables without editing source.

## Directory guide

| Path | Purpose |
| --- | --- |
| `src/main.ts` | Entry point exported to LangGraph (`deepAgentGraph`) and file normalisation helpers. |
| `src/agents/` | Factories, prompts, and subagent definitions. Add new agent families here. |
| `src/deep-agent/` | Shared agent construction layer (state schema, middleware, interrupt hooks, task tool). |
| `src/utils/` | Tool clients and error helpers for Tavily, Exa, MCP, and runtime context. |
| `src/shared/` | Cross-cutting model helpers and TypeScript types for run inputs. |
| `langgraph.json` | Configuration consumed by `langgraphjs` for dev/build commands. |

## Prerequisites

- Node.js 20+
- npm 10+ (install dependencies from the monorepo root)
- Access to the Google Generative AI API (Gemini)

## Environment configuration

Copy the template and populate the required values:

```bash
cp apps/agent/.env.example apps/agent/.env
```

Key variables:

- `GOOGLE_API_KEY` or `GOOGLE_GENAI_API_KEY` – Required Gemini credentials.
- `GOOGLE_GENAI_MODEL` – Optional override (defaults to `gemini-2.5-flash`).
- `TAVILY_API_KEY` – Enables the Tavily search tool.
- `GITHUB_PAT` – Grants access to the optional GitHub Copilot MCP server (repo + read:org scopes).
- `DEEP_AGENT_INSTRUCTIONS` – Override the bundled research instructions without code changes.
- `LANGGRAPH_AUTH_*` – Shared secret, issuer, and audience for LangGraph auth (must align with the proxy app).

Sequential Thinking and DeepWiki MCP servers are enabled automatically; additional servers can be defined with the `MCP_*` environment helpers consumed by `src/mcp`.

## Development workflow

From the repository root after `npm install`:

- `npm run dev --workspace apps/agent` – Run the LangGraph development server with live reload.
- `npm run typecheck --workspace apps/agent` – Verify TypeScript types without emitting files.
- `npm run build --workspace apps/agent` – Compile to `dist/` for publishing or deployment packaging.
- `npm run build:server --workspace apps/agent` – Produce the LangGraph server bundle defined in `langgraph.json`.

Use `npm run lint --workspace apps/agent` and `npm run format --workspace apps/agent` for quality checks before committing.

## Extending the runtime

1. **Add tools** – Register new LangChain tools or MCP servers in `src/utils` and include them in the relevant agent factory.
2. **Create subagents** – Define additional `SubAgent` entries under `src/deep-agent` or `src/agents/<name>/nodes.ts`, then reference them when calling `createDeepAgent`.
3. **Custom instructions** – Supply `DEEP_AGENT_INSTRUCTIONS` in `.env` or edit the prompt modules for deeper changes.
4. **Expose new agents** – Implement a factory in `src/agents/<agent>/agent.ts` and export it from `src/agents/index.ts`; the router in `src/main.ts` is designed to select between them once re-enabled.

After modifying agent logic or tooling, restart the dev server or rebuild to ensure LangGraph picks up the changes.
