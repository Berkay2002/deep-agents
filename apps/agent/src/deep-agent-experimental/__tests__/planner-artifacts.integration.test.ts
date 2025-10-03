import assert from "node:assert/strict";
import test from "node:test";
import type { ToolRunnableConfig } from "@langchain/core/tools";
import type {
  ScopeDocument,
  TopicAnalysisDocument,
} from "../../agents/deep-research/middleware/planner/documents.js";
import { buildInitialPlan } from "../../agents/deep-research/middleware/planner/documents.js";
import { plannerPaths } from "../../agents/deep-research/middleware/planner/paths.js";
import { plannerArtifactUtils } from "../sub-agent.js";

test("planner artifacts registry is populated and validated for downstream agents", () => {
  const topic = "Enterprise research initiative";
  const paths = plannerPaths(topic);
  const analysis: TopicAnalysisDocument = {
    topic,
    context: "Global expansion",
    topicType: "business",
    complexity: "medium",
    researchAreas: ["Market sizing", "Competitive analysis"],
    suggestedSources: ["Gartner", "Statista"],
    estimatedTimeframe: "4 hours",
    timestamp: new Date("2025-01-05T00:00:00.000Z").toISOString(),
  };
  const scope: ScopeDocument = {
    topic,
    estimatedTotalHours: 10,
    researchTasks: [
      { area: "Market sizing", estimatedTime: 4, priority: "high" },
      { area: "Competitive analysis", estimatedTime: 3, priority: "medium" },
    ],
    suggestedMilestones: ["Assemble sources", "Summarize findings"],
    resourceRequirements: { apis: ["Tavily", "Exa"] },
    timestamp: new Date("2025-01-06T00:00:00.000Z").toISOString(),
  };

  const planDocument = buildInitialPlan({ paths, analysis, scope });
  const baseFiles: Record<string, string> = {
    [paths.analysis]: JSON.stringify(analysis, null, 2),
    [paths.scope]: JSON.stringify(scope, null, 2),
    [paths.plan]: JSON.stringify(planDocument, null, 2),
  };

  const metadata = {
    topic,
    originalSlug: paths.originalSlug,
    truncated: paths.truncated,
    warnings: [],
    paths,
    timestamps: {
      analysis: analysis.timestamp,
      scope: scope.timestamp,
      plan: planDocument.metadata.createdAt,
    },
    artifacts: {
      analysis: { path: paths.analysis, timestamp: analysis.timestamp },
      scope: { path: paths.scope, timestamp: scope.timestamp },
      plan: {
        path: paths.plan,
        timestamp: planDocument.metadata.createdAt,
        tasks: planDocument.tasks.length,
      },
    },
  };

  const filesAfterPlanner = { ...baseFiles };
  filesAfterPlanner[paths.metadata] = JSON.stringify(metadata, null, 2);

  const pointerEntry = plannerArtifactUtils.applyPlannerArtifactsUpdate(
    {},
    filesAfterPlanner
  );

  assert.ok(pointerEntry);
  assert.equal(pointerEntry.slug, paths.slug);
  assert.ok(filesAfterPlanner[plannerArtifactUtils.registryPath]);
  assert.ok(filesAfterPlanner[plannerArtifactUtils.pointerPath]);

  const plannerState = { ...filesAfterPlanner };
  const config = { toolCall: { id: "test-call" } } as ToolRunnableConfig;
  const gateResult = plannerArtifactUtils.ensurePlannerArtifactsAvailable(
    "research-agent",
    plannerState,
    config
  );

  assert.equal(gateResult, null);

  delete plannerState[paths.plan];
  const missingCommand = plannerArtifactUtils.ensurePlannerArtifactsAvailable(
    "research-agent",
    plannerState,
    config
  );

  assert.ok(missingCommand);
  const update = (missingCommand as { update?: Record<string, unknown> })
    .update;
  assert.ok(update);
  const messages = update.messages as Array<{ content: string }>;
  assert.ok(Array.isArray(messages));
  assert.ok(messages.length > 0, "Expected tool command to include messages");
  const firstContent = messages[0]?.content ?? "";
  assert.ok(firstContent.includes("MissingArtifact"));
  assert.ok(firstContent.includes(paths.plan));
});
