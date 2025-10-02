import type { MessageContentComplex } from "@langchain/core/messages";
import { parsePartialJson } from "@langchain/core/output_parsers";
import type { AIMessage, Checkpoint, Message } from "@langchain/langgraph-sdk";
import { LoadExternalComponent } from "@langchain/langgraph-sdk/react-ui";
import { parseAsBoolean, useQueryState } from "nuqs";
import { Fragment } from "react/jsx-runtime";
import { isAgentInboxInterruptSchema } from "@/lib/agent-inbox-interrupt";
import { cn } from "@/lib/utils";
import { useStreamContext } from "@/providers/Stream";
import { ThreadView } from "../agent-inbox";
import { useArtifact } from "../artifact";
import { MarkdownText } from "../markdown-text";
import { getContentString } from "../utils";
import { GenericInterruptView } from "./generic-interrupt";
import { BranchSwitcher, CommandBar } from "./shared";
import { ToolCalls, ToolResult } from "./tool-calls";

function CustomComponent({
  message,
  thread,
}: {
  message: Message;
  thread: ReturnType<typeof useStreamContext>;
}) {
  const artifact = useArtifact();
  const { values } = useStreamContext();
  const customComponents = values.ui?.filter(
    (ui) => ui.metadata?.message_id === message.id
  );

  if (!customComponents?.length) {
    return null;
  }
  return (
    <Fragment key={message.id}>
      {customComponents.map((customComponent) => (
        <LoadExternalComponent
          key={customComponent.id}
          message={customComponent}
          meta={{ ui: customComponent, artifact }}
          stream={thread}
        />
      ))}
    </Fragment>
  );
}

function parseAnthropicStreamedToolCalls(
  content: MessageContentComplex[]
): AIMessage["tool_calls"] {
  const toolCallContents = content.filter((c) => c.type === "tool_use" && c.id);

  return toolCallContents.map((tc) => {
    const toolCall = tc as Record<string, unknown>;
    let json: Record<string, unknown> = {};
    if (toolCall?.input && typeof toolCall.input === "string") {
      try {
        json = parsePartialJson(toolCall.input) ?? {};
      } catch {
        // Pass
      }
    }
    return {
      name: (toolCall.name as string) ?? "",
      id: (toolCall.id as string) ?? "",
      args: json,
      type: "tool_call",
    };
  });
}

type InterruptProps = {
  interruptValue?: unknown;
  isLastMessage: boolean;
  hasNoAiOrToolMessages: boolean;
};

function Interrupt({
  interruptValue,
  isLastMessage,
  hasNoAiOrToolMessages,
}: InterruptProps) {
  return (
    <>
      {isAgentInboxInterruptSchema(interruptValue) &&
        (isLastMessage || hasNoAiOrToolMessages) && (
          <ThreadView interrupt={interruptValue} />
        )}
      {interruptValue &&
      !isAgentInboxInterruptSchema(interruptValue) &&
      (isLastMessage || hasNoAiOrToolMessages) ? (
        <GenericInterruptView
          interrupt={
            typeof interruptValue === "object" && interruptValue !== null
              ? (interruptValue as
                  | Record<string, unknown>
                  | Record<string, unknown>[])
              : {}
          }
        />
      ) : null}
    </>
  );
}

// Minimum content length to show command buttons
const MIN_CONTENT_LENGTH = 500;

function getToolResults(
  message: Message | undefined,
  thread: ReturnType<typeof useStreamContext>
): { id: string; error?: string; success: boolean }[] | undefined {
  if (!(message && "tool_calls" in message && message.tool_calls)) {
    return;
  }

  return message.tool_calls.map((tc) => {
    // Find the corresponding tool result message
    const resultMessage = thread.messages.find(
      (m) =>
        m.type === "tool" && "tool_call_id" in m && m.tool_call_id === tc.id
    );
    const isError =
      resultMessage &&
      typeof resultMessage.content === "string" &&
      (resultMessage.content.toLowerCase().includes("error:") ||
        resultMessage.content.toLowerCase().includes("string not found"));
    const isSuccess =
      resultMessage &&
      typeof resultMessage.content === "string" &&
      resultMessage.content.toLowerCase().includes("updated file");
    return {
      id: tc.id || "",
      error: isError ? String(resultMessage.content) : undefined,
      success: Boolean(isSuccess && !isError),
    };
  });
}

