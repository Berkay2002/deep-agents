/**
 * Critique-specific middleware tools for Deep Research Agent
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
import type { DeepAgentStateType } from "../../../deep-agent-experimental/types.js";
import {
  performTavilySearch,
  type TavilySearchArgs,
} from "../../../utils/tavily.js";

/**
 * System prompt for critique tools - similar to TODO_SYSTEM_PROMPT and FS_SYSTEM_PROMPT
 */
export const CRITIQUE_SYSTEM_PROMPT = `## Critique Tools: \`fact_check\`, \`evaluate_structure\`, \`analyze_completeness\`, \`save_critique\`

You have access to specialized critique tools that help analyze and critique research reports systematically.

**Mock Filesystem Structure:**
All critique artifacts are stored in the mock filesystem at \`/research/critiques/\`:
- \`/research/critiques/fact_checks/\` - Fact verification results
- \`/research/critiques/structure_evaluation.json\` - Structure and organization analysis
- \`/research/critiques/completeness_analysis.json\` - Coverage and completeness assessment
- \`/research/critiques/{category}_critique.json\` - Structured critique findings by category

**Available Categories:**
- structure - Report organization, flow, heading hierarchy
- completeness - Coverage of topic, missing areas
- accuracy - Fact verification, citation quality
- clarity - Writing quality, readability
- citations - Source quality, citation formatting

**Workflow:**
1. Read the report and question using \`read_file\`
2. Use \`evaluate_structure\` to analyze organization and flow
3. Use \`analyze_completeness\` to check coverage against the question
4. Use \`fact_check\` to verify key claims and statistics
5. Use \`save_critique\` to persist structured findings by category
6. Return comprehensive critique summary

**Built-in Tools Available:**
- \`ls\` - List files in mock filesystem (e.g., \`ls /research/critiques/\`)
- \`read_file\` - Read report, question, or critique artifacts
- \`write_file\` - Create custom critique artifacts
- \`edit_file\` - Edit existing artifacts

**Severity Levels:**
Use these consistent severity levels in all critique findings:
- \`critical\` - Major issues that significantly impact quality
- \`high\` - Important issues that should be addressed
- \`medium\` - Moderate issues worth improving
- \`low\` - Minor suggestions for enhancement

These critique tools automatically store results in the mock filesystem, making them accessible to all agents in the system.`;

/**
 * Detailed description for fact_check tool
 */
export const FACT_CHECK_DESCRIPTION = `Verify a specific claim or fact from the report against authoritative sources.

**When to Use:**
- To verify statistics, dates, or numerical claims
- To check factual statements that seem questionable
- To validate key assertions in the report
- To ensure accuracy of technical or specialized information

**Input:**
- \`claim\`: The specific claim or fact to verify
- \`context\`: Optional surrounding context from the report

**Output:**
Stores verification results in \`/research/critiques/fact_checks/{sanitized_claim}_check.json\` with:
- \`claim\`: The original claim being verified
- \`verified\`: Boolean indicating if claim is accurate
- \`sources\`: Array of authoritative sources found
- \`confidence\`: "high" | "medium" | "low" - verification confidence level
- \`notes\`: Additional context about verification
- \`timestamp\`: When verification was performed

**Usage Pattern:**
1. Call \`fact_check\` with a specific claim from the report
2. Tool automatically searches for authoritative sources
3. Results are cached in mock filesystem
4. Use \`read_file\` to access verification results
5. Use \`save_critique\` to include in final critique if issues found

**Example:**
\`\`\`
fact_check({
  claim: "LangGraph was released in 2024",
  context: "The introduction states that LangGraph was first released in early 2024"
})
→ Stores: /research/critiques/fact_checks/langgraph_was_released_in_2024_check.json
→ Returns: Verification status with confidence level and sources

read_file({ filePath: "/research/critiques/fact_checks/langgraph_was_released_in_2024_check.json" })
→ Returns: Full verification results with sources
\`\`\`

**Important:**
- Focus on verifiable factual claims (dates, numbers, events)
- Avoid subjective statements that can't be fact-checked
- Multiple sources increase confidence level
- Note any discrepancies between claim and sources found

The verification results persist across agent turns and can be used for final critique compilation.`;

/**
 * Detailed description for evaluate_structure tool
 */
