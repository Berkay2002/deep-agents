# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Deep Agents is a **Node.js/TypeScript-only monorepo** for building LangGraph agents with Google Gemini models. The project avoids Python dependencies and uses Node.js-based MCP servers exclusively.

**Monorepo Structure:**
- `apps/agent`: LangGraph agent using `deepagents` library with Google Gemini 2.5 Pro
- `apps/web`: Next.js 15 proxy application for secure LangGraph communication

**Key Technologies:**
- LangGraph + LangChain Core for agent orchestration
- Google Gemini 2.5 Pro via `@langchain/google-genai`
- MCP (Model Context Protocol) for tool integration (currently disabled)
- Next.js 15 with App Router for web proxy
- TypeScript with strict mode, ES2022 target

## Development Commands

**Root-level (runs across all workspaces):**
```bash
npm run dev        # Start LangGraph dev server (port 2024) + Next.js dev server (port 3000)
npm run build      # Compile TypeScript for agent + build Next.js app
npm run lint       # Lint all TypeScript/TSX files
npm run format     # Format all code with Prettier
```

**Agent workspace (`apps/agent`):**
```bash
npm run build              # Compile TypeScript to dist/ (required before running)
npm run typecheck          # Type check without compilation
npm run dev                # Start LangGraph dev server on port 2024
npm run dev:server         # Alias for dev (starts LangGraph server)
npm run build:server       # Build for LangGraph Cloud deployment
```

**Web workspace (`apps/web`):**
```bash
npm run dev       # Start Next.js dev server on port 3000
npm run build     # Build production Next.js bundle
npm run start     # Start production Next.js server
```

**Important:** Always run `npm run build` in `apps/agent` after modifying TypeScript files before starting the dev server. The LangGraph runtime requires compiled JavaScript in `dist/`.

## Environment Configuration

**Agent environment (`apps/agent/.env`):**
```bash
GOOGLE_API_KEY=your_google_api_key_here           # Required: For Gemini 2.5 Pro model
GOOGLE_GENAI_MODEL=gemini-2.5-pro                 # Optional: Override model (default: gemini-2.5-pro)
TAVILY_API_KEY=your_tavily_api_key_here          # Optional: Enable Tavily web search tool
DEEP_AGENT_INSTRUCTIONS="custom instructions"    # Optional: Override default agent behavior
```

**Web proxy environment (`apps/web/.env.local`):**
```bash
LANGGRAPH_BASE_URL=http://localhost:2024         # Required: LangGraph server URL (default port 2024)
LANGGRAPH_SERVER_TOKEN=your_server_token         # Optional: Server authentication token
```

**Port Configuration:**
- LangGraph dev server: `http://localhost:2024`
- LangGraph Studio UI: `https://smith.langchain.com/studio?baseUrl=http://localhost:2024`
- Next.js dev server: `http://localhost:3000`

## High-Level Architecture

### Agent Initialization Flow

1. **Entry Point** (`apps/agent/src/agent.ts`):
   - Exports `deepAgentGraph` function for LangGraph runtime
   - Uses **singleton pattern** via `initDeepAgent()` to cache graph initialization
   - Graph initialization is expensive (loads tools, creates model), so only happens once

2. **Graph Construction**:
   - Calls `loadDefaultTools()` to get available tools (Tavily search if configured)
   - Creates ChatGoogleGenerativeAI model instance (Gemini 2.5 Pro by default)
   - Invokes `createDeepAgent()` from `deepagents` library with model, tools, and instructions

3. **Tool Loading** (`apps/agent/src/utils/tools.ts`):
   - Conditionally initializes `MultiServerMCPClient` only if MCP servers are configured
   - **Currently**: MCP servers are disabled (`mcpServers = {}`) due to Python/npx compatibility issues
   - Caches tools per server to avoid reloading on subsequent requests
   - Gracefully handles server failures without blocking agent initialization

4. **Runtime**:
   - LangGraph dev server (`port 2024`) loads compiled JavaScript from `dist/agent.js`
   - Reads `langgraph.json` to find graph export: `"agent": "./dist/agent.js:deepAgentGraph"`
   - Graph is invoked for each user message, maintaining conversation state

### MCP Tools Architecture (Currently Disabled)

**Current State**: MCP servers are **disabled** due to compatibility issues with Node.js package execution.

