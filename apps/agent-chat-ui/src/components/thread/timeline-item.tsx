"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  Search, 
  FileText, 
  CheckCircle2, 
  MessageSquare, 
  Users, 
  Edit3,
  GitBranch,
  Clock,
  Loader2
} from "lucide-react";

export type TimelineItemType = 
  | "research"
  | "file-write"
  | "file-edit"
  | "file-update"
  | "todo"
  | "critique"
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
  className
}: TimelineItemProps) {
  const icon = getIconForType(type, status);
  const statusColor = getStatusColor(status);

  return (
    <div className={cn("relative flex gap-4", className)}>
      {/* Timeline Line */}
      <div className="flex flex-col items-center">
        {/* Timeline Dot */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15 }}
          className={cn(
            "w-8 h-8 rounded-full border-2 flex items-center justify-center bg-white z-10",
            statusColor
          )}
        >
          {status === "in_progress" ? (
            <Loader2 className="w-3 h-3 animate-spin text-blue-600" />
          ) : (
            icon
          )}
        </motion.div>
        
        {/* Connecting Line */}
        {!isLast && (
          <div className="w-0.5 h-full bg-gray-200 mt-2 min-h-[20px]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-8">
        {/* Header */}
        {(title || timestamp) && (
          <div className="flex items-center gap-2 mb-2">
            {title && (
              <h3 className="text-sm font-medium text-gray-900">
                {title}
              </h3>
            )}
            {timestamp && (
              <span className="text-xs text-gray-500">
                {timestamp}
              </span>
            )}
          </div>
        )}
        
        {/* Content Wrapper */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="w-full"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}