export const EVALUATE_STRUCTURE_DESCRIPTION = `Analyze the structure, organization, and flow of the research report.

**When to Use:**
- To assess overall report organization
- To check heading hierarchy and section balance
- To evaluate logical flow and transitions
- To identify structural weaknesses

**Input:**
- \`reportPath\`: Path to the report file (defaults to \`/final_report.md\`)

**Output:**
Stores analysis results in \`/research/critiques/structure_evaluation.json\` with:
- \`sectionCount\`: Number of main sections
- \`headingHierarchy\`: Array of headings with levels
- \`paragraphDistribution\`: Stats on paragraph count per section
- \`issues\`: Array of structural problems found
- \`recommendations\`: Specific suggestions for improvement
- \`score\`: Overall structure quality score (0-100)
- \`timestamp\`: When analysis was performed

**Analysis Includes:**
- Heading level consistency (no skipped levels)
- Section balance (no overly long or short sections)
- Logical progression of ideas
- Presence of introduction and conclusion
- Appropriate use of subsections
- Paragraph length and distribution

**Usage Pattern:**
1. Call \`evaluate_structure\` with report path
2. Tool analyzes markdown structure
3. Results stored in mock filesystem
4. Use \`read_file\` to access detailed results
5. Use \`save_critique\` to include in "structure" category

**Example:**
\`\`\`
evaluate_structure({ reportPath: "/final_report.md" })
→ Stores: /research/critiques/structure_evaluation.json
→ Returns: Structure score, issue count, and key recommendations

read_file({ filePath: "/research/critiques/structure_evaluation.json" })
→ Returns: Full structural analysis with detailed findings
\`\`\`

**Common Issues Detected:**
- Inconsistent heading hierarchy (e.g., H1 → H3 without H2)
- Unbalanced sections (one very long, others very short)
- Missing introduction or conclusion
- Too many or too few main sections
- Poor paragraph distribution

The structural analysis persists across agent turns for reference during critique compilation.`;

/**
 * Detailed description for analyze_completeness tool
 */
export const ANALYZE_COMPLETENESS_DESCRIPTION = `Evaluate whether the report comprehensively covers all aspects of the research topic.

**When to Use:**
- To check if report answers the original question
- To identify missing key areas or topics
- To assess depth and breadth of coverage
- To compare against planning artifacts

**Input:**
- \`reportPath\`: Path to the report file (defaults to \`/final_report.md\`)
- \`questionPath\`: Path to the question file (defaults to \`/question.txt\`)

**Output:**
Stores analysis results in \`/research/critiques/completeness_analysis.json\` with:
- \`coverageScore\`: Overall completeness score (0-100)
- \`coveredAreas\`: Array of topics adequately covered
- \`missingAreas\`: Array of expected topics not covered or under-covered
- \`recommendations\`: Specific areas needing expansion
- \`questionAlignment\`: How well report answers original question
- \`timestamp\`: When analysis was performed

**Analysis Process:**
1. Read original question to understand research goal
2. Extract key topics/areas from question
3. Read research plan (if available) from \`/research/plans/\`
4. Analyze report sections and coverage
5. Identify gaps between expected and actual coverage
6. Calculate completeness score

**Usage Pattern:**
1. Call \`analyze_completeness\` with report and question paths
2. Tool compares report against question requirements
3. Results stored in mock filesystem
4. Use \`read_file\` to access detailed results
5. Use \`save_critique\` to include in "completeness" category

**Example:**
\`\`\`
analyze_completeness({
  reportPath: "/final_report.md",
  questionPath: "/question.txt"
})
→ Stores: /research/critiques/completeness_analysis.json
→ Returns: Coverage score, covered areas, and missing areas

read_file({ filePath: "/research/critiques/completeness_analysis.json" })
→ Returns: Full completeness analysis with gap identification
\`\`\`

**Coverage Assessment:**
- High coverage (80-100%): All major areas well-covered
- Medium coverage (60-79%): Most areas covered, some gaps
- Low coverage (0-59%): Significant gaps or missing major areas

**Factors Considered:**
- Direct answer to research question
- Coverage of key subtopics
- Depth of analysis in each area
- Balance across different aspects
- Alignment with planning artifacts (if available)

The completeness analysis persists across agent turns for reference during critique compilation.`;

/**
 * Detailed description for save_critique tool
 */
