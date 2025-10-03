/**
 * Stable middleware implementation for Deep Agents
 *
 * Adapts the experimental middleware functionality to work with createReactAgent
 * by providing tools and message modifiers that can be used with the stable API.
 */
/** biome-ignore-all lint/style/noUnusedTemplateLiteral: <Need template literals for multi-line strings> */
/** biome-ignore-all lint/suspicious/noConsole: <Need console logs for debugging> */

import { ToolMessage } from "@langchain/core/messages";
import { type ToolRunnableConfig, tool } from "@langchain/core/tools";
import { Command, getCurrentTaskInput } from "@langchain/langgraph";
import { z } from "zod";
import {
  EDIT_DESCRIPTION,
  TOOL_DESCRIPTION,
  WRITE_TODOS_DESCRIPTION,
} from "../prompts.js";
import type { DeepAgentStateType } from "../types.js";

/**
 * Filesystem system prompt for message modifier
 */
const FS_SYSTEM_PROMPT = `## Filesystem Tools \`ls\`, \`read_file\`, \`write_file\`, \`edit_file\`

You have access to a local, private filesystem which you can interact with using these tools.
- ls: list all files in the local filesystem
- read_file: read a file from the local filesystem
- write_file: write to a file in the local filesystem
- edit_file: edit a file in the local filesystem`;

/**
 * Todo system prompt for message modifier
 */
const TODO_SYSTEM_PROMPT = `## \`write_todos\`

You have access to the \`write_todos\` tool to help you manage and plan complex objectives. 
Use this tool for complex objectives to ensure that you are tracking each necessary step and giving the user visibility into your progress.
This tool is very helpful for planning complex objectives, and for breaking down these larger complex objectives into smaller steps.

It is critical that you mark todos as completed as soon as you are done with a step. Do not batch up multiple steps before marking them as completed.
For simple objectives that only require a few steps, it is better to just complete the objective directly and NOT use this tool.
Writing todos takes time and tokens, use it when it is helpful for managing complex many-step problems! But not for simple few-step requests.

## Important To-Do List Usage Notes to Remember
- The \`write_todos\` tool should never be called multiple times in parallel.
- Don't be afraid to revise the To-Do list as you go. New information may reveal new tasks that need to be done, or old tasks that are irrelevant.`;

/**
 * Todo status enum
 */
export const TodoStatus = z.enum(["pending", "in_progress", "completed"]);
export const TodoSchema = z.object({
  content: z.string(),
  status: TodoStatus,
});

// Define constants for magic numbers
const DEFAULT_OFFSET = 0;
const DEFAULT_LIMIT = 2000;
const MAX_LINE_LENGTH = 2000;
const LINE_NUMBER_PADDING = 6;

// Define regex at top level for performance
const REGEX_ESCAPE_PATTERN = /[.*+?^${}()|[\]\\]/g;

/**
 * Type for write todos input
 */
type WriteTodosInput = {
  todos: z.infer<typeof TodoSchema>[];
};

/**
 * Type for read file input
 */
type ReadFileInput = {
  filePath: string;
  offset?: number;
  limit?: number;
};

/**
 * Type for write file input
 */
type WriteFileInput = {
  filePath: string;
  content: string;
};

/**
 * Type for edit file input
 */
type EditFileInput = {
  filePath: string;
  oldString: string;
  newString: string;
  replaceAll?: boolean;
};

/**
 * Write todos tool - manages todo list with Command return
 */
export const writeTodos = tool(
  (input: unknown, config: ToolRunnableConfig) => {
    const { todos } = input as WriteTodosInput;
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
      todos: z.array(TodoSchema).describe("List of todo items to update"),
    }),
  }
);

/**
 * List files tool - returns list of files from state.files
 */
