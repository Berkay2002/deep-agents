# `src/mcp/client.ts`

> **Note:** The STDIO-based client described below has been removed from the runtime. Retain this document for reference while the HTTP client is implemented.

```typescript
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import type { MCPServerConfig } from "@langchain/mcp-adapters";

/**
 * Configuration for a single MCP server
 */
export interface MCPServerOptions {
  url: string;
  transport?: "streamable_http" | "stdio";
  headers?: Record<string, string>;
  automaticSSEFallback?: boolean;
  reconnect?: {
    enabled: boolean;
    maxAttempts?: number;
    delayMs?: number;
    backoffFactor?: number;
  };
  // For stdio transport
  command?: string;
  args?: string[];
  env?: Record<string, string>;
}

/**
 * Configuration for MCP client
 */
export interface MCPClientConfig {
  useStandardContentBlocks?: boolean;
  defaultToolTimeout?: number;
  throwOnLoadError?: boolean;
  prefixToolNameWithServerName?: boolean;
}

/**
 * Create a single MCP server connection
 * @param serverName - Name identifier for the server
 * @param options - Server connection options
 * @param clientConfig - Optional client configuration
 * @returns MultiServerMCPClient instance and tools
 */
export async function createSingleMCPClient(
  serverName: string,
  options: MCPServerOptions,
  clientConfig: MCPClientConfig = {}
) {
  const {
    useStandardContentBlocks = true,
    defaultToolTimeout = 30000,
    throwOnLoadError = true,
    prefixToolNameWithServerName = false,
  } = clientConfig;

  const mcpClient = new MultiServerMCPClient({
    useStandardContentBlocks,
    defaultToolTimeout,
    mcpServers: {
      [serverName]: buildServerConfig(options),
    },
  });

  try {
    const tools = await mcpClient.getTools();
    console.log(`✅ Connected to ${serverName}: ${tools.length} tools loaded`);

    return {
      client: mcpClient,
      tools,
      serverName,
    };
  } catch (error) {
    await mcpClient.close();
    throw new Error(
      `Failed to connect to MCP server '${serverName}': ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Create multiple MCP server connections
 * @param servers - Map of server names to connection options
 * @param clientConfig - Optional client configuration
 * @returns MultiServerMCPClient instance and tools grouped by server
 */
export async function createMultiMCPClient(
  servers: Record<string, MCPServerOptions>,
  clientConfig: MCPClientConfig = {}
) {
  const {
    useStandardContentBlocks = true,
    defaultToolTimeout = 30000,
    throwOnLoadError = true,
    prefixToolNameWithServerName = true,
  } = clientConfig;

  const mcpServers: Record<string, MCPServerConfig> = {};
  for (const [name, options] of Object.entries(servers)) {
    mcpServers[name] = buildServerConfig(options);
  }

  const mcpClient = new MultiServerMCPClient({
    useStandardContentBlocks,
    defaultToolTimeout,
    mcpServers,
  });

  try {
    const tools = await mcpClient.getTools();
    
    // Group tools by server
    const toolsByServer: Record<string, number> = {};
    tools.forEach((tool) => {
      const serverPrefix = tool.name.split("_")[0];
      toolsByServer[serverPrefix] = (toolsByServer[serverPrefix] || 0) + 1;
    });

    console.log("✅ Connected to MCP servers:");
    for (const [server, count] of Object.entries(toolsByServer)) {
      console.log(`   - ${server}: ${count} tools`);
    }

    return {
      client: mcpClient,
      tools,
      toolsByServer,
    };
  } catch (error) {
    await mcpClient.close();
    throw new Error(
      `Failed to connect to MCP servers: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Build server configuration from options
 */
function buildServerConfig(options: MCPServerOptions): MCPServerConfig {
  if (options.transport === "stdio") {
    if (!options.command) {
      throw new Error("stdio transport requires 'command' parameter");
    }
    return {
      command: options.command,
      args: options.args || [],
      env: options.env,
      transport: "stdio",
    };
  }

  // HTTP transport (default)
  return {
    url: options.url,
    transport: options.transport || "streamable_http",
    headers: options.headers,
    automaticSSEFallback: options.automaticSSEFallback ?? true,
    reconnect: options.reconnect || {
      enabled: true,
      maxAttempts: 5,
      delayMs: 2000,
      backoffFactor: 1.5,
    },
  };
}

/**
 * Safely close MCP client with error handling
 * @param client - MultiServerMCPClient instance
 */
export async function closeMCPClient(client: MultiServerMCPClient) {
  try {
    await client.close();
    console.log("✅ MCP client closed successfully");
  } catch (error) {
    console.error(
      "⚠️ Error closing MCP client:",
      error instanceof Error ? error.message : String(error)
    );
  }
}

/**
 * Create MCP client with retry logic
 * @param createFn - Function that creates the MCP client
 * @param maxRetries - Maximum number of retry attempts
 * @returns MCP client result
 */
export async function createMCPClientWithRetry<T>(
  createFn: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await createFn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(
        `❌ MCP connection attempt ${attempt}/${maxRetries} failed: ${lastError.message}`
      );

      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        console.log(`⏳ Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error(
    `Failed to create MCP client after ${maxRetries} attempts: ${lastError?.message}`
  );
}
```

## `src/mcp/config.ts`

```typescript
import type { MCPServerOptions } from "./client.js";

/**
 * Predefined MCP server configurations
 */
export const MCP_SERVERS = {
  LANGCHAIN_DOCS: {
    url: "https://docs.langchain.com/mcp",
    transport: "streamable_http" as const,
    automaticSSEFallback: true,
    reconnect: {
      enabled: true,
      maxAttempts: 5,
      delayMs: 2000,
    },
  },
  // Add more predefined servers here
} satisfies Record<string, MCPServerOptions>;

/**
 * Load MCP server configuration from environment variables
 */
export function loadMCPServerFromEnv(
  envPrefix: string = "MCP"
): MCPServerOptions | null {
  const url = process.env[`${envPrefix}_URL`];
  if (!url) return null;

  return {
    url,
    transport: (process.env[`${envPrefix}_TRANSPORT`] as any) || "streamable_http",
    headers: process.env[`${envPrefix}_API_KEY`]
      ? {
          Authorization: `Bearer ${process.env[`${envPrefix}_API_KEY`]}`,
        }
      : undefined,
    automaticSSEFallback: true,
    reconnect: {
      enabled: true,
      maxAttempts: parseInt(process.env[`${envPrefix}_MAX_RETRIES`] || "5"),
      delayMs: parseInt(process.env[`${envPrefix}_RETRY_DELAY`] || "2000"),
    },
  };
}
```

## `src/mcp/index.ts`

```typescript
export {
  createSingleMCPClient,
  createMultiMCPClient,
  closeMCPClient,
  createMCPClientWithRetry,
  type MCPServerOptions,
  type MCPClientConfig,
} from "./client.js";

export { MCP_SERVERS, loadMCPServerFromEnv } from "./config.js";
```

## Usage Examples

### In your `agent.ts` (Single Server)

```typescript
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createSingleMCPClient, closeMCPClient } from "./mcp/index.js";

async function initializeAgent() {
  // Create MCP client
  const { client: mcpClient, tools } = await createSingleMCPClient(
    "langchain-docs",
    {
      url: "https://docs.langchain.com/mcp",
      transport: "streamable_http",
    }
  );

  // Create agent with tools
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash-exp",
    temperature: 0.7,
  });

  const agent = createReactAgent({ llm: model, tools });

  return { agent, mcpClient };
}