export const SAVE_CRITIQUE_DESCRIPTION = `Save structured critique findings to the mock filesystem for final compilation.

**When to Use:**
- After identifying specific issues in the report
- To organize findings by category (structure, completeness, accuracy, clarity, citations)
- To persist critique results for later synthesis
- To build up comprehensive critique incrementally

**Input:**
- \`category\`: Critique category (structure, completeness, accuracy, clarity, citations)
- \`findings\`: Array of finding objects with:
  - \`issue\`: Description of the issue or observation
  - \`severity\`: "critical" | "high" | "medium" | "low"
  - \`suggestion\`: Specific recommendation for improvement
  - \`location\`: Where in report (section name, line number, etc.)
- \`metadata\`: Optional additional context (e.g., tool used, confidence level)

**Output:**
Stores critique in \`/research/critiques/{category}_critique.json\` with:
- \`category\`: Critique category
- \`findings\`: Array of structured findings
- \`totalIssues\`: Count of issues found
- \`severityBreakdown\`: Counts by severity level
- \`metadata\`: Additional context
- \`timestamp\`: When critique was saved

**Usage Pattern:**
1. Perform analysis using evaluation tools (structure, completeness, fact_check)
2. Identify specific issues and recommendations
3. Call \`save_critique\` with structured findings by category
4. Use \`read_file\` to access saved critique
5. Repeat for each category of critique
6. Synthesize all critiques into final response

**Example:**
\`\`\`
save_critique({
  category: "structure",
  findings: [
    {
      issue: "Inconsistent heading hierarchy in Implementation section",
      severity: "medium",
      suggestion: "Change H4 'Setup Process' to H3 to maintain proper hierarchy",
      location: "Implementation section, line 45"
    },
    {
      issue: "Introduction section too brief (only 1 paragraph)",
      severity: "high",
      suggestion: "Expand introduction to 3-4 paragraphs covering background, scope, and approach",
      location: "Introduction section"
    }
  ],
  metadata: { toolUsed: "evaluate_structure", confidence: "high" }
})
→ Stores: /research/critiques/structure_critique.json
→ Returns: Summary with issue count and severity breakdown
\`\`\`

**Multiple Saves:**
- Calling this tool multiple times for the same category will **append** new findings
- Existing findings are preserved and merged with new ones
- Severity breakdown is recalculated automatically

**Categories:**
- **structure**: Organization, flow, heading hierarchy, section balance
- **completeness**: Coverage of topic, missing areas, depth of analysis
- **accuracy**: Fact verification, citation quality, source reliability
- **clarity**: Writing quality, readability, technical terminology usage
- **citations**: Source formatting, citation completeness, reference quality

Critique findings persist across agent turns and can be accessed by parent agents for final compilation.`;

// Constants for magic numbers
const MAX_CLAIM_LENGTH = 60;
const MAX_FILENAME_LENGTH = 60;
const MARKDOWN_H1_PREFIX = "# ";
const MARKDOWN_H2_PREFIX = "## ";
const MARKDOWN_H3_PREFIX = "### ";
const MARKDOWN_H4_PREFIX = "#### ";
const MARKDOWN_H5_PREFIX = "##### ";
const MARKDOWN_H6_PREFIX = "###### ";
const MIN_SECTION_PARAGRAPHS = 3;
const MIN_SECTIONS_FOR_REPORT = 3;
const HIGH_COVERAGE_THRESHOLD = 80;
const MEDIUM_COVERAGE_THRESHOLD = 60;
const STRUCTURE_ISSUE_PENALTY = 5;
const MISSING_SECTION_PENALTY = 10;
const MIN_WORD_LENGTH = 3;
const HIGH_VERIFICATION_THRESHOLD = 0.7;
const MEDIUM_VERIFICATION_THRESHOLD = 0.5;
const SNIPPET_LENGTH = 200;
const MAX_SEARCH_RESULTS = 5;
const PERCENTAGE_MULTIPLIER = 100;
const DEFAULT_COVERAGE_SCORE = 100;

// Regex patterns at top level
const WORD_SPLIT_REGEX = /\s+/;
const SANITIZE_REGEX = /[^a-z0-9]+/g;
const TRIM_UNDERSCORES_REGEX = /^_+|_+$/g;
const QUESTION_SPLIT_REGEX = /[.!?]/;
const EXCLUDED_WORDS = ["what", "how", "why", "when"];

/**
 * Helper function to sanitize claim for filesystem paths
 */
function sanitizeClaimForPath(claim: string): string {
  return claim
    .toLowerCase()
    .replace(SANITIZE_REGEX, "_")
    .replace(TRIM_UNDERSCORES_REGEX, "")
    .substring(0, MAX_CLAIM_LENGTH);
}

/**
 * Helper function to sanitize category for filesystem paths
 */
function sanitizeCategoryForPath(category: string): string {
  return category
    .toLowerCase()
    .replace(SANITIZE_REGEX, "_")
    .replace(TRIM_UNDERSCORES_REGEX, "")
    .substring(0, MAX_FILENAME_LENGTH);
}