export const ls = tool(
  (input: unknown) => {
    const state = getCurrentTaskInput<DeepAgentStateType>();
    const files = state.files || {};
    const typedInput =
      typeof input === "object" && input !== null
        ? (input as { pathPrefix?: string })
        : {};
    const { pathPrefix } = typedInput;
    const filePaths = Object.keys(files);

    if (!pathPrefix || pathPrefix === "") {
      return filePaths;
    }

    return filePaths.filter((filePath) => filePath.startsWith(pathPrefix));
  },
  {
    name: "ls",
    description:
      "List files in the mock filesystem, optionally filtering by a path prefix",
    schema: z.object({
      pathPrefix: z
        .string()
        .optional()
        .describe("Optional prefix to filter returned file paths"),
    }),
  }
);

/**
 * Read file tool - reads from mock filesystem in state.files
 */
export const readFile = tool(
  (input: unknown) => {
    const state = getCurrentTaskInput<DeepAgentStateType>();
    const mockFilesystem = state.files || {};
    const {
      filePath,
      offset = DEFAULT_OFFSET,
      limit = DEFAULT_LIMIT,
    } = input as ReadFileInput;

    // Debug logging for file access
    console.log(`[read_file] Attempting to read: "${filePath}"`);
    console.log(
      `[read_file] Total files in state: ${Object.keys(mockFilesystem).length}`
    );
    if (filePath.startsWith("/research/plans/")) {
      const plannerFiles = Object.keys(mockFilesystem).filter((k) =>
        k.startsWith("/research/plans/")
      );
      console.log(`[read_file] Available planner files:`, plannerFiles);
    }

    if (!(filePath in mockFilesystem)) {
      console.error(`[read_file] File NOT FOUND: "${filePath}"`);
      console.error(`[read_file] All file keys:`, Object.keys(mockFilesystem));
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
    for (const i of Array.from(
      { length: endIdx - startIdx },
      (_, index) => startIdx + index
    )) {
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
        `${lineNumber.toString().padStart(LINE_NUMBER_PADDING)}  ${lineContent}`
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
        .default(DEFAULT_OFFSET)
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
 */
export const writeFile = tool(
  (input: unknown, config: ToolRunnableConfig) => {
    const state = getCurrentTaskInput<DeepAgentStateType>();
    const files = { ...(state.files || {}) };
    const { filePath, content } = input as WriteFileInput;
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
    } = input as EditFileInput;

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

    // Check if old_string exists in the file
    if (!content.includes(oldString)) {
      return `Error: String not found in file: '${oldString}'`;
    }

    // If not replace_all, check for uniqueness
    if (!replaceAll) {
      const escapedOldString = oldString.replace(REGEX_ESCAPE_PATTERN, "\\$&");
      const occurrences = (
        content.match(new RegExp(escapedOldString, "g")) || []
      ).length;
      if (occurrences > 1) {
        return `Error: String '${oldString}' appears ${occurrences} times in file. Use replace_all=true to replace all instances, or provide a more specific string with surrounding context.`;
      }
      if (occurrences === 0) {
        return `Error: String not found in file: '${oldString}'`;
      }
    }

    // Perform the replacement
    let newContent: string;

    if (replaceAll) {
      const escapedOldString = oldString.replace(REGEX_ESCAPE_PATTERN, "\\$&");
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

/**
 * Filesystem tools collection
 */
export const fsTools = [ls, readFile, writeFile, editFile];

/**
 * Todo tools collection
 */
export const todoTools = [writeTodos];

/**
 * All middleware tools collection
 */
export const allMiddlewareTools = [...fsTools, ...todoTools];

/**
 * Message modifier functions for adding middleware system prompts
 */
export const fsMessageModifier = (message: string) =>
  message + FS_SYSTEM_PROMPT;
export const todoMessageModifier = (message: string) =>
  message + TODO_SYSTEM_PROMPT;
export const allMiddlewareMessageModifier = (message: string) =>
  message + FS_SYSTEM_PROMPT + TODO_SYSTEM_PROMPT;
