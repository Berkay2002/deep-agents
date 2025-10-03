import type { BaseMessage } from "@langchain/core/messages";
import type {
  HumanInterrupt,
  HumanResponse,
} from "@langchain/langgraph/prebuilt";
import type { Thread, ThreadStatus } from "@langchain/langgraph-sdk";

export type HumanResponseWithEdits = HumanResponse &
  (
    | { acceptAllowed?: false; editsMade?: never }
    | { acceptAllowed?: true; editsMade?: boolean }
  );

export type Email = {
  id: string;
  threadId: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  pageContent: string;
  sendTime?: string;
  read?: boolean;
  status?: "in-queue" | "processing" | "hitl" | "done";
};

export type ThreadValues = {
  email: Email;
  messages: BaseMessage[];
  triage: {
    logic: string;
    response: string;
  };
};

export type ThreadData<
  TThreadValues extends Record<string, any> = Record<string, any>,
> = {
  thread: Thread<TThreadValues>;
} & (
  | {
      status: "interrupted";
      interrupts: HumanInterrupt[] | undefined;
    }
  | {
      status: "idle" | "busy" | "error";
      interrupts?: never;
    }
);

export type ThreadStatusWithAll = ThreadStatus | "all";

export type SubmitType = "accept" | "response" | "edit";

export type AgentInbox = {
  /**
   * A unique identifier for the inbox.
   */
  id: string;
  /**
   * The ID of the graph.
   */
  graphId: string;
  /**
   * The URL of the deployment. Either a localhost URL, or a deployment URL.
   */
  deploymentUrl: string;
  /**
   * Optional name for the inbox, used in the UI to label the inbox.
   */
  name?: string;
  /**
   * Whether or not the inbox is selected.
   */
  selected: boolean;
};