/**
 * Helper function to detect heading level and extract title
 */
function detectHeading(line: string): { level: number; title: string } | null {
  const trimmedLine = line.trim();

  if (trimmedLine.startsWith(MARKDOWN_H6_PREFIX)) {
    return {
      level: 6,
      title: trimmedLine.slice(MARKDOWN_H6_PREFIX.length).trim(),
    };
  }
  if (trimmedLine.startsWith(MARKDOWN_H5_PREFIX)) {
    return {
      level: 5,
      title: trimmedLine.slice(MARKDOWN_H5_PREFIX.length).trim(),
    };
  }
  if (trimmedLine.startsWith(MARKDOWN_H4_PREFIX)) {
    return {
      level: 4,
      title: trimmedLine.slice(MARKDOWN_H4_PREFIX.length).trim(),
    };
  }
  if (trimmedLine.startsWith(MARKDOWN_H3_PREFIX)) {
    return {
      level: 3,
      title: trimmedLine.slice(MARKDOWN_H3_PREFIX.length).trim(),
    };
  }
  if (trimmedLine.startsWith(MARKDOWN_H2_PREFIX)) {
    return {
      level: 2,
      title: trimmedLine.slice(MARKDOWN_H2_PREFIX.length).trim(),
    };
  }
  if (trimmedLine.startsWith(MARKDOWN_H1_PREFIX)) {
    return {
      level: 1,
      title: trimmedLine.slice(MARKDOWN_H1_PREFIX.length).trim(),
    };
  }

  return null;
}

/**
 * Helper function to check if a line is a paragraph
 */
function isParagraph(line: string): boolean {
  const trimmedLine = line.trim();
  return (
    trimmedLine.length > 0 &&
    !trimmedLine.startsWith("#") &&
    !trimmedLine.startsWith("-") &&
    !trimmedLine.startsWith("*")
  );
}

/**
 * Helper function to count words in a line
 */
function countWordsInLine(line: string): number {
  return line.split(WORD_SPLIT_REGEX).filter((w) => w.length > 0).length;
}

/**
 * Helper function to parse markdown structure
 */
function parseMarkdownStructure(content: string): {
  sections: Array<{ level: number; title: string; lineNumber: number }>;
  paragraphCount: number;
  wordCount: number;
  paragraphsPerSection: Record<string, number>;
} {
  const lines = content.split("\n");
  const sections: Array<{ level: number; title: string; lineNumber: number }> =
    [];
  let paragraphCount = 0;
  let wordCount = 0;
  const paragraphsPerSection: Record<string, number> = {};
  let currentSection = "Introduction";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    const trimmedLine = line.trim();

    // Detect headings
    const heading = detectHeading(line);
    if (heading) {
      sections.push({
        level: heading.level,
        title: heading.title,
        lineNumber: i + 1,
      });
      currentSection = heading.title;
      paragraphsPerSection[currentSection] = 0;
      continue;
    }

    // Count paragraphs (non-empty lines that aren't headings or list items)
    if (isParagraph(line)) {
      paragraphCount++;
      paragraphsPerSection[currentSection] =
        (paragraphsPerSection[currentSection] || 0) + 1;
    }

    // Count words
    wordCount += countWordsInLine(trimmedLine);
  }

  return {
    sections,
    paragraphCount,
    wordCount,
    paragraphsPerSection,
  };
}

/**
 * Helper function to evaluate structure and identify issues
 */
