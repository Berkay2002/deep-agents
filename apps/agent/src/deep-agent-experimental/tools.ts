/**
 * Tool functions for Deep Agents
 *
 * TypeScript versions of all tools using @langchain/core/tools tool() function.
 * Uses getCurrentTaskInput() for state access and returns Command objects for state updates.
 * Implements mock filesystem operations using state.files similar to Python version.
 */

import { ToolMessage } from "@langchain/core/messages";
import { type ToolRunnableConfig, tool } from "@langchain/core/tools";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { z } from "zod";
import {
  EDIT_DESCRIPTION,
  TOOL_DESCRIPTION,
  WRITE_TODOS_DESCRIPTION,
} from "./prompts.js";
import type { DeepAgentStateType } from "./types.js";

// Constants for magic numbers
const MAX_LINE_LENGTH = 2000;
const LINE_NUMBER_PADDING = 6;
const DEFAULT_LIMIT = 2000;

// Type for todo items
type TodoItem = {
  content: string;
  status: "pending" | "in_progress" | "completed";
};

/**
 * Write todos tool - manages todo list with Command return
 * Uses getCurrentTaskInput() instead of Python's InjectedState
 */
export const writeTodos = tool(
  (input: unknown, config: ToolRunnableConfig) => {
    const { todos } = input as { todos: TodoItem[] };
    return new Command({
      update: {
        todos,
        messages: [
          new ToolMessage({
            content: `Updated todo list to ${JSON.stringify(todos)}`,
            // biome-ignore lint/style/useNamingConvention: tool_call_id is required by ToolMessage interface
            tool_call_id: config.toolCall?.id as string,
          }),
        ],
      },
    });
  },
  {
    name: "write_todos",
    description: WRITE_TODOS_DESCRIPTION,
    schema: z.object({
      todos: z
        .array(
          z.object({
            content: z.string().describe("Content of the todo item"),
            status: z
              .enum(["pending", "in_progress", "completed"])
              .describe("Status of the todo"),
          })
        )
        .describe("List of todo items to update"),
    }),
  }
);

/**
 * List files tool - returns list of files from state.files
 * Equivalent to Python's ls function
 */
export const ls = tool(
  () => {
    const state = getCurrentTaskInput<DeepAgentStateType>();
    const files = state.files || {};
    return Object.keys(files);
  },
  {
    name: "ls",
    description: "List all files in the mock filesystem",
    schema: z.object({}),
  }
);

/**
 * Read file tool - reads from mock filesystem in state.files
 * Matches Python read_file function behavior exactly
 */
export const readFile = tool(
  (input: unknown) => {
    const state = getCurrentTaskInput<DeepAgentStateType>();
    const mockFilesystem = state.files || {};
    const {
      filePath,
      offset = 0,
      limit = DEFAULT_LIMIT,
    } = input as { filePath: string; offset?: number; limit?: number };

    if (!(filePath in mockFilesystem)) {
      return `Error: File '${filePath}' not found`;
    }

    // Get file content
    const content = mockFilesystem[filePath];

    // Handle empty file
    if (!content || content.trim() === "") {
      return "System reminder: File exists but has empty contents";
    }

    // Split content into lines
    const lines = content.split("\n");

    // Apply line offset and limit
    const startIdx = offset;
    const endIdx = Math.min(startIdx + limit, lines.length);

    // Handle case where offset is beyond file length
    if (startIdx >= lines.length) {
      return `Error: Line offset ${offset} exceeds file length (${lines.length} lines)`;
    }

    // Format output with line numbers (cat -n format)
    const resultLines: string[] = [];
    for (let i = startIdx; i < endIdx; i++) {
      let lineContent = lines[i];

      // Handle undefined line content
      if (lineContent === undefined) {
        lineContent = "";
      }

      // Truncate lines longer than MAX_LINE_LENGTH characters
      if (lineContent.length > MAX_LINE_LENGTH) {
        lineContent = lineContent.substring(0, MAX_LINE_LENGTH);
      }

      // Line numbers start at 1, so add 1 to the index
      const lineNumber = i + 1;
      resultLines.push(
        `${lineNumber.toString().padStart(LINE_NUMBER_PADDING)}	${lineContent}`
      );
    }

    return resultLines.join("\n");
  },
  {
    name: "read_file",
    description: TOOL_DESCRIPTION,
    schema: z.object({
      filePath: z.string().describe("Absolute path to the file to read"),
      offset: z
        .number()
        .optional()
        .default(0)
        .describe("Line offset to start reading from"),
      limit: z
        .number()
        .optional()
        .default(DEFAULT_LIMIT)
        .describe("Maximum number of lines to read"),
    }),
  }
);

