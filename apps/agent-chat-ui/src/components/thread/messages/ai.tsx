import { parsePartialJson } from "@langchain/core/output_parsers";
import { useStreamContext } from "@/providers/Stream";
import { AIMessage, Checkpoint, Message } from "@langchain/langgraph-sdk";
import { getContentString } from "../utils";
import { BranchSwitcher, CommandBar } from "./shared";
import { MarkdownText } from "../markdown-text";
import { LoadExternalComponent } from "@langchain/langgraph-sdk/react-ui";
import { cn } from "@/lib/utils";
import { ToolCalls, ToolResult } from "./tool-calls";
import { MessageContentComplex } from "@langchain/core/messages";
import { Fragment } from "react/jsx-runtime";
import { isAgentInboxInterruptSchema } from "@/lib/agent-inbox-interrupt";
import { ThreadView } from "../agent-inbox";
import { useQueryState, parseAsBoolean } from "nuqs";
import { GenericInterruptView } from "./generic-interrupt";
import { useArtifact } from "../artifact";

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
    (ui) => ui.metadata?.message_id === message.id,
  );

  if (!customComponents?.length) return null;
  return (
    <Fragment key={message.id}>
      {customComponents.map((customComponent) => (
        <LoadExternalComponent
          key={customComponent.id}
          stream={thread}
          message={customComponent}
          meta={{ ui: customComponent, artifact }}
        />
      ))}
    </Fragment>
  );
}

function parseAnthropicStreamedToolCalls(
  content: MessageContentComplex[],
): AIMessage["tool_calls"] {
  const toolCallContents = content.filter((c) => c.type === "tool_use" && c.id);

  return toolCallContents.map((tc) => {
    const toolCall = tc as Record<string, any>;
    let json: Record<string, any> = {};
    if (toolCall?.input) {
      try {
        json = parsePartialJson(toolCall.input) ?? {};
      } catch {
        // Pass
      }
    }
    return {
      name: toolCall.name ?? "",
      id: toolCall.id ?? "",
      args: json,
      type: "tool_call",
    };
  });
}

interface InterruptProps {
  interruptValue?: unknown;
  isLastMessage: boolean;
  hasNoAIOrToolMessages: boolean;
}