function evaluateStructureQuality(
  sections: Array<{ level: number; title: string; lineNumber: number }>,
  paragraphsPerSection: Record<string, number>
): {
  issues: Array<{ issue: string; severity: string; location: string }>;
  recommendations: string[];
  score: number;
} {
  const issues: Array<{ issue: string; severity: string; location: string }> =
    [];
  const recommendations: string[] = [];
  let score = 100;

  // Check for heading hierarchy issues
  for (let i = 1; i < sections.length; i++) {
    const prev = sections[i - 1];
    const current = sections[i];
    if (!(prev && current)) {
      continue;
    }

    if (current.level - prev.level > 1) {
      issues.push({
        issue: `Skipped heading level from H${prev.level} to H${current.level}`,
        severity: "medium",
        location: `Line ${current.lineNumber} (${current.title})`,
      });
      score -= STRUCTURE_ISSUE_PENALTY;
    }
  }

  // Check for missing introduction
  const hasIntroduction = sections.some(
    (s) =>
      s.title.toLowerCase().includes("introduction") ||
      s.title.toLowerCase().includes("overview")
  );
  if (!hasIntroduction) {
    issues.push({
      issue: "Missing clear introduction section",
      severity: "high",
      location: "Beginning of report",
    });
    recommendations.push(
      "Add an introduction section to provide context and overview"
    );
    score -= MISSING_SECTION_PENALTY;
  }

  // Check for missing conclusion
  const hasConclusion = sections.some(
    (s) =>
      s.title.toLowerCase().includes("conclusion") ||
      s.title.toLowerCase().includes("summary")
  );
  if (!hasConclusion) {
    issues.push({
      issue: "Missing conclusion or summary section",
      severity: "high",
      location: "End of report",
    });
    recommendations.push(
      "Add a conclusion section to summarize findings and insights"
    );
    score -= MISSING_SECTION_PENALTY;
  }

  // Check for very short sections
  for (const [section, count] of Object.entries(paragraphsPerSection)) {
    if (count < MIN_SECTION_PARAGRAPHS && section !== "Introduction") {
      issues.push({
        issue: `Section "${section}" has only ${count} paragraph(s)`,
        severity: "medium",
        location: section,
      });
      recommendations.push(`Expand "${section}" section with more detail`);
      score -= STRUCTURE_ISSUE_PENALTY;
    }
  }

  // Check for too few main sections
  const mainSections = sections.filter((s) => s.level <= 2);
  if (mainSections.length < MIN_SECTIONS_FOR_REPORT) {
    issues.push({
      issue: `Report has only ${mainSections.length} main section(s)`,
      severity: "high",
      location: "Overall structure",
    });
    recommendations.push(
      "Break down content into more main sections for better organization"
    );
    score -= MISSING_SECTION_PENALTY;
  }

  return {
    issues,
    recommendations,
    score: Math.max(0, score),
  };
}

/**
 * Helper function to calculate completeness score
 */
function calculateCompletenessScore(
  report: string,
  question: string,
  expectedAreas: string[]
): {
  score: number;
  coveredAreas: string[];
  missingAreas: string[];
  questionAlignment: string;
} {
  const reportLower = report.toLowerCase();
  const questionLower = question.toLowerCase();

  // Extract key terms from question
  const questionTerms = questionLower
    .split(WORD_SPLIT_REGEX)
    .filter((w) => w.length > MIN_WORD_LENGTH && !EXCLUDED_WORDS.includes(w));

  // Check coverage of question terms
  const coveredTerms = questionTerms.filter((term) =>
    reportLower.includes(term)
  );
  const termCoverageScore =
    questionTerms.length > 0
      ? (coveredTerms.length / questionTerms.length) * PERCENTAGE_MULTIPLIER
      : DEFAULT_COVERAGE_SCORE;

  // Check coverage of expected areas
  const coveredAreas: string[] = [];
  const missingAreas: string[] = [];

  for (const area of expectedAreas) {
    if (reportLower.includes(area.toLowerCase())) {
      coveredAreas.push(area);
    } else {
      missingAreas.push(area);
    }
  }

  const areaCoverageScore =
    expectedAreas.length > 0
      ? (coveredAreas.length / expectedAreas.length) * PERCENTAGE_MULTIPLIER
      : DEFAULT_COVERAGE_SCORE;

  // Average the scores
  const score = Math.round((termCoverageScore + areaCoverageScore) / 2);

  // Determine alignment
  let questionAlignment = "excellent";
  if (score < HIGH_COVERAGE_THRESHOLD) {
    questionAlignment = "good";
  }
  if (score < MEDIUM_COVERAGE_THRESHOLD) {
    questionAlignment = "needs improvement";
  }

  return {
    score,
    coveredAreas,
    missingAreas,
    questionAlignment,
  };
}

/**
 * Helper function to analyze verification results
 */