function shouldHideToolResult(message: Message | undefined): boolean {
  if (!message || message.type !== "tool") {
    return false;
  }

  // Hide tool results for TodoWrite since TodoList component already shows this
  const isTodoWriteResult =
    message.name === "TodoWrite" || message.name === "write_todos";

  // Also hide tool results that contain todo list updates in the content
  const isTodoListContentResult =
    typeof message.content === "string" &&
    message.content.includes("Updated todo list to");

  // Hide sub-agent responses (research-agent, critique-agent) since they are intermediate results
  // The main agent synthesizes these into the final report, so users shouldn't see raw sub-agent output
  const isSubAgentResult =
    message.name === "research-agent" ||
    message.name === "critique-agent" ||
    message.name === "task"; // "task" is the generic name for sub-agent calls

  // Hide file operation results since they're shown in WriteFileDiff component
  const isFileOperationResult =
    message.name === "write_file" ||
    message.name === "edit_file" ||
    message.name === "Write" ||
    message.name === "Edit" ||
    message.name === "MultiEdit";

  // Also hide file operation results based on content
  const isFileOperationContentResult =
    typeof message.content === "string" &&
    (message.content.startsWith("Updated file ") ||
      message.content.startsWith("Created file ") ||
      message.content.startsWith("Edited file "));

  return (
    isTodoWriteResult ||
    isTodoListContentResult ||
    isSubAgentResult ||
    isFileOperationResult ||
    isFileOperationContentResult
  );
}

function hasTodoListToolCalls(message: Message | undefined): boolean {
  if (!(message && "tool_calls" in message && message.tool_calls)) {
    return false;
  }

  return message.tool_calls.some(
    (tc) =>
      (tc.name === "write_todos" || tc.name === "TodoWrite") &&
      tc.args &&
      "todos" in tc.args &&
      Array.isArray(tc.args.todos)
  );
}

function shouldHideCommandButtons(
  message: Message | undefined,
  contentString: string,
  isLastMessage: boolean
): boolean {
  if (!message) {
    return false;
  }

  const hasToolCalls =
    "tool_calls" in message &&
    message.tool_calls &&
    message.tool_calls.length > 0;
  const isToolResult = message.type === "tool";
  const hasTodoListCalls = hasTodoListToolCalls(message);

  return (
    hasToolCalls || // Hide if message has active tool calls
    isToolResult || // Hide for tool result messages
    hasTodoListCalls || // Hide for todo list updates
    (contentString.length < MIN_CONTENT_LENGTH && !isLastMessage) // Hide short messages unless it's the last one
  );
}

function getCorrespondingToolCall(
  message: Message | undefined,
  thread: ReturnType<typeof useStreamContext>
): (AIMessage["tool_calls"] & { id: string })[number] | undefined {
  if (!message || message.type !== "tool" || !("tool_call_id" in message)) {
    return;
  }

  return thread.messages
    .filter((m): m is AIMessage => m.type === "ai" && "tool_calls" in m)
    .flatMap((m) => m.tool_calls || [])
    .find((tc) => tc.id === message.tool_call_id);
}

function useMessageState(message: Message | undefined) {
  const content = message?.content ?? [];
  const contentString = getContentString(content);
  const [hideToolCalls] = useQueryState(
    "hideToolCalls",
    parseAsBoolean.withDefault(false)
  );

  const thread = useStreamContext();
  const isLastMessage = thread.messages.at(-1)?.id === message?.id;
  const hasNoAiOrToolMessages = !thread.messages.find(
    (m) => m.type === "ai" || m.type === "tool"
  );
  const meta = message ? thread.getMessagesMetadata(message) : undefined;
  const threadInterrupt = thread.interrupt;

  const toolResults = getToolResults(message, thread);
  const parentCheckpoint = meta?.firstSeenState?.parent_checkpoint;
  const anthropicStreamedToolCalls = Array.isArray(content)
    ? parseAnthropicStreamedToolCalls(content)
    : undefined;

  const hasToolCalls =
    message &&
    "tool_calls" in message &&
    message.tool_calls &&
    message.tool_calls.length > 0;
  const toolCallsHaveContents =
    hasToolCalls &&
    message.tool_calls?.some(
      (tc) => tc.args && Object.keys(tc.args).length > 0
    );
  const hasAnthropicToolCalls = !!anthropicStreamedToolCalls?.length;
  const isToolResult = message?.type === "tool";

  return {
    content,
    contentString,
    hideToolCalls,
    thread,
    isLastMessage,
    hasNoAiOrToolMessages,
    meta,
    threadInterrupt,
    toolResults,
    parentCheckpoint,
    anthropicStreamedToolCalls,
    hasToolCalls,
    toolCallsHaveContents,
    hasAnthropicToolCalls,
    isToolResult,
  };
}

