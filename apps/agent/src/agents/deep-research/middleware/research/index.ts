/**
 * Research-specific middleware tools for Deep Research Agent
 *
 * Follows the same architectural pattern as core deep-agent built-in tools:
 * - Uses Command pattern for state updates
 * - Stores results in mock filesystem (state.files)
 * - Comprehensive system prompts and tool descriptions
 * - Automatic state propagation to parent agents
 */

import { ToolMessage } from "@langchain/core/messages";
import { type ToolRunnableConfig, tool } from "@langchain/core/tools";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { z } from "zod";
import type { DeepAgentStateType } from "../../../../deep-agent-experimental/types.js";
import {
  type ExaSearchArgs,
  exaSearchArgsSchema,
  performExaSearch,
} from "../../../../utils/exa.js";
import {
  performTavilySearch,
  type TavilySearchArgs,
  tavilySearchArgsSchema,
} from "../../../../utils/tavily.js";

/**
 * System prompt for research tools - similar to TODO_SYSTEM_PROMPT and FS_SYSTEM_PROMPT
 */
export const RESEARCH_SYSTEM_PROMPT = `## Research Tools: \`exa_search\`, \`tavily_search\`, \`save_research_findings\`

You have access to specialized research tools that help search the web and store findings in the mock filesystem.

**Mock Filesystem Structure:**
All research artifacts are stored in the mock filesystem at \`/research/\`:
- \`/research/searches/\` - Cached search results (auto-created by search tools)
- \`/research/findings/\` - Structured research findings

**Workflow:**
1. Use \`exa_search\` or \`tavily_search\` to search the web (results automatically cached)
2. Extract key findings from search results
3. Use \`save_research_findings\` to persist structured data
4. Use \`read_file\` to access cached searches or findings later
5. Use \`ls /research/searches/\` to see all cached searches

**Built-in Tools Available:**
- \`ls\` - List files in mock filesystem (e.g., \`ls /research/searches/\`)
- \`read_file\` - Read cached searches or saved findings
- \`write_file\` - Create custom research artifacts
- \`edit_file\` - Edit existing artifacts

**Search Result Caching:**
- All search queries are automatically cached in \`/research/searches/\`
- Cached searches include full results, metadata, and timestamps
- Use \`read_file\` to re-read cached searches without re-querying APIs

These research tools automatically store results in the mock filesystem, making them accessible to all agents in the system.`;

/**
 * Detailed description for exa_search tool
 */
export const EXA_SEARCH_DESCRIPTION = `Perform semantic web search using Exa's neural search engine. Returns structured results with highlights and summaries. Full text content is disabled by default to prevent state overflow.

**When to Use:**
- When you need semantic understanding of content (not just keyword matching)
- For finding research papers, technical documentation, or expert content
- When looking for high-quality, authoritative sources
- For discovering related content based on meaning, not just keywords

**Important:** Full text content is disabled by default. Highlights and summaries provide sufficient context for most research tasks. Only set \`includeText: true\` if you specifically need the full page content (note: full text is truncated to 10,000 characters to prevent state overflow).

**Search Types:**
- \`auto\` (default): Automatically chooses best strategy
- \`neural\`: Semantic/neural search for meaning-based results
- \`keyword\`: Traditional keyword-based search

**Output:**
Stores search results in \`/research/searches/{sanitized_query}_exa.json\` with:
- \`query\`: Original search query
- \`timestamp\`: When search was performed
- \`searchType\`: "exa"
- \`cached\`: false (set to true on subsequent reads)
- \`results\`: Array of search results with titles, URLs, highlights, summaries (full text only if \`includeText: true\`)

**Usage Pattern:**
1. Call \`exa_search\` with your query
2. Results are automatically cached in mock filesystem
3. Use \`read_file\` to re-read results: \`read_file({ filePath: "/research/searches/{query}_exa.json" })\`
4. Extract findings and use \`save_research_findings\` to persist structured data

**Example (Basic - Recommended):**
\`\`\`
exa_search({
  query: "LangGraph agent architectures",
  numResults: 10
})
→ Stores: /research/searches/langgraph_agent_architectures_exa.json
→ Returns: Results with highlights and summaries (no full text to keep state size small)
\`\`\`

**Example (With Full Text - Use Sparingly):**
\`\`\`
exa_search({
  query: "specific technical documentation",
  numResults: 5,
  includeText: true  // Only when you need full page content
})
→ Returns: Results with full text (truncated to 10k chars each to prevent overflow)
\`\`\`

The search results persist across agent turns and are accessible to all agents in the hierarchy.`;

/**
 * Detailed description for tavily_search tool
 */