function analyzeVerificationResults(
  searchResult: {
    results: Record<string, unknown>[];
    answer?: string | null;
    error?: string;
  },
  claim: string
): {
  verified: boolean;
  confidence: "high" | "medium" | "low";
  notes: string;
} {
  const hasResults = searchResult.results.length > 0;
  const hasAnswer = !!searchResult.answer && !searchResult.error;

  if (hasAnswer && hasResults) {
    // Check if answer supports the claim
    const answerLower = searchResult.answer?.toLowerCase() || "";
    const claimLower = claim.toLowerCase();
    const claimTerms = claimLower
      .split(WORD_SPLIT_REGEX)
      .filter((w) => w.length > MIN_WORD_LENGTH);
    const matchingTerms = claimTerms.filter((term) =>
      answerLower.includes(term)
    );

    if (
      matchingTerms.length >=
      claimTerms.length * HIGH_VERIFICATION_THRESHOLD
    ) {
      return {
        verified: true,
        confidence: "high",
        notes:
          "Multiple sources confirm this claim with consistent information.",
      };
    }

    if (
      matchingTerms.length >=
      claimTerms.length * MEDIUM_VERIFICATION_THRESHOLD
    ) {
      return {
        verified: true,
        confidence: "medium",
        notes:
          "Some sources support this claim but with minor variations or incomplete information.",
      };
    }

    return {
      verified: false,
      confidence: "low",
      notes:
        "Unable to find strong verification for this claim. May need manual review.",
    };
  }

  if (hasResults) {
    return {
      verified: true,
      confidence: "medium",
      notes:
        "Found related sources but no synthesized answer. Manual verification recommended.",
    };
  }

  return {
    verified: false,
    confidence: "low",
    notes: searchResult.error
      ? `Search error: ${searchResult.error}`
      : "No authoritative sources found to verify this claim.",
  };
}

/**
 * Fact check tool - verifies claims against authoritative sources
 */
export const factCheck = tool(
  async (input: unknown, config: ToolRunnableConfig) => {
    const state = getCurrentTaskInput<DeepAgentStateType>();
    const files = { ...(state.files || {}) };
    const { claim, context } = input as { claim: string; context?: string };

    // Perform search to verify claim
    const searchArgs: TavilySearchArgs = {
      query: claim,
      maxResults: MAX_SEARCH_RESULTS,
      includeAnswer: true,
      searchDepth: "advanced",
    };

    const searchResult = await performTavilySearch(searchArgs, {
      toolName: "fact_check",
    });

    // Analyze results for verification
    const { verified, confidence, notes } = analyzeVerificationResults(
      searchResult,
      claim
    );

    // Store results in mock filesystem
    const sanitizedClaim = sanitizeClaimForPath(claim);
    const filePath = `/research/critiques/fact_checks/${sanitizedClaim}_check.json`;

    const verificationResult = {
      claim,
      context: context || "",
      verified,
      sources: searchResult.results.map((r) => ({
        title: r.title || "Untitled",
        url: r.url,
        snippet: r.content?.substring(0, SNIPPET_LENGTH) || "",
      })),
      synthesizedAnswer: searchResult.answer || null,
      confidence,
      notes,
      timestamp: new Date().toISOString(),
    };

    files[filePath] = JSON.stringify(verificationResult, null, 2);

    const statusText = verified ? "✓ Verified" : "✗ Not verified";
    const messageContent = `Fact check completed: ${statusText}

Claim: "${claim}"
Confidence: ${confidence}
Sources Found: ${searchResult.results.length}

Result saved to: ${filePath}
Use read_file to access full verification details: read_file({ filePath: "${filePath}" })

${notes}`;

    return new Command({
      update: {
        files,
        messages: [
          new ToolMessage({
            content: messageContent,
            // biome-ignore lint: tool_call_id is required by ToolMessage interface
            tool_call_id: config.toolCall?.id as string,
          }),
        ],
      },
    });
  },
  {
    name: "fact_check",
    description: FACT_CHECK_DESCRIPTION,
    schema: z.object({
      claim: z.string().describe("The specific claim or fact to verify"),
      context: z
        .string()
        .optional()
        .describe("Optional surrounding context from the report"),
    }),
  }
);

/**
 * Evaluate structure tool - analyzes report structure and organization
 */
