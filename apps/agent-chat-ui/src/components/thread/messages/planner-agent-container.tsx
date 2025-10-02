"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronUp, ClipboardList, FileText, Loader2, CheckCircle2, Clock } from "lucide-react";
import { TopicAnalysisResult } from "./topic-analysis-result";
import { ScopeEstimationResult } from "./scope-estimation-result";
import { PlanOptimizationResult } from "./plan-optimization-result";

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
      return <Clock className="w-3.5 h-3.5 text-gray-400" />;
    case "in_progress":
      return <Loader2 className="w-3.5 h-3.5 text-emerald-500 animate-spin" />;
    case "completed":
      return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />;
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

export function PlannerAgentContainer({
  agents,
}: PlannerAgentContainerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  if (agents.length === 0) return null;

  const currentAgent = agents[activeTab];

  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        {/* Header */}
        <div className="border-b border-gray-200 bg-emerald-50 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <ClipboardList className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 text-sm">
                  Planning Agent
                </h3>
                {agents.length > 1 && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {agents.length} {agents.length === 1 ? "agent" : "agents"} active
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-500 hover:text-gray-700 flex-shrink-0"
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Tabs - Show even when collapsed if there are multiple agents */}
        {agents.length > 1 && (
          <div className="border-b border-gray-200 bg-white">
            <div className="flex overflow-x-auto">
              {agents.map((agent, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveTab(idx)}
                  className={`flex-shrink-0 px-4 py-2 text-sm font-medium transition-colors border-b-2 ${
                    activeTab === idx
                      ? `border-emerald-600 ${getStatusColor(agent.status)}`
                      : "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
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
          <div className="p-4 bg-white">
            <p className="text-sm text-gray-700 mb-3">
              <span className="font-medium text-gray-900">Task:</span>{" "}
              {currentAgent.taskDescription}
            </p>
            {currentAgent.finalPlan && (
              <button
                onClick={() => setIsExpanded(true)}
                className="inline-flex items-center gap-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Read Plan
              </button>
            )}
          </div>
        )}

        {/* Expanded Content */}
        <motion.div
          initial={false}
          animate={{
            height: isExpanded ? "auto" : 0,
            opacity: isExpanded ? 1 : 0,
          }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
        >
          <div className="max-h-[600px] overflow-y-auto">
            {/* Task Description */}
            <div className="border-b border-gray-100 p-4 bg-emerald-50">
              <p className="text-sm text-gray-700">
                <span className="font-medium text-gray-900">Task:</span>{" "}
                {currentAgent.taskDescription}
              </p>
            </div>

            {/* Topic Analysis Section */}
            {currentAgent.topicAnalysis && (
              <div className="border-b border-gray-100 p-4">
                <TopicAnalysisResult result={currentAgent.topicAnalysis} />
              </div>
            )}

            {/* Scope Estimation Section */}
            {currentAgent.scopeEstimation && (
              <div className="border-b border-gray-100 p-4">
                <ScopeEstimationResult result={currentAgent.scopeEstimation} />
              </div>
            )}

            {/* Plan Optimization Section */}
            {currentAgent.planOptimization && (
              <div className="border-b border-gray-100 p-4">
                <PlanOptimizationResult result={currentAgent.planOptimization} />
              </div>
            )}

            {/* Final Plan Section */}
            {currentAgent.finalPlan && (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <h4 className="text-sm font-medium text-gray-700">
                    Final Plan
                  </h4>
                </div>
                <div className="prose prose-sm max-w-none">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">
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
