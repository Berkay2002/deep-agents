import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface MCPServer {
  name: string;
  displayName: string;
  description: string;
  enabled: boolean;
  requiresAuth: boolean;
}

/**
 * GET /api/mcp-status
 *
 * Returns the current status of MCP servers based on environment configuration.
 * This mirrors the logic in apps/agent/src/utils/mcp.ts
 */
export async function GET() {
  const servers: MCPServer[] = [];

  // Sequential Thinking - always enabled (no auth required)
  servers.push({
    name: "sequential-thinking",
    displayName: "Sequential Thinking",
    description: "Structured reasoning and analysis tools",
    enabled: true,
    requiresAuth: false,
  });

  // DeepWiki - always enabled (no auth required)
  servers.push({
    name: "deepwiki",
    displayName: "DeepWiki",
    description: "Knowledge base and documentation access",
    enabled: true,
    requiresAuth: false,
  });

  // GitHub Copilot - enabled if GITHUB_PAT is set
  const githubPat = process.env.GITHUB_PAT;
  servers.push({
    name: "github-copilot",
    displayName: "GitHub Copilot",
    description: "Code suggestions and development assistance",
    enabled: !!githubPat,
    requiresAuth: true,
  });

  // LangChain Docs - enabled if MCP_LANGCHAIN_URL is set
  const langchainUrl = process.env.MCP_LANGCHAIN_URL;
  if (langchainUrl) {
    servers.push({
      name: "langchain-docs",
      displayName: "LangChain Docs",
      description: "LangChain documentation and examples",
      enabled: true,
      requiresAuth: false,
    });
  }

  return NextResponse.json({ servers });
}
