/**
 * State definitions for Deep Agents
 *
 * TypeScript equivalents of the Python state classes using LangGraph's Annotation.Root() pattern.
 * Defines Todo interface and DeepAgentState using MessagesAnnotation as base with proper reducer functions.
 */

import type { BaseMessage } from "@langchain/core/messages";
import { Annotation, messagesStateReducer } from "@langchain/langgraph";
import type { Todo } from "./types.js";

/**
 * File reducer function that merges file dictionaries
 * Matches the Python file_reducer function behavior exactly
 */
export function fileReducer(
  left: Record<string, string> | null | undefined,
  right: Record<string, string> | null | undefined
): Record<string, string> {
  if (left === null || left === undefined) {
    return right || {};
  }
  if (right === null || right === undefined) {
    return left;
  }
  return { ...left, ...right };
}

/**
 * Todo reducer function that replaces the entire todo list
 * This matches the Python behavior where todos are completely replaced
 */
export function todoReducer(
  left: Todo[] | null | undefined,
  right: Todo[] | null | undefined
): Todo[] {
  if (right !== null && right !== undefined) {
    return right;
  }
  return left || [];
}

/**
 * DeepAgentState using LangGraph's Annotation.Root() pattern
 * Extends MessagesAnnotation (equivalent to Python's AgentState) with todos and files channels
 */
export const DeepAgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  todos: Annotation<Todo[]>({
    reducer: todoReducer,
    default: () => [],
  }),
  files: Annotation<Record<string, string>>({
    reducer: fileReducer,
    default: () => ({}),
  }),
});

/**
 * DeepAgentStateAnnotation using LangGraph's Annotation.Root() pattern
 * This is the AnnotationRoot version that can be used with createReactAgent
 */
export const DeepAgentStateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: messagesStateReducer,
    default: () => [],
  }),
  todos: Annotation<Todo[]>({
    reducer: todoReducer,
    default: () => [],
  }),
  files: Annotation<Record<string, string>>({
    reducer: fileReducer,
    default: () => ({}),
  }),
});

// Export the inferred type for use in other files
export type DeepAgentStateType = {
  messages: BaseMessage[];
  todos: Todo[];
  files: Record<string, string>;
};
