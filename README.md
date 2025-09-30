# Deep Agents Monorepo

This repository hosts the Deep Agents LangGraph runtime alongside a lightweight Next.js proxy used to surface the agent over HTTP. The project is organized as an npm workspace so each package can be developed and deployed independently while sharing tooling.

## Packages

- **apps/agent** – LangGraph agent that orchestrates subagents, default tools, and Gemini-based reasoning workflows.
- **apps/web** – Next.js 14 application that exposes API routes bridging web clients to the agent runtime.

## Prerequisites

- Node.js 20 or newer (matching the workspace `engines` field)
- npm 10+ (ships with Node 20)
- A Google Generative AI API key for agent execution (`GOOGLE_API_KEY` or `GOOGLE_GENAI_API_KEY`)

## Getting Started

1. Install workspace dependencies:

   ```bash
   npm install
   ```

2. Create environment files where needed. For the agent, copy `apps/agent/.env.example` to `apps/agent/.env` and provide the required Google credentials.

3. Launch both packages in development mode:

   ```bash
   npm run dev --workspaces
   ```

   Use `npm run dev --workspace apps/agent` or `npm run dev --workspace apps/web` to focus on a single package.

4. Run linting or formatting from the repo root:

   ```bash
   npm run lint
   npm run format
   ```

## Additional Resources

- [docs-by-langchain.md](docs-by-langchain.md) – High-level LangChain integration notes.
- [langgraph-js.md](langgraph-js.md) / [langchain-js.md](langchain-js.md) – Reference material for the JavaScript ecosystem used in this project.
- [MCP-SERVERS.md](MCP-SERVERS.md) – Details on Model Context Protocol server interactions.

For package-specific instructions, see the README files inside each workspace (for example, [`apps/agent/README.md`](apps/agent/README.md)).
