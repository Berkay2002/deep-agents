# MCP Servers Guide (Node.js Only)

> **📚 Related Documentation:** For LangChain MCP adapter patterns, `MultiServerMCPClient` usage examples, and Python reference implementations, see **[langchain-mcp.md](langchain-mcp.md)**. This document focuses on Node.js/TypeScript-specific implementations for the Deep Agents project.

This document explains how to add MCP (Model Context Protocol) servers to the Deep Agents project using **Node.js/TypeScript implementations only**.

## Current Status

**MCP servers are currently disabled** due to compatibility issues with `npx` execution. The agent runs successfully without MCP servers but can be extended with them once properly configured with Node.js-based servers.

## Why MCP Servers Are Disabled

### The Problem

MCP servers are **currently disabled by default** to ensure stable agent initialization. However, **working Node.js solutions now exist**.

**Historical Issues**:
1. **Many early MCP servers lacked proper `bin` configuration**:
   - Packages like `mcp-node-fetch` exist on npm but can't be run with `npx`
   - Returned error: "npm error could not determine executable to run"

2. **Official Anthropic servers are Python-based**:
   - Require `uv` or `pip` installation
   - This Node.js-only project avoids Python dependencies

**Current State**:
- ✅ **Working npx-compatible servers now available**: `@tokenizin/mcp-npx-fetch`, `@sylphlab/tools-fetch-mcp`, `@lmcc-dev/mult-fetch-mcp-server`
- ✅ **Ready to enable**: See Option 2 below for npx-based configuration
- ⚠️ **Disabled by default**: To prevent breaking changes for existing deployments