**Reason**: Most official Anthropic MCP servers are Python-based. Node.js alternatives like `mcp-node-fetch` lack proper `bin` configuration for `npx` execution.

**To Enable MCP Servers**: See comprehensive guide in `MCP-SERVERS.md` for:
- Local installation with `node` command
- SSE transport (HTTP-based) servers
- Custom server creation with `@modelcontextprotocol/sdk`

**Implementation Pattern**:
- MCP client uses **conditional initialization**: Only creates `MultiServerMCPClient` when `mcpServers` is non-empty
- Tools are **cached per server** in `cachedToolsByServer` map
- **Error isolation**: Individual server failures don't prevent other servers from loading
- **Asynchronous loading**: Tools loaded on-demand with `loadMcpTools()`

### Next.js Proxy Architecture

**Location**: `apps/web/src/app/api/[..._path]/route.ts`

**Purpose**: Secure client-to-LangGraph communication with header filtering and server-side authentication.

**Request Flow**:
1. Client sends request to Next.js API route (e.g., `/api/threads`)
2. Proxy filters sensitive headers (authorization, cookie, etc.)
3. Adds `LANGGRAPH_SERVER_TOKEN` if configured
4. Forwards to LangGraph server (`LANGGRAPH_BASE_URL`)
5. Streams response back to client

**Security Features**:
- Removes sensitive client headers to prevent injection attacks
- Adds server-side auth token transparently
- Supports all HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Handles streaming responses for real-time agent interactions

### File Upload Handling

**Agent side** (`apps/agent/src/agent.ts`):
- Accepts files as `AgentFile` type with `data` (string | ArrayBuffer | Uint8Array)
- Normalizes file content to base64 data URIs for LLM consumption
- Converts binary data to Buffer, then to base64 with proper MIME type

**Supported**: Images, PDFs, text files - automatically converted for Gemini model processing.

## Critical Implementation Details

### Agent Initialization Pattern

```typescript
// Singleton pattern prevents recreating expensive resources
let deepAgentGraphPromise: Promise<DeepAgentGraph> | null = null;

export async function initDeepAgent(): Promise<DeepAgentGraph> {
  if (!deepAgentGraphPromise) {
    deepAgentGraphPromise = (async () => {
      const tools = await loadDefaultTools();
      return createDeepAgent({ model, tools, instructions });
    })();
  }
  return deepAgentGraphPromise;
}
```

**Why**: Graph initialization loads tools, connects to MCP servers, and creates model instance. This can take several seconds. Caching prevents redundant initialization on subsequent requests.

### MCP Client Conditional Initialization

```typescript
const hasMcpServers = allServerNames.length > 0;
export const mcpClient = hasMcpServers
  ? new MultiServerMCPClient({ mcpServers })
  : null;
```

**Why**: `MultiServerMCPClient` throws error if given empty object. Conditional initialization allows running without MCP servers while maintaining type safety.

### LangGraph Configuration

**File**: `apps/agent/langgraph.json`
```json
{
  "node_version": "20",
  "graphs": {
    "agent": "./dist/agent.js:deepAgentGraph"
  },
  "env": ".env"
}
```

**Key Points**:
- Graph must be exported from **compiled JavaScript** in `dist/`, not TypeScript source
- Export name matches the function: `deepAgentGraph`
- `.env` file loaded automatically for environment variables

## Documentation References

**For MCP Server Implementation**:
- `MCP-SERVERS.md` - Node.js-only MCP server guide with local installation, SSE transport, and custom server creation
- `langchain-mcp.md` - LangChain MCP adapter patterns and integration examples

**Cross-References**: Both documents reference each other. When working with MCP, read both files for complete context.

## Important Notes

- **Node.js Only**: No Python dependencies. All MCP servers must be Node.js/TypeScript-based.
- **Build Required**: Agent TypeScript must be compiled to `dist/` before LangGraph can load it.
- **Singleton Pattern**: Graph initialization is cached to avoid expensive re-initialization.
- **MCP Currently Disabled**: Enable by adding Node.js servers to `mcpServers` object in `tools.ts`.
- **Port Conflicts**: If port 2024 is in use, kill the existing process before starting dev server.
- **Never Run `npm run build`** if localhost is active (e.g., user has localhost:3000 running).