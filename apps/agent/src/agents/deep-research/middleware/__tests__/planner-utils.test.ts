import assert from "node:assert/strict";
import test from "node:test";
import type { ScopeDocument, TopicAnalysisDocument } from "../planner/documents.js";
import { buildInitialPlan } from "../planner/documents.js";
import { plannerPaths } from "../planner/paths.js";

test("plannerPaths normalizes topics and builds canonical paths", () => {
  const result = plannerPaths("NVIDIA Stock");

  assert.equal(result.slug, "nvidia_stock");
  assert.equal(result.originalSlug, "nvidia_stock");
  assert.equal(result.analysis, "/research/plans/nvidia_stock_analysis.json");
  assert.equal(result.scope, "/research/plans/nvidia_stock_scope.json");
  assert.equal(result.plan, "/research/plans/nvidia_stock_plan.json");
  assert.equal(result.metadata, "/research/plans/nvidia_stock_paths.json");
  assert.equal(result.truncated, false);
  assert.equal(result.maxLength, 60);
});

test("plannerPaths handles empty topics by falling back to a default slug", () => {
  const result = plannerPaths("   ");

  assert.equal(result.slug, "topic");
  assert.equal(result.originalSlug, "topic");
  assert.equal(result.dir, "/research/plans");
});

test("plannerPaths truncates long topics and records truncation metadata", () => {
  const longTopic =
    "Enterprise platform modernization strategy for multinational conglomerate";
  const truncatedLength = 16;
  const result = plannerPaths(longTopic, { maxLength: truncatedLength });

  assert.equal(result.slug.length, truncatedLength);
  assert.equal(result.truncated, true);
  assert.ok(result.originalSlug.startsWith("enterprise_platform"));
  assert.equal(result.maxLength, truncatedLength);
});

test("buildInitialPlan combines analysis and scope into a structured plan", () => {
  const paths = plannerPaths("Comprehensive AI adoption roadmap");
  const analysis: TopicAnalysisDocument = {
    topic: "Comprehensive AI adoption roadmap",
    context: "Global manufacturing company",
    topicType: "business",
    complexity: "high",
    researchAreas: ["Strategy alignment", "Change management"],
    suggestedSources: ["McKinsey", "MIT Sloan"],
    estimatedTimeframe: "2 weeks",
    timestamp: new Date("2025-01-01T00:00:00.000Z").toISOString(),
  };
  const scope: ScopeDocument = {
    topic: analysis.topic,
    estimatedTotalHours: 24,
    researchTasks: [
      {
        area: "Strategy alignment",
        estimatedTime: 8,
        priority: "high",
      },
      {
        area: "Technology assessment",
        estimatedTime: 6,
        priority: "medium",
      },
    ],
    suggestedMilestones: [
      "Baseline current capabilities",
      "Define success metrics",
    ],
    resourceRequirements: { stakeholders: ["CIO", "Head of Operations"] },
    timestamp: new Date("2025-01-02T00:00:00.000Z").toISOString(),
  };

  const plan = buildInitialPlan({ paths, analysis, scope });

  assert.equal(plan.topic, analysis.topic);
  assert.equal(plan.metadata.slug, paths.slug);
  assert.deepEqual(plan.metadata.paths, paths);
  assert.equal(plan.metadata.truncatedSlug, paths.truncated);
  assert.ok(Number.isFinite(Date.parse(plan.metadata.createdAt)));

  assert.deepEqual(plan.summary, {
    context: analysis.context ?? "",
    topicType: analysis.topicType,
    complexity: analysis.complexity,
    estimatedTimeframe: analysis.estimatedTimeframe,
  });

  assert.deepEqual(plan.researchAreas, analysis.researchAreas);
  assert.deepEqual(plan.suggestedSources, analysis.suggestedSources);
  assert.deepEqual(plan.tasks, scope.researchTasks);
  assert.deepEqual(plan.milestones, scope.suggestedMilestones);
  assert.deepEqual(plan.resources, scope.resourceRequirements);

  assert.ok(plan.workflow.includes("Deep dive on Strategy alignment"));
  assert.ok(plan.workflow.includes("Validate coverage for Change management"));
  assert.equal(plan.workflow[0], "Review topic analysis");
});
