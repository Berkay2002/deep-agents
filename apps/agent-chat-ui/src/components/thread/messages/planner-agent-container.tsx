"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Clock,
  FileText,
  Loader2,
} from "lucide-react";
import { useState } from "react";
import { PlanOptimizationResult } from "./plan-optimization-result";
import { ScopeEstimationResult } from "./scope-estimation-result";
import { TopicAnalysisResult } from "./topic-analysis-result";

type PlannerAgentStatus = "pending" | "in_progress" | "completed";

interface PlannerAgent {
  taskDescription: string;
  topicAnalysis?: any;
  scopeEstimation?: any;
  planOptimization?: any;
  finalPlan?: string;
  status: PlannerAgentStatus;
}

interface PlannerAgentContainerProps {
  agents: PlannerAgent[];
}

function getStatusIcon(status: PlannerAgentStatus) {
  switch (status) {
    case "pending":
      return <Clock className="h-3.5 w-3.5 text-gray-400" />;
    case "in_progress":
      return <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-500" />;
    case "completed":
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />;
  }
}

function getStatusColor(status: PlannerAgentStatus) {
  switch (status) {
    case "pending":
      return "text-gray-500 border-gray-300";
    case "in_progress":
      return "text-emerald-600 border-emerald-400 bg-emerald-50";
    case "completed":
      return "text-emerald-600 border-emerald-500 bg-emerald-50";
  }
}

export function PlannerAgentContainer({ agents }: PlannerAgentContainerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  if (agents.length === 0) return null;

  const currentAgent = agents[activeTab];

  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {/* Header */}
        <div className="border-gray-200 border-b bg-emerald-50 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <ClipboardList className="h-4 w-4 flex-shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900 text-sm">
                  Planning Agent
                </h3>
                {agents.length > 1 && (
                  <p className="mt-0.5 text-gray-500 text-xs">
                    {agents.length} {agents.length === 1 ? "agent" : "agents"}{" "}
                    active
                  </p>
                )}
              </div>
            </div>
            <button
              aria-label={isExpanded ? "Collapse" : "Expand"}
              className="flex-shrink-0 text-gray-500 hover:text-gray-700"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* Tabs - Show even when collapsed if there are multiple agents */}
        {agents.length > 1 && (
          <div className="border-gray-200 border-b bg-white">
            <div className="flex overflow-x-auto">
              {agents.map((agent, idx) => (
                <button
                  className={`flex-shrink-0 border-b-2 px-4 py-2 font-medium text-sm transition-colors ${
                    activeTab === idx
                      ? `border-emerald-600 ${getStatusColor(agent.status)}`
                      : "border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                  key={idx}
                  onClick={() => setActiveTab(idx)}
                >
                  <div className="flex items-center gap-2">
                    {getStatusIcon(agent.status)}
                    <span>Agent {idx + 1}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Collapsed Preview - Task and Read Plan button */}
        {!isExpanded && (
          <div className="bg-white p-4">
            <p className="mb-3 text-gray-700 text-sm">
              <span className="font-medium text-gray-900">Task:</span>{" "}
              {currentAgent.taskDescription}
            </p>
            {currentAgent.finalPlan && (
              <button
                className="inline-flex items-center gap-2 font-medium text-emerald-600 text-sm transition-colors hover:text-emerald-700"
                onClick={() => setIsExpanded(true)}
              >
                <FileText className="h-4 w-4" />
                Read Plan
              </button>
            )}
          </div>
        )}

        {/* Expanded Content */}
        <motion.div
          animate={{
            height: isExpanded ? "auto" : 0,
            opacity: isExpanded ? 1 : 0,
          }}
          className="overflow-hidden"
          initial={false}
          transition={{ duration: 0.2 }}
        >
          <div className="max-h-[600px] overflow-y-auto">
            {/* Task Description */}
            <div className="border-gray-100 border-b bg-emerald-50 p-4">
              <p className="text-gray-700 text-sm">
                <span className="font-medium text-gray-900">Task:</span>{" "}
                {currentAgent.taskDescription}
              </p>
            </div>

            {/* Topic Analysis Section */}
            {currentAgent.topicAnalysis && (
              <div className="border-gray-100 border-b p-4">
                <TopicAnalysisResult result={currentAgent.topicAnalysis} />
              </div>
            )}

            {/* Scope Estimation Section */}
            {currentAgent.scopeEstimation && (
              <div className="border-gray-100 border-b p-4">
                <ScopeEstimationResult result={currentAgent.scopeEstimation} />
              </div>
            )}

            {/* Plan Optimization Section */}
            {currentAgent.planOptimization && (
              <div className="border-gray-100 border-b p-4">
                <PlanOptimizationResult
                  result={currentAgent.planOptimization}
                />
              </div>
            )}

            {/* Final Plan Section */}
            {currentAgent.finalPlan && (
              <div className="p-4">
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-emerald-600" />
                  <h4 className="font-medium text-gray-700 text-sm">
                    Final Plan
                  </h4>
                </div>
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap font-sans text-gray-700 text-sm leading-relaxed">
                    {currentAgent.finalPlan}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