export const evaluateStructure = tool(
  (input: unknown, config: ToolRunnableConfig) => {
    const state = getCurrentTaskInput<DeepAgentStateType>();
    const files = { ...(state.files || {}) };
    const { reportPath } = input as { reportPath: string };

    // Read report from mock filesystem
    const report = files[reportPath] || "";
    if (!report) {
      return new Command({
        update: {
          files,
          messages: [
            new ToolMessage({
              content: `Error: Report not found at ${reportPath}. Use read_file first to ensure the report exists.`,
              // biome-ignore lint: tool_call_id is required by ToolMessage interface
              tool_call_id: config.toolCall?.id as string,
            }),
          ],
        },
      });
    }

    // Parse structure
    const { sections, paragraphCount, wordCount, paragraphsPerSection } =
      parseMarkdownStructure(report);

    // Evaluate quality
    const { issues, recommendations, score } = evaluateStructureQuality(
      sections,
      paragraphsPerSection
    );

    // Store results
    const filePath = "/research/critiques/structure_evaluation.json";
    const evaluationResult = {
      reportPath,
      sectionCount: sections.length,
      mainSections: sections.filter((s) => s.level <= 2).length,
      headingHierarchy: sections.map((s) => ({
        level: s.level,
        title: s.title,
        line: s.lineNumber,
      })),
      paragraphCount,
      wordCount,
      paragraphsPerSection,
      issues,
      recommendations,
      score,
      timestamp: new Date().toISOString(),
    };

    files[filePath] = JSON.stringify(evaluationResult, null, 2);

    const messageContent = `Structure evaluation completed

Overall Score: ${score}/100
Sections: ${sections.length} total (${sections.filter((s) => s.level <= 2).length} main)
Paragraphs: ${paragraphCount}
Words: ${wordCount}
Issues Found: ${issues.length}

Result saved to: ${filePath}
Use read_file to access full evaluation: read_file({ filePath: "${filePath}" })`;

    return new Command({
      update: {
        files,
        messages: [
          new ToolMessage({
            content: messageContent,
            // biome-ignore lint: tool_call_id is required by ToolMessage interface
            tool_call_id: config.toolCall?.id as string,
          }),
        ],
      },
    });
  },
  {
    name: "evaluate_structure",
    description: EVALUATE_STRUCTURE_DESCRIPTION,
    schema: z.object({
      reportPath: z
        .string()
        .default("/final_report.md")
        .describe("Path to the report file (defaults to /final_report.md)"),
    }),
  }
);

/**
 * Analyze completeness tool - evaluates report coverage and completeness
 */
export const analyzeCompleteness = tool(
  (input: unknown, config: ToolRunnableConfig) => {
    const state = getCurrentTaskInput<DeepAgentStateType>();
    const files = { ...(state.files || {}) };
    const { reportPath, questionPath } = input as {
      reportPath: string;
      questionPath: string;
    };

    // Read report and question
    const report = files[reportPath] || "";
    const question = files[questionPath] || "";

    if (!report) {
      return new Command({
        update: {
          files,
          messages: [
            new ToolMessage({
              content: `Error: Report not found at ${reportPath}`,
              // biome-ignore lint: tool_call_id is required by ToolMessage interface
              tool_call_id: config.toolCall?.id as string,
            }),
          ],
        },
      });
    }

    if (!question) {
      return new Command({
        update: {
          files,
          messages: [
            new ToolMessage({
              content: `Error: Question not found at ${questionPath}`,
              // biome-ignore lint: tool_call_id is required by ToolMessage interface
              tool_call_id: config.toolCall?.id as string,
            }),
          ],
        },
      });
    }

    // Try to read planning artifacts for expected areas
    let expectedAreas: string[] = [];
    const topicAnalysisFiles = Object.keys(files).filter(
      (path) =>
        path.includes("/research/plans/") && path.includes("_analysis.json")
    );

    if (topicAnalysisFiles.length > 0) {
      try {
        const analysisPath = topicAnalysisFiles[0];
        if (!analysisPath) {
          throw new Error("No analysis path found");
        }
        const fileContent = files[analysisPath] || "{}";
        const analysisData = JSON.parse(fileContent);
        expectedAreas = analysisData.researchAreas || [];
      } catch {
        // Ignore parsing errors
      }
    }

    // If no planning artifacts, extract from question
    if (expectedAreas.length === 0) {
      expectedAreas = question
        .split(QUESTION_SPLIT_REGEX)
        .filter((s) => s.trim().length > 0)
        .map((s) => s.trim());
    }

    // Calculate completeness
    const { score, coveredAreas, missingAreas, questionAlignment } =
      calculateCompletenessScore(report, question, expectedAreas);

    // Store results
    const filePath = "/research/critiques/completeness_analysis.json";
    const analysisResult = {
      reportPath,
      questionPath,
      coverageScore: score,
      coveredAreas,
      missingAreas,
      recommendations: missingAreas.map(
        (area) => `Add more coverage for: ${area}`
      ),
      questionAlignment,
      expectedAreaCount: expectedAreas.length,
      coveredAreaCount: coveredAreas.length,
      timestamp: new Date().toISOString(),
    };

    files[filePath] = JSON.stringify(analysisResult, null, 2);

    const messageContent = `Completeness analysis completed

Coverage Score: ${score}/100
Question Alignment: ${questionAlignment}
Covered Areas: ${coveredAreas.length}/${expectedAreas.length}
Missing Areas: ${missingAreas.length}

Result saved to: ${filePath}
Use read_file to access full analysis: read_file({ filePath: "${filePath}" })

${missingAreas.length > 0 ? `\nMissing areas:\n${missingAreas.map((a) => `- ${a}`).join("\n")}` : ""}`;

    return new Command({
      update: {
        files,
        messages: [
          new ToolMessage({
            content: messageContent,
            // biome-ignore lint: tool_call_id is required by ToolMessage interface
            tool_call_id: config.toolCall?.id as string,
          }),
        ],
      },
    });
  },
  {
    name: "analyze_completeness",
    description: ANALYZE_COMPLETENESS_DESCRIPTION,
    schema: z.object({
      reportPath: z
        .string()
        .default("/final_report.md")
        .describe("Path to the report file (defaults to /final_report.md)"),
      questionPath: z
        .string()
        .default("/question.txt")
        .describe("Path to the question file (defaults to /question.txt)"),
    }),
  }
);