// Usage
const { agent, mcpClient } = await initializeAgent();

try {
  const response = await agent.invoke({
    messages: [{ role: "user", content: "Your query here" }],
  });
  console.log(response.messages[response.messages.length - 1].content);
} finally {
  await closeMCPClient(mcpClient);
}
```

### In your `agent.ts` (Multiple Servers)

```typescript
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { createMultiMCPClient, closeMCPClient } from "./mcp/index.js";

async function initializeAgent() {
  // Create multi-server MCP client
  const { client: mcpClient, tools, toolsByServer } = await createMultiMCPClient({
    "langchain-docs": {
      url: "https://docs.langchain.com/mcp",
      transport: "streamable_http",
    },
    "custom-api": {
      url: "https://your-api.com/mcp",
      transport: "streamable_http",
      headers: {
        Authorization: `Bearer ${process.env.API_KEY}`,
      },
    },
    "local-tools": {
      command: "node",
      args: ["./mcp-servers/local-server.js"],
      transport: "stdio",
      env: process.env,
    },
  });

  // Create agent with all tools
  const model = new ChatGoogleGenerativeAI({
    model: "gemini-2.0-flash-exp",
  });

  const agent = createReactAgent({ llm: model, tools });

  return { agent, mcpClient, toolsByServer };
}
```

### In your `tools.ts` (Standalone Tools Export)

```typescript
import { createMultiMCPClient, MCP_SERVERS } from "./mcp/index.js";

let mcpClient: any = null;

export async function getTools() {
  if (!mcpClient) {
    const result = await createMultiMCPClient({
      "langchain-docs": MCP_SERVERS.LANGCHAIN_DOCS,
      // Add more servers
    });
    mcpClient = result.client;
    return result.tools;
  }
  
  return await mcpClient.getTools();
}

export async function cleanup() {
  if (mcpClient) {
    await mcpClient.close();
    mcpClient = null;
  }
}
```

### With Retry Logic

```typescript
import { createMCPClientWithRetry, createMultiMCPClient } from "./mcp/index.js";

const { client, tools } = await createMCPClientWithRetry(
  () =>
    createMultiMCPClient({
      "langchain-docs": {
        url: "https://docs.langchain.com/mcp",
      },
    }),
  3 // Max 3 retries
);
```

### Using Environment Variables

```typescript
// .env file:
// MCP_URL=https://docs.langchain.com/mcp
// MCP_TRANSPORT=streamable_http
// MCP_API_KEY=your_key_here
// MCP_MAX_RETRIES=5

import { loadMCPServerFromEnv, createSingleMCPClient } from "./mcp/index.js";

const serverConfig = loadMCPServerFromEnv("MCP");
if (serverConfig) {
  const { client, tools } = await createSingleMCPClient(
    "env-server",
    serverConfig
  );
}
```

This modular setup gives you clean imports and easy integration with your existing deep agent architecture.

[1](https://www.npmjs.com/package/@langchain/mcp-adapters)
[2](https://github.com/modelcontextprotocol/typescript-sdk)
[3](https://gist.github.com/anuj846k/2d641bf33606bcd13d8d5af311af1832)
[5](https://github.com/mcp-use/mcp-use-ts)
[6](https://lobehub.com/mcp/umutc-mcp-typescript)
[7](https://learn.microsoft.com/en-us/microsoftteams/platform/teams-ai-library/typescript/in-depth-guides/ai/mcp/mcp-client)
[9](https://mcpcn.com/en/docs/tutorials/building-a-client-node/)
[14](https://blog.marcnuri.com/connecting-to-mcp-server-with-langchainjs)
[16](https://modelcontextprotocol.info/docs/quickstart/client/)
[17](https://docs.spring.io/spring-ai/reference/api/mcp/mcp-client-boot-starter-docs.html)
[18](https://mcpcn.com/en/docs/tutorials/building-a-client/)