export const TAVILY_SEARCH_DESCRIPTION = `Run a web search to find information. Returns structured Tavily search results, optional synthesized answers, and related images when requested.

**When to Use:**
- For general web searches (news, tutorials, blog posts, community discussions)
- When you need current information or recent developments
- For broad topic overviews and quick fact-finding
- When searching for news, finance, or general knowledge

**Topics:**
- \`general\` (default): General web search
- \`news\`: News articles and current events
- \`finance\`: Financial information and market data

**Search Depth:**
- \`basic\` (default): Quick, focused results
- \`advanced\`: Deeper search with more comprehensive results

**Output:**
Stores search results in \`/research/searches/{sanitized_query}_tavily.json\` with:
- \`query\`: Original search query
- \`timestamp\`: When search was performed
- \`searchType\`: "tavily"
- \`cached\`: false (set to true on subsequent reads)
- \`results\`: Array of search results with titles, URLs, content, snippets
- \`answer\`: Tavily's synthesized answer (if \`includeAnswer\` was true)
- \`images\`: Related images (if \`includeImages\` was true)

**Usage Pattern:**
1. Call \`tavily_search\` with your query
2. Results are automatically cached in mock filesystem
3. Use \`read_file\` to re-read results: \`read_file({ filePath: "/research/searches/{query}_tavily.json" })\`
4. Extract findings and use \`save_research_findings\` to persist structured data

**Example:**
\`\`\`
tavily_search({
  query: "latest developments in AI agents 2025",
  maxResults: 5,
  topic: "news",
  includeAnswer: true
})
→ Stores: /research/searches/latest_developments_in_ai_agents_2025_tavily.json
→ Returns: Summary with result count, answer preview, and file path

read_file({ filePath: "/research/searches/latest_developments_in_ai_agents_2025_tavily.json" })
→ Returns: Full cached search results with answer and images
\`\`\`

**Important: Error Handling**
- Always check the search response for an \`error\` or \`message\` field before using results
- If search fails, results will be empty but cached with error details
- Handle rate limits and timeouts gracefully by continuing with available information

The search results persist across agent turns and are accessible to all agents in the hierarchy.`;

/**
 * Detailed description for save_research_findings tool
 */
export const SAVE_FINDINGS_DESCRIPTION = `Save structured research findings to the mock filesystem for later use in report compilation.

**When to Use:**
- After extracting key facts from search results
- To organize findings by topic or category
- To preserve important information for final report synthesis
- When building up research incrementally across multiple searches

**Input Structure:**
- \`topic\`: The research topic these findings relate to
- \`findings\`: Array of finding objects with:
  - \`fact\`: The key fact or insight discovered
  - \`source\`: URL or reference where this was found
  - \`category\`: Category/type of finding (e.g., "background", "statistics", "expert opinion")
- \`metadata\`: Optional additional context (e.g., search query used, confidence level)

**Output:**
Stores findings in \`/research/findings/{sanitized_topic}_findings.json\` with:
- \`topic\`: Research topic
- \`findings\`: Array of structured findings
- \`sources\`: Deduplicated list of all source URLs
- \`categories\`: List of all categories used
- \`timestamp\`: When findings were saved
- \`totalFindings\`: Count of findings

**Usage Pattern:**
1. Search for information using \`exa_search\` or \`tavily_search\`
2. Extract key facts, insights, and data points from results
3. Call \`save_research_findings\` with structured data
4. Use \`read_file\` to access findings: \`read_file({ filePath: "/research/findings/{topic}_findings.json" })\`
5. Use findings to compile final report

**Example:**
\`\`\`
save_research_findings({
  topic: "LangGraph architecture",
  findings: [
    {
      fact: "LangGraph uses StateGraph for managing conversation state",
      source: "https://langchain.com/docs",
      category: "architecture"
    },
    {
      fact: "Supports both Python and TypeScript implementations",
      source: "https://github.com/langchain-ai/langgraphjs",
      category: "implementation"
    }
  ],
  metadata: { searchQuery: "LangGraph state management", confidence: "high" }
})
→ Stores: /research/findings/langgraph_architecture_findings.json
→ Returns: Summary with findings count and file path
\`\`\`

**Multiple Saves:**
- Calling this tool multiple times for the same topic will **append** new findings
- Existing findings are preserved and merged with new ones
- Sources are deduplicated automatically
- Categories are merged and unique values maintained

Findings persist across agent turns and can be accessed by parent agents for report compilation.`;

// Constants for magic numbers
const MAX_QUERY_LENGTH = 60;
const MAX_FILENAME_LENGTH = 60;
const ANSWER_PREVIEW_LENGTH = 200;

/**
 * Helper function to sanitize query for filesystem paths
 */
function sanitizeQueryForPath(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .substring(0, MAX_QUERY_LENGTH);
}

/**
 * Helper function to sanitize topic for filesystem paths
 */
