import type { PlannerPaths } from "./planner-paths.js";

export type TopicAnalysisDocument = {
  topic: string;
  context?: string;
  topicType: string;
  complexity: string;
  researchAreas: string[];
  suggestedSources: string[];
  estimatedTimeframe: string;
  timestamp: string;
};

export type ScopeDocument = {
  topic: string;
  estimatedTotalHours: number;
  researchTasks: Array<{
    area: string;
    estimatedTime: number;
    priority: "high" | "medium" | "low";
  }>;
  suggestedMilestones: string[];
  resourceRequirements: Record<string, unknown>;
  timestamp: string;
};

export type InitialPlanDocument = {
  topic: string;
  metadata: {
    slug: string;
    createdAt: string;
    truncatedSlug: boolean;
    paths: PlannerPaths;
  };
  summary: {
    context: string;
    topicType: string;
    complexity: string;
    estimatedTimeframe: string;
  };
  researchAreas: string[];
  suggestedSources: string[];
  workflow: string[];
  tasks: ScopeDocument["researchTasks"];
  milestones: string[];
  resources: ScopeDocument["resourceRequirements"];
};

const DEFAULT_WORKFLOW = [
  "Review topic analysis",
  "Execute scoped research tasks",
  "Synthesize findings",
  "Draft final report",
  "Request critique and iterate",
] as const;

function synthesizeWorkflow(
  analysis: TopicAnalysisDocument,
  scope: ScopeDocument
): string[] {
  const highPriorityAreas = scope.researchTasks
    .filter((task) => task.priority === "high")
    .map((task) => `Deep dive on ${task.area}`);

  const coveredAreas = new Set(scope.researchTasks.map((task) => task.area));
  const coverageValidation = analysis.researchAreas
    .filter((area) => !coveredAreas.has(area))
    .map((area) => `Validate coverage for ${area}`);

  if (highPriorityAreas.length === 0) {
    return [...DEFAULT_WORKFLOW, ...coverageValidation];
  }

  const uniqueHighPriority = Array.from(new Set(highPriorityAreas));
  return [
    ...DEFAULT_WORKFLOW.slice(0, 1),
    ...uniqueHighPriority,
    ...DEFAULT_WORKFLOW.slice(1),
    ...coverageValidation,
  ];
}

export function buildInitialPlan(input: {
  paths: PlannerPaths;
  analysis: TopicAnalysisDocument;
  scope: ScopeDocument;
}): InitialPlanDocument {
  const createdAt = new Date().toISOString();
  return {
    topic: input.analysis.topic,
    metadata: {
      slug: input.paths.slug,
      createdAt,
      truncatedSlug: input.paths.truncated,
      paths: input.paths,
    },
    summary: {
      context: input.analysis.context ?? "",
      topicType: input.analysis.topicType,
      complexity: input.analysis.complexity,
      estimatedTimeframe: input.analysis.estimatedTimeframe,
    },
    researchAreas: input.analysis.researchAreas,
    suggestedSources: input.analysis.suggestedSources,
    workflow: synthesizeWorkflow(input.analysis, input.scope),
    tasks: input.scope.researchTasks,
    milestones: input.scope.suggestedMilestones,
    resources: input.scope.resourceRequirements,
  };
}
