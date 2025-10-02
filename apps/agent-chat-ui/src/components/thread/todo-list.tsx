"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Todo {
  content: string;
  status: "pending" | "in_progress" | "completed";
  activeForm?: string;
}

interface TodoListProps {
  todos: Todo[];
}

export function TodoList({ todos }: TodoListProps) {
  const completedCount = todos.filter((t) => t.status === "completed").length;
  const totalCount = todos.length;

  return (
    <div className="mx-auto grid max-w-3xl grid-rows-[1fr_auto] gap-2">
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-gray-50/80">
        {/* Header with progress */}
        <div className="border-b border-gray-200 bg-white/50 px-4 py-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-900">Task Progress</h3>
            <span className="text-sm text-gray-500">
              {completedCount} of {totalCount} Done
            </span>
          </div>
        </div>

        {/* Todo items */}
        <div className="divide-y divide-gray-200">
          {todos.map((todo, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-100/50"
            >
              {/* Status indicator */}
              <div className="flex-shrink-0 pt-0.5">
                {todo.status === "completed" && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                  >
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  </motion.div>
                )}
                {todo.status === "in_progress" && (
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                )}
                {todo.status === "pending" && (
                  <Circle className="h-5 w-5 text-gray-400" />
                )}
              </div>

              {/* Todo content */}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "text-sm leading-relaxed",
                    todo.status === "completed"
                      ? "text-gray-500 line-through"
                      : todo.status === "in_progress"
                        ? "font-medium text-gray-900"
                        : "text-gray-700",
                  )}
                >
                  {todo.status === "in_progress" && todo.activeForm
                    ? todo.activeForm
                    : todo.content}
                </p>
              </div>

              {/* Status badge (optional, for in_progress) */}
              {todo.status === "in_progress" && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex-shrink-0"
                >
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                    In Progress
                  </span>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