function sanitizeTopicForPath(topic: string): string {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .substring(0, MAX_FILENAME_LENGTH);
}

/**
 * Helper function to format search cache
 */
function formatSearchCache(
  query: string,
  results: unknown[],
  searchType: "exa" | "tavily",
  additionalData?: Record<string, unknown>
): string {
  return JSON.stringify(
    {
      query,
      timestamp: new Date().toISOString(),
      searchType,
      cached: false,
      results,
      ...additionalData,
    },
    null,
    2
  );
}

/**
 * Exa search tool - performs semantic web search and stores in mock filesystem
 */
export const exaSearch = tool(
  async (input: unknown, config: ToolRunnableConfig) => {
    const state = getCurrentTaskInput<DeepAgentStateType>();
    const files = { ...(state.files || {}) };
    const args = input as ExaSearchArgs;

    // Perform the actual search using existing utility
    const searchResult = await performExaSearch(args, {
      toolName: "exa_search",
    });

    // Sanitize query for file path
    const sanitizedQuery = sanitizeQueryForPath(args.query);
    const filePath = `/research/searches/${sanitizedQuery}_exa.json`;

    // Store results in mock filesystem
    files[filePath] = formatSearchCache(
      args.query,
      searchResult.results,
      "exa",
      {
        error: searchResult.error,
      }
    );

    // Prepare user-facing message with enhanced error diagnostics
    const resultCount = searchResult.results.length;
    const hasError = !!searchResult.error;

    let messageContent: string;
    if (hasError) {
      const errorMessage = searchResult.error || "Unknown error";

      // Provide specific guidance based on error type
      let errorGuidance = "";
      if (errorMessage.includes("EXA_API_KEY is not configured")) {
        errorGuidance = "\n\nAction Required: Configure EXA_API_KEY in your .env file to enable Exa search.";
      } else if (errorMessage.includes("timeout") || errorMessage.includes("timed out")) {
        errorGuidance = "\n\nSuggestion: Try a more specific or simplified query. The search may have timed out due to query complexity.";
      } else if (errorMessage.includes("rate limit") || errorMessage.includes("429")) {
        errorGuidance = "\n\nSuggestion: Wait a moment before retrying. Exa API rate limit reached.";
      } else if (errorMessage.includes("authentication") || errorMessage.includes("unauthorized") || errorMessage.includes("401")) {
        errorGuidance = "\n\nAction Required: Verify your EXA_API_KEY is valid. Authentication failed.";
      } else {
        errorGuidance = "\n\nSuggestion: Try simplifying your query or use tavily_search as an alternative.";
      }

      messageContent = `Exa search encountered an issue: ${errorMessage}${errorGuidance}\n\nSearch results (with error details) cached to ${filePath}\n\nIMPORTANT: Before reporting this as a limitation, try:\n1. Simplifying your query (use fewer keywords, more focused terms)\n2. Breaking the query into smaller, more specific searches\n3. Using tavily_search as an alternative for this particular query\n\nYou can read cached error details with: read_file({ filePath: "${filePath}" })`;
    } else {
      messageContent = `Exa search completed: Found ${resultCount} results for "${args.query}"\n\nResults cached to ${filePath}\nUse read_file to access full results: read_file({ filePath: "${filePath}" })`;
    }

    return new Command({
      update: {
        files,
        messages: [
          new ToolMessage({
            content: messageContent,
            // biome-ignore lint/style/useNamingConvention: tool_call_id is required by ToolMessage interface
            tool_call_id: config.toolCall?.id as string,
          }),
        ],
      },
    });
  },
  {
    name: "exa_search",
    description: EXA_SEARCH_DESCRIPTION,
    schema: exaSearchArgsSchema,
  }
);

/**
 * Tavily search tool - performs web search and stores in mock filesystem
 */
