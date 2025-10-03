"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { TimelineItem, type TimelineItemType } from "./timeline-item";

const ANIMATION_DELAY = 0.1;

export type TimelineActivity = {
  id: string;
  type: TimelineItemType;
  title?: string;
  timestamp?: string;
  status?: "pending" | "in_progress" | "completed" | "error";
  content: ReactNode;
  isMini?: boolean;
};

type TimelineContainerProps = {
  activities: TimelineActivity[];
  className?: string;
  isLast?: boolean;
  onActivitySelect?: (activityId: string) => void;
};

export function TimelineContainer({
  activities,
  className,
  isLast = false,
  onActivitySelect,
}: TimelineContainerProps) {
  if (activities.length === 0) {
    return null;
  }

  return (
    <div className={cn("mx-auto w-full max-w-4xl", className)}>
      <motion.div
        animate={{ opacity: 1 }}
        className="relative"
        initial={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activities.map((activity, index) => (
          <motion.div
            animate={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 20 }}
            key={activity.id}
            transition={{
              duration: 0.4,
              delay: index * ANIMATION_DELAY,
              type: "spring",
              stiffness: 100,
            }}
          >
            <TimelineItem
              isLast={isLast && index === activities.length - 1}
              isMini={activity.isMini}
              onSelect={
                onActivitySelect
                  ? () => onActivitySelect(activity.id)
                  : undefined
              }
              status={activity.status}
              timestamp={activity.timestamp}
              title={activity.title}
              type={activity.type}
            >
              {activity.content}
            </TimelineItem>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

// Helper function to create timeline activities from existing components
export function createTimelineActivity(
  id: string,
  type: TimelineItemType,
  content: ReactNode,
  options?: {
    title?: string;
    timestamp?: string;
    status?: "pending" | "in_progress" | "completed" | "error";
    isMini?: boolean;
  }
): TimelineActivity {
  return {
    id,
    type,
    content,
    ...options,
  };
}

// Helper function to extract file name from file operations
export function extractFileNameFromArgs(args: Record<string, unknown>): string {
  if (args?.file_path && typeof args.file_path === "string") {
    return args.file_path;
  }
  if (args?.fileName && typeof args.fileName === "string") {
    return args.fileName;
  }
  if (args?.file_name && typeof args.file_name === "string") {
    return args.file_name;
  }
  return "Unknown file";
}

// Helper function to determine activity type from tool name
export function getActivityTypeFromTool(
  toolName: string,
  args?: Record<string, unknown>
): TimelineItemType {
  const lowerToolName = toolName.toLowerCase();

  if (
    lowerToolName.includes("research") ||
    args?.subagent_type === "research-agent"
  ) {
    return "research";
  }

  if (
    lowerToolName.includes("critique") ||
    args?.subagent_type === "critique-agent"
  ) {
    return "critique";
  }

  if (lowerToolName.includes("todo") || lowerToolName.includes("task")) {
    return "todo";
  }

  if (lowerToolName.includes("write") || lowerToolName.includes("create")) {
    return "file-write";
  }

  if (lowerToolName.includes("edit") || lowerToolName.includes("modify")) {
    return "file-edit";
  }

  if (
    lowerToolName.includes("update") ||
    lowerToolName.includes("collaborat")
  ) {
    return "file-update";
  }

  if (lowerToolName.includes("search")) {
    return "search-result";
  }

  return "tool-call";
}
