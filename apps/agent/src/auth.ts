import { Auth, HTTPException } from "@langchain/langgraph-sdk/auth";
import { jwtVerify } from "jose";

const issuer = process.env.LANGGRAPH_AUTH_ISSUER ?? "deep-agents";
const audience = process.env.LANGGRAPH_AUTH_AUDIENCE ?? "langgraph";

const secret = process.env.LANGGRAPH_AUTH_SECRET;

type AuthReturn = {
  identity: string;
  permissions: string[];
  is_authenticated: boolean;
  display_name: string;
  metadata?: Record<string, unknown>;
};

function getSecretKey(): Uint8Array {
  if (!secret) {
    throw new HTTPException(500, {
      message: "LANGGRAPH_AUTH_SECRET environment variable is not set",
    });
  }
  return new TextEncoder().encode(secret);
}

function normalizePermissions(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.filter((value): value is string => typeof value === "string" && value.length > 0);
}

function normalizeMetadata(input: unknown): Record<string, unknown> | undefined {
  if (!input || typeof input !== "object") return undefined;
  if (Array.isArray(input)) return undefined;
  return input as Record<string, unknown>;
}

export const auth = new Auth<Record<string, never>, AuthReturn>().authenticate(async (request) => {
  const secretKey = getSecretKey();

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new HTTPException(401, {
      message: "Missing bearer authorization",
    });
  }

  const token = authorization.slice("Bearer ".length).trim();
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      issuer,
      audience,
    });

    const subject = typeof payload.sub === "string" && payload.sub.length > 0 ? payload.sub : undefined;
    if (!subject) {
      throw new HTTPException(403, {
        message: "Token missing subject",
      });
    }

    const permissions = normalizePermissions((payload as Record<string, unknown>).permissions);
    const displayName = typeof payload.display_name === "string" && payload.display_name.length > 0 ? payload.display_name : subject;

    return {
      identity: subject,
      permissions,
      display_name: displayName,
      is_authenticated: true,
      metadata: normalizeMetadata((payload as Record<string, unknown>).metadata),
    } satisfies AuthReturn;
  } catch (error) {
    console.error("LangGraph auth token verification failed", error);
    if (error instanceof HTTPException) {
      throw error;
    }
    throw new HTTPException(401, {
      message: "Invalid or expired authorization token",
      cause: error,
    });
  }
});