export function AssistantMessage({
  message,
  isLoading,
  handleRegenerate,
}: {
  message: Message | undefined;
  isLoading: boolean;
  handleRegenerate: (parentCheckpoint: Checkpoint | null | undefined) => void;
}) {
  const {
    contentString,
    hideToolCalls,
    thread,
    isLastMessage,
    hasNoAiOrToolMessages,
    meta,
    threadInterrupt,
    toolResults,
    parentCheckpoint,
    anthropicStreamedToolCalls,
    hasToolCalls,
    toolCallsHaveContents,
    hasAnthropicToolCalls,
    isToolResult,
  } = useMessageState(message);

  if (isToolResult && hideToolCalls) {
    return null;
  }

  if (shouldHideToolResult(message)) {
    return null;
  }

  const correspondingToolCall = getCorrespondingToolCall(message, thread);
  const shouldHideButtons = shouldHideCommandButtons(
    message,
    contentString,
    isLastMessage
  );

  return (
    <div className="group mr-auto flex items-start gap-2">
      <div className="flex flex-col gap-2">
        {isToolResult ? (
          <>
            <ToolResult
              message={message as Message & { type: "tool" }}
              toolCall={correspondingToolCall}
            />
            <Interrupt
              hasNoAiOrToolMessages={hasNoAiOrToolMessages}
              interruptValue={threadInterrupt?.value}
              isLastMessage={isLastMessage}
            />
          </>
        ) : (
          <>
            {/* Render tool calls first (includes TodoList, read_file, write_file, etc.) */}
            {!hideToolCalls &&
              ((hasToolCalls && toolCallsHaveContents && (
                <ToolCalls
                  toolCalls={
                    (
                      message as Message & {
                        toolCalls?: AIMessage["tool_calls"];
                      }
                    )?.toolCalls
                  }
                  toolResults={toolResults}
                />
              )) ||
                (hasAnthropicToolCalls && (
                  <ToolCalls
                    toolCalls={anthropicStreamedToolCalls}
                    toolResults={toolResults}
                  />
                )) ||
                (hasToolCalls && (
                  <ToolCalls
                    toolCalls={
                      (
                        message as Message & {
                          toolCalls?: AIMessage["tool_calls"];
                        }
                      )?.toolCalls
                    }
                    toolResults={toolResults}
                  />
                )))}

            {message && <CustomComponent message={message} thread={thread} />}

            {/* Render markdown content after tool calls */}
            {contentString.length > 0 && (
              <div className="py-1">
                <MarkdownText>{contentString}</MarkdownText>
              </div>
            )}

            <Interrupt
              hasNoAiOrToolMessages={hasNoAiOrToolMessages}
              interruptValue={threadInterrupt?.value}
              isLastMessage={isLastMessage}
            />
            {!hasTodoListToolCalls(message) && (
              <div
                className={cn(
                  "mr-auto flex items-center gap-2 transition-opacity",
                  "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100"
                )}
              >
                <BranchSwitcher
                  branch={meta?.branch}
                  branchOptions={meta?.branchOptions}
                  isLoading={isLoading}
                  onSelect={(branch) => thread.setBranch(branch)}
                />
                <CommandBar
                  content={contentString}
                  handleRegenerate={() => handleRegenerate(parentCheckpoint)}
                  hideButtons={shouldHideButtons}
                  isAiMessage={true}
                  isLoading={isLoading}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function AssistantMessageLoading() {
  return (
    <div className="mr-auto flex items-start gap-2">
      <div className="flex h-8 items-center gap-1 rounded-2xl bg-muted px-4 py-2">
        <div className="h-1.5 w-1.5 animate-[pulse_1.5s_ease-in-out_infinite] rounded-full bg-foreground/50" />
        <div className="h-1.5 w-1.5 animate-[pulse_1.5s_ease-in-out_0.5s_infinite] rounded-full bg-foreground/50" />
        <div className="h-1.5 w-1.5 animate-[pulse_1.5s_ease-in-out_1s_infinite] rounded-full bg-foreground/50" />
      </div>
    </div>
  );
}
