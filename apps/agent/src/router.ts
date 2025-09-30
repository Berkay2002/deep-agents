// Agent selection and routing logic
import type { BaseMessage } from "@langchain/core/messages";
import { createAgent } from "./agents/index.js";
import type { AgentType, AgentSelectionResult } from "./shared/types.js";

// TODO: Implement LLM-based agent routing
// Currently using keyword-based routing, but should upgrade to:
// 1. Use lightweight LLM (gemini-1.5-flash) for intent analysis
// 2. Consider conversation context and user history
// 3. Provide better confidence scoring
// 4. Handle ambiguous queries more intelligently
// 5. Cache routing decisions for performance
// 6. A/B test against current keyword approach

/**
 * Analyze message content to determine the best agent type
 * @param content Message content to analyze
 * @returns Scores for each agent type
 */
function analyzeContent(content: string): Record<AgentType, number> {
  const text = content.toLowerCase();
  
  const scores: Record<AgentType, number> = {
    "deep-research": 0.2, // Base score
    "code-assistant": 0.1,
    "general-chat": 0.3, // Default fallback
  };

  // Research keywords
  const researchKeywords = [
    "research", "analyze", "analysis", "report", "study", "investigate",
    "compare", "comparison", "explore", "examine", "review", "survey",
    "thesis", "paper", "article", "academic", "scholarly", "citation",
    "source", "evidence", "data", "statistics", "trends", "market"
  ];
  
  const researchMatches = researchKeywords.filter(keyword => 
    text.includes(keyword)
  ).length;
  scores["deep-research"] += researchMatches * 0.3;

  // Code keywords
  const codeKeywords = [
    "code", "coding", "program", "programming", "debug", "bug", "error",
    "function", "method", "class", "variable", "algorithm", "refactor",
    "typescript", "javascript", "python", "java", "react", "node",
    "api", "database", "sql", "html", "css", "framework", "library",
    "compile", "syntax", "test", "testing", "unit test", "integration",
    "architecture", "design pattern", "optimization", "performance"
  ];
  
  const codeMatches = codeKeywords.filter(keyword => 
    text.includes(keyword)
  ).length;
  scores["code-assistant"] += codeMatches * 0.4;

  // If it's clearly asking for code help, boost code assistant
  if (text.includes("fix") && (text.includes("code") || text.includes("bug"))) {
    scores["code-assistant"] += 0.5;
  }
  
  // If asking for a detailed report or analysis, boost research
  if ((text.includes("write") || text.includes("create")) && 
      (text.includes("report") || text.includes("analysis"))) {
    scores["deep-research"] += 0.6;
  }

  return scores;
}

// TODO: Implement LLM-based content analysis
// async function llmBasedAnalyzeContent(messages: BaseMessage[]): Promise<AgentSelectionResult> {
//   const routingModel = createAgentModel(0.1);
//   const prompt = `Analyze this conversation and determine the best agent:
//   - deep-research: For research, analysis, reports, academic work
//   - code-assistant: For programming, debugging, code review
//   - general-chat: For casual conversation, general questions
//   
//   Conversation: ${messages.map(m => m.content).join('\n')}
//   
//   Respond with JSON: {"agent": "agent-type", "confidence": 0.0-1.0, "reasoning": "explanation"}`;
//   
//   // Implementation would call LLM and parse response
// }

/**
 * Select the best agent for handling the given messages
 * @param messages Conversation messages
 * @param preferredType Optional preferred agent type
 * @returns Agent selection result
 */
export async function selectAgent(
  messages: BaseMessage[],
  preferredType?: AgentType
): Promise<AgentSelectionResult> {
  // If user specifies preferred type, use it
  if (preferredType) {
    try {
      const agent = await createAgent(preferredType);
      return {
        agent,
        type: preferredType,
        confidence: 1.0,
        reasoning: "User-specified agent type"
      };
    } catch (error) {
      console.warn(`Failed to create preferred agent ${preferredType}:`, error);
      // Fall through to automatic selection
    }
  }

  // TODO: Add toggle between keyword-based and LLM-based routing
  // if (process.env.USE_LLM_ROUTING === 'true') {
  //   return llmBasedAnalyzeContent(messages);
  // }

  // Analyze the latest messages to determine best agent
  const recentMessages = messages.slice(-3); // Look at last 3 messages
  const combinedContent = recentMessages
    .map(msg => msg.content.toString())
    .join(" ");
  
  const scores = analyzeContent(combinedContent);
  
  // Find the highest scoring agent
  const sortedAgents = Object.entries(scores)
    .sort(([, a], [, b]) => b - a)
    .map(([type, score]) => ({ type: type as AgentType, score }));
    
  const selectedAgent = sortedAgents[0];
  const agent = await createAgent(selectedAgent.type);
  
  // Generate reasoning based on the selection
  let reasoning = "Selected based on message content analysis";
  if (selectedAgent.score > 0.7) {
    reasoning = `Strong match for ${selectedAgent.type} based on keywords and context`;
  } else if (selectedAgent.score > 0.4) {
    reasoning = `Moderate match for ${selectedAgent.type} based on content`;
  } else {
    reasoning = `Default selection of ${selectedAgent.type} (no strong indicators found)`;
  }
  
  return {
    agent,
    type: selectedAgent.type,
    confidence: Math.min(selectedAgent.score, 1.0),
    reasoning
  };
}

/**
 * Get routing analysis without creating an agent (for debugging)
 * @param messages Conversation messages
 * @returns Analysis of which agent would be selected
 */
export function analyzeRouting(messages: BaseMessage[]) {
  const recentMessages = messages.slice(-3);
  const combinedContent = recentMessages
    .map(msg => msg.content.toString())
    .join(" ");
  
  const scores = analyzeContent(combinedContent);
  
  return {
    content: combinedContent,
    scores,
    recommended: Object.entries(scores)
      .sort(([, a], [, b]) => b - a)[0][0] as AgentType
  };
}
