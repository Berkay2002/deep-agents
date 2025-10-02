import { Auth, HTTPException } from "@langchain/langgraph-sdk/auth";
import { jwtVerify } from "jose";

const issuer = process.env.LANGGRAPH_AUTH_ISSUER ?? "deep-agents";
const audience = process.env.LANGGRAPH_AUTH_AUDIENCE ?? "langgraph";

const secret = process.env.LANGGRAPH_AUTH_SECRET;

// HTTP status codes
const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500;
const HTTP_STATUS_UNAUTHORIZED = 401;
const HTTP_STATUS_FORBIDDEN = 403;

type AuthReturn = {
  identity: string;
  permissions: string[];
  isAuthenticated: boolean;
  displayName: string;
  metadata?: Record<string, unknown>;
};

function getSecretKey(): Uint8Array {
  if (!secret) {
    throw new HTTPException(HTTP_STATUS_INTERNAL_SERVER_ERROR, {
      message: "LANGGRAPH_AUTH_SECRET environment variable is not set",
    });
  }
  return new TextEncoder().encode(secret);
}

function normalizePermissions(input: unknown): string[] {
  if (!Array.isArray(input)) {
    return [];
  }
  return input.filter(
    (value): value is string => typeof value === "string" && value.length > 0
  );
}

function normalizeMetadata(
  input: unknown
): Record<string, unknown> | undefined {
  if (!input || typeof input !== "object") {
    return;
  }
  if (Array.isArray(input)) {
    return;
  }
  return input as Record<string, unknown>;
}

export const auth = new Auth<Record<string, never>, AuthReturn>().authenticate(
  async (request) => {
    const secretKey = getSecretKey();

    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      throw new HTTPException(HTTP_STATUS_UNAUTHORIZED, {
        message: "Missing bearer authorization",
      });
    }

    const token = authorization.slice("Bearer ".length).trim();
    try {
      const { payload } = await jwtVerify(token, secretKey, {
        issuer,
        audience,
      });

      const subject =
        typeof payload.sub === "string" && payload.sub.length > 0
          ? payload.sub
          : undefined;
      if (!subject) {
        throw new HTTPException(HTTP_STATUS_FORBIDDEN, {
          message: "Token missing subject",
        });
      }

      const permissions = normalizePermissions(
        (payload as Record<string, unknown>).permissions
      );
      const displayName =
        typeof payload.display_name === "string" &&
        payload.display_name.length > 0
          ? payload.display_name
          : subject;

      return {
        identity: subject,
        permissions,
        displayName,
        isAuthenticated: true,
        metadata: normalizeMetadata(
          (payload as Record<string, unknown>).metadata
        ),
      } satisfies AuthReturn;
    } catch (error) {
      // Log authentication error for debugging purposes
      if (error instanceof HTTPException) {
        throw error;
      }
      throw new HTTPException(HTTP_STATUS_UNAUTHORIZED, {
        message: "Invalid or expired authorization token",
        cause: error,
      });
    }
  }
);