**MultiServerMCPClient Behavior**:
- Initializes all servers simultaneously
- Individual server failures are isolated (won't break other servers)
- Requires at least one valid server configuration (empty object causes error)

## How to Add Node.js MCP Servers

### Option 1: Use npx-Compatible Packages (Recommended)

**Best for**: Quick setup, no installation required, works out-of-the-box.

Use Node.js packages with proper `bin` configuration that work directly with `npx`:

**Installation:** None required (npx downloads on-demand)

**Configuration in `apps/agent/src/utils/tools.ts`:**

```typescript
const mcpServers = {
  fetch: {
    transport: "stdio" as const,
    command: "npx",
    args: ["-y", "@tokenizin/mcp-npx-fetch"],
  },
  // Add more npx-compatible servers...
};
```

**Verify bin configuration before adding:**
```bash
npm view @tokenizin/mcp-npx-fetch bin
# Should return bin entry (means npx works)
```

**Working npx-compatible packages:**
- `@tokenizin/mcp-npx-fetch` ✅ (Recommended - 4 fetch tools: HTML, JSON, text, markdown)
- `@sylphlab/tools-fetch-mcp` ✅
- `@lmcc-dev/mult-fetch-mcp-server` ✅

### Option 2: Use Locally Installed Packages

**Best for**: Packages without `bin` field, or when you need version pinning.

For Node.js packages without proper `bin` configuration, install locally and reference the entry point:

**Installation:**
```bash
npm install mcp-node-fetch filesystem-mcp-server @mseep/git-mcp-server
```

**Configuration in `apps/agent/src/utils/tools.ts`:**

```typescript
import path from "path";

const mcpServers = {
  fetch: {
    transport: "stdio" as const,
    command: "node",
    args: [
      path.join(process.cwd(), "node_modules/mcp-node-fetch/dist/index.js")
    ],
  },
  filesystem: {
    transport: "stdio" as const,
    command: "node",
    args: [
      path.join(process.cwd(), "node_modules/filesystem-mcp-server/dist/index.js"),
      process.env.MCP_FILESYSTEM_PATH ?? process.cwd()
    ],
  },
  git: {
    transport: "stdio" as const,
    command: "node",
    args: [
      path.join(process.cwd(), "node_modules/@mseep/git-mcp-server/dist/index.js"),
      "--repository", process.env.MCP_GIT_REPOSITORY ?? process.cwd()
    ],
  },
};
```

### Option 3: Use SSE Transport (HTTP-based)

**Best for**: Production deployments, microservices architecture, independent server lifecycle.

Run MCP servers as standalone HTTP services:

**Start a server:**
```bash
# Example: Start a custom MCP server on port 3030
node your-mcp-server.js
```

**Configuration:**
```typescript
const mcpServers = {
  customServer: {
    transport: "sse" as const,
    url: "http://localhost:3030/mcp",
  },
};
```

**Benefits:**
- No stdio/npx issues
- Can restart servers independently
- Better for development and debugging
- Supports multiple concurrent connections

### Option 4: Build Custom Node.js MCP Servers

**Best for**: Project-specific tools, custom business logic, complete control over functionality.

Create your own MCP servers using the `@modelcontextprotocol/sdk` TypeScript package:

**Installation:**
```bash
npm install @modelcontextprotocol/sdk
```

**Example custom server (`custom-mcp-server.ts`):**
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "custom-tools",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define your tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "calculate",
        description: "Perform basic calculations",
        inputSchema: {
          type: "object",
          properties: {
            operation: { type: "string", enum: ["add", "subtract", "multiply", "divide"] },
            a: { type: "number" },
            b: { type: "number" },
          },
          required: ["operation", "a", "b"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "calculate") {
    const { operation, a, b } = args as { operation: string; a: number; b: number };
    let result: number;

    switch (operation) {
      case "add": result = a + b; break;
      case "subtract": result = a - b; break;
      case "multiply": result = a * b; break;
      case "divide": result = a / b; break;
      default: throw new Error("Invalid operation");
    }

    return {
      content: [{ type: "text", text: `Result: ${result}` }],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start the server
const transport = new StdioServerTransport();
await server.connect(transport);
```

**Add to configuration:**
```typescript
const mcpServers = {
  customTools: {
    transport: "stdio" as const,
    command: "node",
    args: ["./path/to/custom-mcp-server.js"],
  },
};
```

## Available Node.js MCP Servers

Based on community research, these Node.js/TypeScript servers are available. All can be installed via npm and configured through `claude_desktop_config.json`, VS Code MCP settings, or direct integration using the `@modelcontextprotocol/sdk` TypeScript package.

### Official/Reference Implementations

#### Everything
Part of the official MCP TypeScript SDK repository, providing CORS configuration for browser-based MCP connections. Useful for web-based agent interfaces and cross-origin requests.

#### Fetch

**Node.js servers with proper `bin` configuration that work with `npx`:**

##### @tokenizin/mcp-npx-fetch ✅ (Recommended)
Specifically designed for npx execution with comprehensive fetch capabilities.

**Installation:**
```bash
# Direct usage (no installation needed)
npx @tokenizin/mcp-npx-fetch

# Or install globally
npm install -g @tokenizin/mcp-npx-fetch
```

**Configuration:**
```typescript
const mcpServers = {
  fetch: {
    transport: "stdio" as const,
    command: "npx",
    args: ["-y", "@tokenizin/mcp-npx-fetch"],
  },
};
```

**Tools:**
- `fetch_html` - Returns raw HTML content
- `fetch_json` - Fetches and parses JSON data
- `fetch_txt` - Returns clean plain text (removes HTML tags/scripts)
- `fetch_markdown` - Converts content to well-formatted Markdown
- Custom headers support for authentication

##### @sylphlab/tools-fetch-mcp ✅
Ready-to-run MCP server for HTTP requests.

**Configuration:**
```typescript
const mcpServers = {
  fetch: {
    transport: "stdio" as const,
    command: "npx",
    args: ["-y", "@sylphlab/tools-fetch-mcp"],
  },
};
```

##### @lmcc-dev/mult-fetch-mcp-server ✅
Web content fetching supporting multiple modes and formats.

**Configuration:**
```typescript
const mcpServers = {
  fetch: {
    transport: "stdio" as const,
    command: "npx",
    args: ["-y", "@lmcc-dev/mult-fetch-mcp-server"],
  },
};
```

**Other Node.js Alternatives** (require local installation):
- **Node Fetch** (`mcp-node-fetch`) by Matteo Collina - Uses undici library (no bin, use local install)
- **Fetch (TypeScript)** by Tatsu - Playwright-based with advanced rendering (no bin, use local install)

#### Filesystem
**`filesystem-mcp-server`** by cyanheads - Built with TypeScript emphasizing type safety, modularity, and robust error handling. Provides tools for:
- Reading and writing files
- Creating directories
- Moving files
- Retrieving file metadata

#### Git
**`@mseep/git-mcp-server`** - Comprehensive Node.js/TypeScript implementation providing Git operations:
- Clone, commit, push, pull operations
- Branch management (create, delete, checkout, list)
- Diff, log, and status commands
- Built on cyanheads/mcp-ts-template with modular architecture and robust error handling

**Alternative:** Docker-based approach available for GitHub operations, though native Node.js implementations are recommended for local Git workflows.

#### Memory
Multiple Node.js memory server implementations:

1. **Official TypeScript Reference** (Anthropic) - Basic memory storage with JSON persistence for simple use cases

2. **`@mem0/mcp-server`** - Advanced memory storage features:
   - User-specific context storage
   - Search capabilities with relevance scoring
   - Support for multiple user contexts
   - Persistent memory across sessions

3. **`memory-bank-mcp`** by alioshr - Multi-project memory bank management:
   - Project-specific directories
   - File structure enforcement
   - Organized memory storage per project

#### Sequential Thinking
Part of the official repository, uses TypeScript for implementing chain-of-thought reasoning patterns for LLMs. Enables extended reasoning capabilities and complex problem-solving workflows.

#### Time

**Official Status:** The official time server only exists as a Python implementation (using `uv` or `pip`).

**Node.js Alternative:** Creating a TypeScript equivalent is straightforward using the `@modelcontextprotocol/sdk` package with timezone libraries.

**Recommended Implementation:**
- Use `@modelcontextprotocol/sdk` for server setup
- Implement `get_current_time` and `convert_time` tools
- Use `luxon` for IANA timezone handling (recommended)
- Alternative: `date-fns-tz` for lightweight timezone support
- Supports stdio transport for local connections or HTTP/SSE for remote access

**Installation:**
```bash
npm install @modelcontextprotocol/sdk luxon
npm install --save-dev @types/luxon
```

**Example Implementation Pattern:**
```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { DateTime } from "luxon";

const server = new Server({
  name: "time-server",
  version: "1.0.0",
}, {
  capabilities: { tools: {} },
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_current_time",
        description: "Get current time in specified timezone",
        inputSchema: {
          type: "object",
          properties: {
            timezone: {
              type: "string",
              description: "IANA timezone (e.g., 'America/New_York', 'Europe/London')"
            }
          },
          required: ["timezone"],
        },
      },
      {
        name: "convert_time",
        description: "Convert time between timezones",
        inputSchema: {
          type: "object",
          properties: {
            time: { type: "string", description: "ISO 8601 datetime" },
            from_tz: { type: "string", description: "Source IANA timezone" },
            to_tz: { type: "string", description: "Target IANA timezone" },
          },
          required: ["time", "from_tz", "to_tz"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "get_current_time") {
    const { timezone } = args as { timezone: string };
    const now = DateTime.now().setZone(timezone);
    return {
      content: [{ type: "text", text: now.toISO() || "Invalid timezone" }],
    };
  }

  if (name === "convert_time") {
    const { time, from_tz, to_tz } = args as { time: string; from_tz: string; to_tz: string };
    const dt = DateTime.fromISO(time, { zone: from_tz });
    const converted = dt.setZone(to_tz);
    return {
      content: [{ type: "text", text: converted.toISO() || "Conversion failed" }],
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

**Alternative Framework:** FastMCP (TypeScript) simplifies building custom MCP servers with built-in error handling, authentication, and session management.

### Installation Examples

```bash
# Core SDK
npm install @modelcontextprotocol/sdk

# File and Git operations
npm install filesystem-mcp-server
npm install @mseep/git-mcp-server

# Memory servers
npm install @mem0/mcp-server
npm install memory-bank-mcp

# Web fetching
npm install mcp-node-fetch
```

### Configuration Options

Servers can be configured through:
1. **`claude_desktop_config.json`** - For Claude Desktop application
2. **VS Code MCP settings** - `.vscode/mcp.json` in workspace
3. **Direct integration** - In LangGraph projects like this one via `apps/agent/src/utils/tools.ts`

**Important:** Always verify package availability and bin configuration before adding to the project. Check if the package has a proper `bin` field for `npx` execution using:
```bash
npm view package-name bin main exports
```

## Testing MCP Server Configuration

### 1. Verify bin Configuration

**Before adding any package**, verify it has proper `bin` configuration:

```bash
npm view @tokenizin/mcp-npx-fetch bin
npm view @sylphlab/tools-fetch-mcp bin
npm view @lmcc-dev/mult-fetch-mcp-server bin
```

**Interpretation:**
- ✅ **Returns bin entry** → Package works with `npx`, use Option 1 (npx)
- ❌ **Returns undefined/empty** → Use Option 2 (local installation with `node`)

**Example output for working package:**
```bash
$ npm view @tokenizin/mcp-npx-fetch bin
{ 'mcp-npx-fetch': 'dist/index.js' }
```

**The `-y` flag**: Auto-confirms npx prompts, ensuring smooth execution without user interaction.

### 2. Test Server Directly

```bash
# For packages with bin field
npx -y package-name

# For locally installed packages
npm install package-name
node node_modules/package-name/dist/index.js

# For custom servers
node ./your-mcp-server.js
```

### 3. Test with MCP Inspector (Node.js servers only)

```bash
# For local servers
npx @modelcontextprotocol/inspector node path/to/server.js

# For npx-compatible packages
npx @modelcontextprotocol/inspector npx -y package-name
```

## Re-enabling MCP Servers

To re-enable MCP servers in this project:

### Quick Start (Recommended)

**Use npx-compatible packages for instant setup:**

1. **Update configuration** in `apps/agent/src/utils/tools.ts`:
   ```typescript
   const mcpServers = {
     fetch: {
       transport: "stdio" as const,
       command: "npx",
       args: ["-y", "@tokenizin/mcp-npx-fetch"],
     },
   };
   ```

2. **Rebuild and test:**
   ```bash
   cd apps/agent
   npm run build
   npm run dev
   ```

3. **Verify in logs:**
   - Look for successful tool loading messages
   - Check for no "Failed to load MCP tools" errors
   - Server should start on port 2024 without issues

### Alternative Approaches

**Choose based on your needs:**

1. **npx-Compatible (Recommended)**:
   - No installation needed
   - Works immediately
   - Use: `@tokenizin/mcp-npx-fetch`, `@sylphlab/tools-fetch-mcp`

2. **Local Installation**:
   - Better for version pinning
   - Offline usage
   - Install packages, use `node` command with path

3. **SSE Transport**:
   - Best for production
   - Independent server lifecycle
   - Run servers as HTTP services

4. **Custom Servers**:
   - Project-specific tools
   - Full control
   - Build with `@modelcontextprotocol/sdk`

## Current Code Structure

The MCP tools system in `apps/agent/src/utils/tools.ts` includes:

- **Conditional initialization**: Only creates `MultiServerMCPClient` if servers are configured
- **Error handling**: Gracefully handles server failures
- **Caching**: Caches loaded tools per server to avoid reloading
- **Flexible loading**: Can load all servers or specific subsets

## Future Improvements

1. **Separate SSE servers**: Move SSE transport servers to a different configuration
2. **Better error handling**: Isolate server failures to prevent cascades
3. **Auto-discovery**: Automatically detect available MCP servers
4. **Per-server retry**: Retry failed servers independently
5. **Health checks**: Verify server availability before initialization

## Resources

### Official Documentation
- [Model Context Protocol Docs](https://modelcontextprotocol.io/)
- [MCP TypeScript SDK](https://github.com/modelcontextprotocol/typescript-sdk)
- [LangChain MCP Adapters](https://github.com/langchain-ai/langchain-mcp-adapters)

### Node.js MCP Server Repositories
- [Node Fetch Server](https://github.com/mcollina/mcp-node-fetch) by Matteo Collina
- [Filesystem MCP Server](https://github.com/cyanheads/filesystem-mcp-server) by cyanheads
- [Git MCP Server](https://github.com/mseep/git-mcp-server) by @mseep
- [MCP TypeScript Template](https://github.com/cyanheads/mcp-ts-template) - For building custom servers

### Server Discovery
- [PulseMCP](https://www.pulsemcp.com/servers) - Comprehensive MCP server catalog
- [MCP Market](https://mcpmarket.com/) - Community-driven server marketplace

## Troubleshooting

### Common Issues

**Issue: "npm error could not determine executable to run"**
- **Cause:** Package lacks proper `bin` configuration
- **Solution:** Use local installation with `node` command instead of `npx`

**Issue: "Connection closed" or "Failed to connect to stdio server"**
- **Cause:** Server entry point path is incorrect or server crashes on startup
- **Solution:**
  1. Test server directly: `node path/to/server.js`
  2. Check server logs for errors
  3. Verify package is installed: `npm list package-name`

**Issue: "No MCP servers provided"**
- **Cause:** `mcpServers` object is empty
- **Solution:** Add at least one server configuration or keep the conditional initialization

**Issue: All servers failing simultaneously**
- **Cause:** `MultiServerMCPClient` cascade failure
- **Solution:** Add servers one at a time, test each individually

### Getting Help

If you encounter issues with MCP servers:

1. **Test the server directly** before adding to configuration
2. **Check package structure**: `npm view package-name bin main exports`
3. **Review server logs** for specific error messages
4. **Verify installation**: `npm list package-name`
5. **Try MCP Inspector** for debugging: `npx @modelcontextprotocol/inspector node server.js`

## Important Notes

- **Node.js only**: This project uses Node.js/TypeScript exclusively. Python-based MCP servers are not supported.
- **No Python required**: All server implementations should be Node.js-based.
- **Works without MCP**: The agent functions perfectly with core LangChain tools and optional Tavily search.
- **MCP is optional**: Add servers only when you need specific capabilities they provide.

## See Also

- **[langchain-mcp.md](langchain-mcp.md)** - LangChain MCP adapter documentation with `MultiServerMCPClient` usage patterns, stateful/stateless sessions, and integration examples
- **[apps/agent/src/utils/tools.ts](apps/agent/src/utils/tools.ts)** - Current MCP tools implementation in Deep Agents
- **[Model Context Protocol Docs](https://modelcontextprotocol.io/)** - Official MCP specification
- **[@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/typescript-sdk)** - TypeScript SDK for building MCP servers