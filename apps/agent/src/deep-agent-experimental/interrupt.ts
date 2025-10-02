import type { BaseMessage } from "@langchain/core/messages";
import { AIMessage, isAIMessage, ToolMessage } from "@langchain/core/messages";
import type { ToolCall } from "@langchain/core/messages/tool";
import { interrupt } from "@langchain/langgraph";
import type {
  ActionRequest,
  HumanInterrupt,
  HumanInterruptConfig,
  HumanResponse,
} from "@langchain/langgraph/prebuilt";
import type {
  DeepAgentStateType,
  LangGraphRunnableConfig,
  ToolInterruptConfig,
} from "./types.js";

export function createInterruptHook(
  toolConfigs: ToolInterruptConfig,
  messagePrefix = "Tool execution requires approval"
): (
  state: Record<string, unknown>,
  options:
    | Record<string, unknown>
    | LangGraphRunnableConfig<Record<string, unknown>>
    | (Record<string, unknown> &
        LangGraphRunnableConfig<Record<string, unknown>>)
) => Promise<Partial<Record<string, unknown>> | undefined> {
  /**
   * Create a post model hook that handles interrupts using native LangGraph schemas.
   *
   * Args:
   *   toolConfigs: Record mapping tool names to HumanInterruptConfig objects
   *   messagePrefix: Optional message prefix for interrupt descriptions
   */

  for (const [tool, interruptConfig] of Object.entries(toolConfigs)) {
    if (
      interruptConfig &&
      typeof interruptConfig === "object" &&
      interruptConfig.allow_ignore
    ) {
      throw new Error(
        `For ${tool} we get allow_ignore = true - we currently don't support ignore.`
      );
    }
  }

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex interrupt handling logic
  return async function interruptHook(
    state: Record<string, unknown>,
    _options:
      | Record<string, unknown>
      | LangGraphRunnableConfig<Record<string, unknown>>
      | (Record<string, unknown> &
          LangGraphRunnableConfig<Record<string, unknown>>)
  ): Promise<Partial<Record<string, unknown>> | undefined> {
    // Cast the state to DeepAgentStateType for internal use
    const typedState = state as DeepAgentStateType;
    const messages = (typedState.messages as BaseMessage[]) || [];
    if (!messages.length) {
      return;
    }

    const lastMessage = messages.at(-1);
    if (
      !(
        lastMessage &&
        isAIMessage(lastMessage) &&
        lastMessage.tool_calls &&
        lastMessage.tool_calls.length
      )
    ) {
      return;
    }

    const interruptToolCalls: ToolCall[] = [];
    const autoApprovedToolCalls: ToolCall[] = [];

    for (const toolCall of lastMessage.tool_calls || []) {
      const toolName = toolCall.name;
      if (toolName in toolConfigs) {
        interruptToolCalls.push(toolCall);
      } else {
        autoApprovedToolCalls.push(toolCall);
      }
    }

    if (!interruptToolCalls.length) {
      return;
    }

    const approvedToolCalls = [...autoApprovedToolCalls];

    if (interruptToolCalls.length > 1) {
      throw new Error(
        "Right now, interrupt hook only works when one tool requires interrupts"
      );
    }

    const toolCall = interruptToolCalls[0];
    if (!toolCall) {
      throw new Error("Tool call is undefined");
    }
    const toolName = toolCall.name;
    const toolArgs = toolCall.args;
    const description = `${messagePrefix}\n\nTool: ${toolName}\nArgs: ${JSON.stringify(toolArgs, null, 2)}`;
    const toolConfig = toolConfigs[toolName];

    const defaultToolConfig: HumanInterruptConfig = {
      // biome-ignore lint/style/useNamingConvention: Required by LangGraph API
      allow_accept: true,
      // biome-ignore lint/style/useNamingConvention: Required by LangGraph API
      allow_edit: true,
      // biome-ignore lint/style/useNamingConvention: Required by LangGraph API
      allow_respond: true,
      // biome-ignore lint/style/useNamingConvention: Required by LangGraph API
      allow_ignore: false,
    };

    const request: HumanInterrupt = {
      // biome-ignore lint/style/useNamingConvention: Required by LangGraph API
      action_request: {
        action: toolName,
        args: toolArgs,
      },
      config: typeof toolConfig === "object" ? toolConfig : defaultToolConfig,
      description,
    };

    const res: HumanResponse | HumanResponse[] = await interrupt([request]);
    const responses = Array.isArray(res) ? res : [res];
    if (responses.length !== 1) {
      throw new Error(`Expected a list of one response, got ${responses}`);
    }

    const response = responses[0];
    if (!response) {
      throw new Error("Response is undefined");
    }

    if (response.type === "accept") {
      if (!toolCall) {
        throw new Error("Tool call is undefined");
      }
      approvedToolCalls.push(toolCall);
    } else if (response.type === "edit") {
      if (!toolCall) {
        throw new Error("Tool call is undefined");
      }
      const edited = response.args as ActionRequest;
      const newToolCall = {
        name: edited.action,
        args: edited.args,
        id: toolCall.id,
      };
      approvedToolCalls.push(newToolCall);
    } else if (response.type === "response") {
      if (!toolCall?.id) {
        throw new Error("Tool call must have an ID for response type");
      }
      const responseMessage = new ToolMessage({
        // biome-ignore lint/style/useNamingConvention: Required by LangGraph API
        tool_call_id: toolCall.id,
        content: response.args as string,
      });
      return { messages: [responseMessage] };
    } else {
      throw new Error(`Unknown response type: ${response.type}`);
    }

    const updatedLastMessage = new AIMessage({
      ...lastMessage,
      // biome-ignore lint/style/useNamingConvention: Required by LangGraph API
      tool_calls: approvedToolCalls,
    });

    return { messages: [updatedLastMessage] };
  };
}
