"use client";

import { ReactNode, Children, isValidElement, cloneElement } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { TimelineItem, TimelineItemType } from "./timeline-item";

interface TimelineActivity {
  id: string;
  type: TimelineItemType;
  title?: string;
  timestamp?: string;
  status?: "pending" | "in_progress" | "completed" | "error";
  content: ReactNode;
  isMini?: boolean;
}

interface TimelineContainerProps {
  activities: TimelineActivity[];
  className?: string;
  isLast?: boolean;
}

export function TimelineContainer({ activities, className, isLast = false }: TimelineContainerProps) {
  if (activities.length === 0) return null;

  return (
    <div className={cn("w-full max-w-4xl mx-auto", className)}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="relative"
      >
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.4,
              delay: index * 0.1,
              type: "spring",
              stiffness: 100
            }}
          >
            <TimelineItem
              type={activity.type}
              title={activity.title}
              timestamp={activity.timestamp}
              status={activity.status}
              isLast={isLast && index === activities.length - 1}
              isMini={activity.isMini}
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
export function extractFileNameFromArgs(args: any): string {
  if (args?.file_path) return args.file_path;
  if (args?.fileName) return args.fileName;
  if (args?.file_name) return args.file_name;
  return "Unknown file";
}

// Helper function to determine activity type from tool name
export function getActivityTypeFromTool(toolName: string, args?: any): TimelineItemType {
  const lowerToolName = toolName.toLowerCase();
  
  if (lowerToolName.includes("research") || args?.subagent_type === "research-agent") {
    return "research";
  }
  
  if (lowerToolName.includes("critique") || args?.subagent_type === "critique-agent") {
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
  
  if (lowerToolName.includes("update") || lowerToolName.includes("collaborat")) {
    return "file-update";
  }
  
  if (lowerToolName.includes("search")) {
    return "search-result";
  }
  
  return "tool-call";
}