/**
 * Save critique tool - stores structured critique findings
 */
export const saveCritique = tool(
  (input: unknown, config: ToolRunnableConfig) => {
    const state = getCurrentTaskInput<DeepAgentStateType>();
    const files = { ...(state.files || {}) };
    const { category, findings, metadata } = input as {
      category: string;
      findings: Array<{
        issue: string;
        severity: string;
        suggestion: string;
        location: string;
      }>;
      metadata?: Record<string, unknown>;
    };

    // Sanitize category for file path
    const sanitizedCategory = sanitizeCategoryForPath(category);
    const filePath = `/research/critiques/${sanitizedCategory}_critique.json`;

    // Check if critique file already exists
    let existingFindings: Array<{
      issue: string;
      severity: string;
      suggestion: string;
      location: string;
    }> = [];
    let existingMetadata: Record<string, unknown> = {};

    if (filePath in files) {
      try {
        const existing = JSON.parse(files[filePath] || "{}");
        existingFindings = existing.findings || [];
        existingMetadata = existing.metadata || {};
      } catch {
        // If parsing fails, start fresh
      }
    }

    // Merge new findings with existing
    const mergedFindings = [...existingFindings, ...findings];

    // Calculate severity breakdown
    const severityBreakdown = {
      critical: mergedFindings.filter((f) => f.severity === "critical").length,
      high: mergedFindings.filter((f) => f.severity === "high").length,
      medium: mergedFindings.filter((f) => f.severity === "medium").length,
      low: mergedFindings.filter((f) => f.severity === "low").length,
    };

    // Merge metadata
    const mergedMetadata = { ...existingMetadata, ...metadata };

    // Create critique result
    const critiqueResult = {
      category,
      findings: mergedFindings,
      totalIssues: mergedFindings.length,
      severityBreakdown,
      metadata: mergedMetadata,
      timestamp: new Date().toISOString(),
    };

    // Store in mock filesystem
    files[filePath] = JSON.stringify(critiqueResult, null, 2);

    return new Command({
      update: {
        files,
        messages: [
          new ToolMessage({
            content: `Critique saved to ${filePath}

Category: ${category}
New Findings: ${findings.length}
Total Findings: ${mergedFindings.length}
Severity Breakdown:
- Critical: ${severityBreakdown.critical}
- High: ${severityBreakdown.high}
- Medium: ${severityBreakdown.medium}
- Low: ${severityBreakdown.low}

Use read_file to access critique: read_file({ filePath: "${filePath}" })`,
            // biome-ignore lint: tool_call_id is required by ToolMessage interface
            tool_call_id: config.toolCall?.id as string,
          }),
        ],
      },
    });
  },
  {
    name: "save_critique",
    description: SAVE_CRITIQUE_DESCRIPTION,
    schema: z.object({
      category: z
        .string()
        .describe(
          "Critique category (structure, completeness, accuracy, clarity, citations)"
        ),
      findings: z
        .array(
          z.object({
            issue: z.string().describe("Description of the issue"),
            severity: z
              .enum(["critical", "high", "medium", "low"])
              .describe("Severity level of the issue"),
            suggestion: z
              .string()
              .describe("Specific recommendation for improvement"),
            location: z
              .string()
              .describe("Where in report (section name, line number)"),
          })
        )
        .describe("Array of structured findings"),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe("Optional additional context"),
    }),
  }
);

/**
 * Critique tools collection
 */
export const critiqueTools = [
  factCheck,
  evaluateStructure,
  analyzeCompleteness,
  saveCritique,
];

/**
 * Message modifier for adding critique system prompts
 */
export const critiqueMessageModifier = (message: string) =>
  message + CRITIQUE_SYSTEM_PROMPT;