export const tavilySearch = tool(
  async (input: unknown, config: ToolRunnableConfig) => {
    const state = getCurrentTaskInput<DeepAgentStateType>();
    const files = { ...(state.files || {}) };
    const args = input as TavilySearchArgs;

    // Perform the actual search using existing utility
    const searchResult = await performTavilySearch(args, {
      toolName: "tavily_search",
    });

    // Sanitize query for file path
    const sanitizedQuery = sanitizeQueryForPath(args.query);
    const filePath = `/research/searches/${sanitizedQuery}_tavily.json`;

    // Store results in mock filesystem
    files[filePath] = formatSearchCache(
      args.query,
      searchResult.results,
      "tavily",
      {
        answer: searchResult.answer,
        images: searchResult.images,
        followUpQuestions: searchResult.followUpQuestions,
        error: searchResult.error,
      }
    );

    // Prepare user-facing message
    const resultCount = searchResult.results.length;
    const hasError = !!searchResult.error;
    const hasAnswer = !!searchResult.answer && !hasError;
    const answerPreview = hasAnswer
      ? `\n\nSynthesized Answer: ${searchResult.answer?.substring(0, ANSWER_PREVIEW_LENGTH)}${searchResult.answer && searchResult.answer.length > ANSWER_PREVIEW_LENGTH ? "..." : ""}`
      : "";
    const messageContent = hasError
      ? `Tavily search encountered an issue: ${searchResult.error}\n\nSearch results cached to ${filePath}\nYou can still read cached results with: read_file({ filePath: "${filePath}" })`
      : `Tavily search completed: Found ${resultCount} results for "${args.query}"${answerPreview}\n\nResults cached to ${filePath}\nUse read_file to access full results: read_file({ filePath: "${filePath}" })`;

    return new Command({
      update: {
        files,
        messages: [
          new ToolMessage({
            content: messageContent,
            // biome-ignore lint/style/useNamingConvention: tool_call_id is required by ToolMessage interface
            tool_call_id: config.toolCall?.id as string,
          }),
        ],
      },
    });
  },
  {
    name: "tavily_search",
    description: TAVILY_SEARCH_DESCRIPTION,
    schema: tavilySearchArgsSchema,
  }
);

/**
 * Save research findings tool - stores structured findings in mock filesystem
 */
export const saveResearchFindings = tool(
  (input: unknown, config: ToolRunnableConfig) => {
    const state = getCurrentTaskInput<DeepAgentStateType>();
    const files = { ...(state.files || {}) };
    const { topic, findings, metadata } = input as {
      topic: string;
      findings: Array<{ fact: string; source: string; category: string }>;
      metadata?: Record<string, unknown>;
    };

    // Sanitize topic for file path
    const sanitizedTopic = sanitizeTopicForPath(topic);
    const filePath = `/research/findings/${sanitizedTopic}_findings.json`;

    // Check if findings file already exists
    let existingFindings: Array<{
      fact: string;
      source: string;
      category: string;
    }> = [];
    let existingSources: string[] = [];
    let existingCategories: string[] = [];

    if (filePath in files) {
      try {
        const existing = JSON.parse(files[filePath] || "{}");
        existingFindings = existing.findings || [];
        existingSources = existing.sources || [];
        existingCategories = existing.categories || [];
      } catch {
        // If parsing fails, start fresh
      }
    }

    // Merge new findings with existing
    const mergedFindings = [...existingFindings, ...findings];

    // Extract and deduplicate sources
    const allSources = [...existingSources, ...findings.map((f) => f.source)];
    const uniqueSources = Array.from(new Set(allSources));

    // Extract and deduplicate categories
    const allCategories = [
      ...existingCategories,
      ...findings.map((f) => f.category),
    ];
    const uniqueCategories = Array.from(new Set(allCategories));

    // Create findings result
    const findingsResult = {
      topic,
      findings: mergedFindings,
      sources: uniqueSources,
      categories: uniqueCategories,
      totalFindings: mergedFindings.length,
      metadata: metadata || {},
      timestamp: new Date().toISOString(),
    };

    // Store in mock filesystem
    files[filePath] = JSON.stringify(findingsResult, null, 2);

    return new Command({
      update: {
        files,
        messages: [
          new ToolMessage({
            content: `Research findings saved to ${filePath}

Summary:
- Topic: ${topic}
- New Findings: ${findings.length}
- Total Findings: ${mergedFindings.length}
- Unique Sources: ${uniqueSources.length}
- Categories: ${uniqueCategories.join(", ")}

Use read_file to access findings: read_file({ filePath: "${filePath}" })`,
            // biome-ignore lint/style/useNamingConvention: tool_call_id is required by ToolMessage interface
            tool_call_id: config.toolCall?.id as string,
          }),
        ],
      },
    });
  },
  {
    name: "save_research_findings",
    description: SAVE_FINDINGS_DESCRIPTION,
    schema: z.object({
      topic: z.string().describe("The research topic these findings relate to"),
      findings: z
        .array(
          z.object({
            fact: z.string().describe("The key fact or insight discovered"),
            source: z
              .string()
              .describe("URL or reference where this was found"),
            category: z
              .string()
              .describe(
                "Category/type of finding (e.g., background, statistics, expert opinion)"
              ),
          })
        )
        .describe("Array of structured findings"),
      metadata: z
        .any()
        .optional()
        .describe("Optional additional context (key-value object)"),
    }),
  }
);

/**
 * Research tools collection
 */
export const researchTools = [exaSearch, tavilySearch, saveResearchFindings];

/**
 * Message modifier for adding research system prompts
 */
export const researchMessageModifier = (message: string) =>
  message + RESEARCH_SYSTEM_PROMPT;