/**
 * Write file tool - writes to mock filesystem with Command return
 * Matches Python write_file function behavior exactly
 */
export const writeFile = tool(
  (input: unknown, config: ToolRunnableConfig) => {
    const state = getCurrentTaskInput<DeepAgentStateType>();
    const files = { ...(state.files || {}) };
    const { filePath, content } = input as {
      filePath: string;
      content: string;
    };
    files[filePath] = content;

    return new Command({
      update: {
        files,
        messages: [
          new ToolMessage({
            content: `Updated file ${filePath}`,
            // biome-ignore lint/style/useNamingConvention: tool_call_id is required by ToolMessage interface
            tool_call_id: config.toolCall?.id as string,
          }),
        ],
      },
    });
  },
  {
    name: "write_file",
    description: "Write content to a file in the mock filesystem",
    schema: z.object({
      filePath: z.string().describe("Absolute path to the file to write"),
      content: z.string().describe("Content to write to the file"),
    }),
  }
);

/**
 * Edit file tool - edits files in mock filesystem with Command return
 * Matches Python edit_file function behavior exactly
 */
export const editFile = tool(
  (input: unknown, config: ToolRunnableConfig) => {
    const state = getCurrentTaskInput<DeepAgentStateType>();
    const mockFilesystem = { ...(state.files || {}) };
    const {
      filePath,
      oldString,
      newString,
      replaceAll = false,
    } = input as {
      filePath: string;
      oldString: string;
      newString: string;
      replaceAll?: boolean;
    };

    // Check if file exists in mock filesystem
    if (!(filePath in mockFilesystem)) {
      return `Error: File '${filePath}' not found`;
    }

    // Get current file content
    const content = mockFilesystem[filePath];

    // Handle undefined content
    if (content === undefined) {
      return `Error: File '${filePath}' has undefined content`;
    }

    // Check if oldString exists in the file
    if (!content.includes(oldString)) {
      return `Error: String not found in file: '${oldString}'`;
    }

    // If not replaceAll, check for uniqueness
    if (!replaceAll) {
      const escapedOldString = oldString.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const occurrences = (
        content.match(new RegExp(escapedOldString, "g")) || []
      ).length;
      if (occurrences > 1) {
        return `Error: String '${oldString}' appears ${occurrences} times in file. Use replace_all=True to replace all instances, or provide a more specific string with surrounding context.`;
      }
      if (occurrences === 0) {
        return `Error: String not found in file: '${oldString}'`;
      }
    }

    // Perform the replacement
    let newContent: string;

    if (replaceAll) {
      const escapedOldString = oldString.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      newContent = content.replace(
        new RegExp(escapedOldString, "g"),
        newString
      );
    } else {
      newContent = content.replace(oldString, newString);
    }

    // Handle undefined newContent
    if (newContent === undefined) {
      return `Error: Failed to replace content in file '${filePath}'`;
    }

    // Update the mock filesystem
    mockFilesystem[filePath] = newContent;

    return new Command({
      update: {
        files: mockFilesystem,
        messages: [
          new ToolMessage({
            content: `Updated file ${filePath}`,
            // biome-ignore lint/style/useNamingConvention: tool_call_id is required by ToolMessage interface
            tool_call_id: config.toolCall?.id as string,
          }),
        ],
      },
    });
  },
  {
    name: "edit_file",
    description: EDIT_DESCRIPTION,
    schema: z.object({
      filePath: z.string().describe("Absolute path to the file to edit"),
      oldString: z
        .string()
        .describe("String to be replaced (must match exactly)"),
      newString: z.string().describe("String to replace with"),
      replaceAll: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to replace all occurrences"),
    }),
  }
);