function Interrupt({
  interruptValue,
  isLastMessage,
  hasNoAIOrToolMessages,
}: InterruptProps) {
  return (
    <>
      {isAgentInboxInterruptSchema(interruptValue) &&
        (isLastMessage || hasNoAIOrToolMessages) && (
          <ThreadView interrupt={interruptValue} />
        )}
      {interruptValue &&
      !isAgentInboxInterruptSchema(interruptValue) &&
      (isLastMessage || hasNoAIOrToolMessages) ? (
        <GenericInterruptView interrupt={interruptValue} />
      ) : null}
    </>
  );
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
  const content = message?.content ?? [];
  const contentString = getContentString(content);
  const [hideToolCalls] = useQueryState(
    "hideToolCalls",
    parseAsBoolean.withDefault(false),
  );

  const thread = useStreamContext();
  const isLastMessage =
    thread.messages[thread.messages.length - 1].id === message?.id;
  const hasNoAIOrToolMessages = !thread.messages.find(
    (m) => m.type === "ai" || m.type === "tool",
  );
  const meta = message ? thread.getMessagesMetadata(message) : undefined;
  const threadInterrupt = thread.interrupt;

  // Collect tool results that follow this message's tool calls
  const toolResults = message && "tool_calls" in message && message.tool_calls
    ? message.tool_calls.map((tc) => {
        // Find the corresponding tool result message
        const resultMessage = thread.messages.find(
          (m) => m.type === "tool" && "tool_call_id" in m && m.tool_call_id === tc.id
        );
        const isError = resultMessage && typeof resultMessage.content === "string" &&
          (resultMessage.content.toLowerCase().includes("error:") ||
           resultMessage.content.toLowerCase().includes("string not found"));
        const isSuccess = resultMessage && typeof resultMessage.content === "string" &&
          resultMessage.content.toLowerCase().includes("updated file");
        return {
          id: tc.id || "",
          error: isError ? String(resultMessage.content) : undefined,
          success: isSuccess && !isError,
        };
      })
    : undefined;

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
      (tc) => tc.args && Object.keys(tc.args).length > 0,
    );
  const hasAnthropicToolCalls = !!anthropicStreamedToolCalls?.length;
  const isToolResult = message?.type === "tool";

  // Hide tool results for TodoWrite since TodoList component already shows this
  const isTodoWriteResult =
    isToolResult &&
    message?.name &&
    (message.name === "TodoWrite" || message.name === "write_todos");

  // Also hide tool results that contain todo list updates in the content
  const isTodoListContentResult =
    isToolResult &&
    typeof message.content === "string" &&
    message.content.includes("Updated todo list to");

  // Hide sub-agent responses (research-agent, critique-agent) since they are intermediate results
  // The main agent synthesizes these into the final report, so users shouldn't see raw sub-agent output
  const isSubAgentResult =
    isToolResult &&
    message?.name &&
    (message.name === "research-agent" ||
     message.name === "critique-agent" ||
     message.name === "task"); // "task" is the generic name for sub-agent calls

  // Hide file operation results since they're shown in WriteFileDiff component
  const isFileOperationResult =
    isToolResult &&
    message?.name &&
    (message.name === "write_file" || message.name === "edit_file" ||
     message.name === "Write" || message.name === "Edit" || message.name === "MultiEdit");

  // Check if message contains TodoList tool calls
  const hasTodoListToolCalls =
    hasToolCalls &&
    message.tool_calls?.some(tc =>
      (tc.name === "write_todos" || tc.name === "TodoWrite") &&
      tc.args &&
      "todos" in tc.args &&
      Array.isArray(tc.args.todos)
    );

  if (isToolResult && hideToolCalls) {
    return null;
  }

  if (isTodoWriteResult || isTodoListContentResult || isSubAgentResult || isFileOperationResult) {
    return null;
  }

  // Find the corresponding tool call for this tool result
  const correspondingToolCall = isToolResult && "tool_call_id" in message
    ? thread.messages
        .filter((m): m is AIMessage => m.type === "ai" && "tool_calls" in m)
        .flatMap((m) => m.tool_calls || [])
        .find((tc) => tc.id === message.tool_call_id)
    : undefined;

  return (
    <div className="group mr-auto flex items-start gap-2">
      <div className="flex flex-col gap-2">
        {isToolResult ? (
          <>
            <ToolResult message={message} toolCall={correspondingToolCall} />
            <Interrupt
              interruptValue={threadInterrupt?.value}
              isLastMessage={isLastMessage}
              hasNoAIOrToolMessages={hasNoAIOrToolMessages}
            />
          </>
        ) : (
          <>
            {/* Render tool calls first (includes TodoList, read_file, write_file, etc.) */}
            {!hideToolCalls && (
              <>
                {(hasToolCalls && toolCallsHaveContents && (
                  <ToolCalls toolCalls={message.tool_calls} toolResults={toolResults} />
                )) ||
                  (hasAnthropicToolCalls && (
                    <ToolCalls toolCalls={anthropicStreamedToolCalls} toolResults={toolResults} />
                  )) ||
                  (hasToolCalls && (
                    <ToolCalls toolCalls={message.tool_calls} toolResults={toolResults} />
                  ))}
              </>
            )}

            {message && (
              <CustomComponent
                message={message}
                thread={thread}
              />
            )}

            {/* Render markdown content after tool calls */}
            {contentString.length > 0 && (
              <div className="py-1">
                <MarkdownText>{contentString}</MarkdownText>
              </div>
            )}

            <Interrupt
              interruptValue={threadInterrupt?.value}
              isLastMessage={isLastMessage}
              hasNoAIOrToolMessages={hasNoAIOrToolMessages}
            />
            {!hasTodoListToolCalls && (
              <div
                className={cn(
                  "mr-auto flex items-center gap-2 transition-opacity",
                  "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100",
                )}
              >
                <BranchSwitcher
                  branch={meta?.branch}
                  branchOptions={meta?.branchOptions}
                  onSelect={(branch) => thread.setBranch(branch)}
                  isLoading={isLoading}
                />
                <CommandBar
                  content={contentString}
                  isLoading={isLoading}
                  isAiMessage={true}
                  handleRegenerate={() => handleRegenerate(parentCheckpoint)}
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
      <div className="bg-muted flex h-8 items-center gap-1 rounded-2xl px-4 py-2">
        <div className="bg-foreground/50 h-1.5 w-1.5 animate-[pulse_1.5s_ease-in-out_infinite] rounded-full"></div>
        <div className="bg-foreground/50 h-1.5 w-1.5 animate-[pulse_1.5s_ease-in-out_0.5s_infinite] rounded-full"></div>
        <div className="bg-foreground/50 h-1.5 w-1.5 animate-[pulse_1.5s_ease-in-out_1s_infinite] rounded-full"></div>
      </div>
    </div>
  );
}
