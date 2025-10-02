"use client";

import { motion } from "framer-motion";
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  Edit3,
  FileText,
  GitBranch,
  Loader2,
  MessageSquare,
  Search,
  Users,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type TimelineItemType =
  | "research"
  | "file-write"
  | "file-edit"
  | "file-update"
  | "todo"
  | "critique"
  | "planning"
  | "tool-call"
  | "search-result"
  | "generic";

interface TimelineItemProps {
  children: ReactNode;
  type: TimelineItemType;
  title?: string;
  timestamp?: string;
  status?: "pending" | "in_progress" | "completed" | "error";
  isLast?: boolean;
  className?: string;
  isMini?: boolean;
}

function getIconForType(type: TimelineItemType, status?: string) {
  const iconClass = "w-4 h-4";

  switch (type) {
    case "research":
      return <Search className={cn(iconClass, "text-blue-600")} />;
    case "file-write":
      return <FileText className={cn(iconClass, "text-green-600")} />;
    case "file-edit":
      return <Edit3 className={cn(iconClass, "text-orange-600")} />;
    case "file-update":
      return <Users className={cn(iconClass, "text-purple-600")} />;
    case "todo":
      return <CheckCircle2 className={cn(iconClass, "text-emerald-600")} />;
    case "critique":
      return <MessageSquare className={cn(iconClass, "text-purple-600")} />;
    case "planning":
      return <ClipboardList className={cn(iconClass, "text-emerald-600")} />;
    case "tool-call":
      return <GitBranch className={cn(iconClass, "text-gray-600")} />;
    case "search-result":
      return <Search className={cn(iconClass, "text-blue-500")} />;
    default:
      return <Clock className={cn(iconClass, "text-gray-500")} />;
  }
}

function getStatusColor(status?: string) {
  switch (status) {
    case "pending":
      return "bg-gray-300 border-gray-400";
    case "in_progress":
      return "bg-blue-100 border-blue-400 animate-pulse";
    case "completed":
      return "bg-green-100 border-green-500";
    case "error":
      return "bg-red-100 border-red-500";
    default:
      return "bg-gray-100 border-gray-300";
  }
}

export function TimelineItem({
  children,
  type,
  title,
  timestamp,
  status,
  isLast = false,
  className,
  isMini = false,
}: TimelineItemProps) {
  const icon = getIconForType(type, status);
  const statusColor = getStatusColor(status);

  return (
    <div className={cn("relative flex gap-4", isMini && "ml-8", className)}>
      {/* Timeline Line */}
      <div className="flex flex-col items-center">
        {/* Timeline Dot */}
        <motion.div
          animate={{ scale: 1 }}
          className={cn(
            isMini
              ? "z-10 flex h-5 w-5 items-center justify-center rounded-full border bg-white"
              : "z-10 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-white",
            statusColor
          )}
          initial={{ scale: 0 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
        >
          {isMini ? (
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
          ) : status === "in_progress" ? (
            <Loader2 className="h-3 w-3 animate-spin text-blue-600" />
          ) : (
            icon
          )}
        </motion.div>

        {/* Connecting Line */}
        {!isLast && (
          <div className="mt-2 h-full min-h-[20px] w-0.5 bg-gray-200" />
        )}
      </div>

      {/* Content */}
      <div className={cn("min-w-0 flex-1", isMini ? "pb-4" : "pb-8")}>
        {/* Header */}
        {(title || timestamp) && (
          <div className="mb-2 flex items-center gap-2">
            {title && (
              <h3
                className={cn(
                  isMini
                    ? "font-medium text-gray-700 text-xs"
                    : "font-medium text-gray-900 text-sm"
                )}
              >
                {title}
              </h3>
            )}
            {timestamp && (
              <span className="text-gray-500 text-xs">{timestamp}</span>
            )}
          </div>
        )}

        {/* Content Wrapper */}
        <motion.div
          animate={{ opacity: 1, x: 0 }}
          className="w-full"
          initial={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}
