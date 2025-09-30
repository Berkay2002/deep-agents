# Deep Agent Runtime

The `apps/agent` workspace hosts the LangGraph runtime that powers Deep Agents. It stitches together Google Gemini models, shared tools, and specialized subagents so the system can reason over user prompts and optional file attachments.

## Project Layout

- `src/agent.ts` – Entry point that creates the Deep Agent graph, configures the Gemini model, and exposes the LangGraph server export.
- `src/utils/tools.ts` – Loads the default LangChain tools (Tavily, file helpers, etc.) and configures optional MCP servers.
- `src/utils/nodes.ts` – Defines subagent nodes and default research instructions consumed by the graph.
- `src/utils/state.ts` – Shapes the run input and file data that flow through the agent.
- `langgraph.json` – Declares the build output and `.env` file consumed by the LangGraph CLI.

## Prerequisites

- Node.js 20+
- npm 10+
- Access to the Google Generative AI API (Gemini)

## Environment Variables

Create a `.env` file by copying `.env.example` and filling in the relevant keys:

```bash
cp .env.example .env
```

Key settings include:

- `GOOGLE_API_KEY` or `GOOGLE_GENAI_API_KEY` – Required to authenticate with Gemini.
- `GOOGLE_GENAI_MODEL` – Optional override for the default `gemini-2.5-flash` model.
- `TAVILY_API_KEY` – Optional key to enable Tavily search integration.
- `DEEP_AGENT_INSTRUCTIONS` – Custom top-level instructions if you want to replace the bundled research prompt.
- `LANGGRAPH_SERVER_TOKEN` – Token used when deploying to LangGraph Cloud.

Refer to the inline comments in `.env.example` for additional MCP server guidance.

## Development Workflow

Install dependencies from the monorepo root (`npm install`) and then use the following commands within this workspace:

- `npm run dev --workspace apps/agent` – Start the LangGraph development server with hot reload.
- `npm run typecheck --workspace apps/agent` – Run TypeScript type checking without emitting output.
- `npm run build --workspace apps/agent` – Compile TypeScript to `dist/` for production or LangGraph packaging.
- `npm run build:server --workspace apps/agent` – Generate LangGraph server artifacts using the CLI.

The CLI commands rely on `langgraph.json` to locate the compiled graph export (`deepAgentGraph`) and environment file.

## Customization Tips

- Update `src/utils/tools.ts` to add or remove LangChain tools and MCP servers.
- Adjust `src/utils/nodes.ts` to register additional subagents or tweak routing logic.
- Override the default agent instructions via the `DEEP_AGENT_INSTRUCTIONS` environment variable when deploying specialized behaviors.

After making changes, rebuild or restart the dev server to ensure the graph reflects the latest configuration.
