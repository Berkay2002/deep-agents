import { auth } from "@clerk/nextjs/server";
import { SignJWT } from "jose";
import { type NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{
    _path?: string[];
  }>;
};

type IdentitySuccess = { ok: true; userId: string };
type IdentityError = { ok: false; response: NextResponse };
type IdentityResult = IdentitySuccess | IdentityError;

type AuthHeaderSuccess = { ok: true; headerValue: string; userId: string };
type AuthHeaderError = { ok: false; response: NextResponse };
type AuthHeaderResult = AuthHeaderSuccess | AuthHeaderError;

const ALLOWED_REQUEST_HEADERS = new Set([
  "content-type",
  "accept",
  "x-requested-with",
  "x-user-id",
  "x-user-name",
  "x-user-role",
  "x-user-permissions",
  "x-organization-id",
  "x-github-pat",
]);

const SENSITIVE_HEADERS = new Set([
  "authorization",
  "x-api-key",
  "cookie",
  "set-cookie",
  "host",
]);

const DEFAULT_TTL_SECONDS = 900;

async function proxy(request: NextRequest, props: Params) {
  const env = process.env;
  const rawBaseUrl = env.LANGGRAPH_API_URL ?? env.LANGGRAPH_BASE_URL;
  if (!rawBaseUrl) {
    return NextResponse.json(
      { error: "LANGGRAPH_API_URL environment variable is not set" },
      { status: 500 }
    );
  }

  const secret = env.LANGGRAPH_AUTH_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "LANGGRAPH_AUTH_SECRET environment variable is not set" },
      { status: 500 }
    );
  }

  const params = await props.params;
  const { _path = [] } = params;
  const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, "");
  const pathname = _path.map(encodeURIComponent).join("/");
  const targetUrl = new URL(
    `${pathname}${request.nextUrl.search}`,
    `${normalizedBaseUrl}/`
  );

  const forwardHeaders = new Headers();
  for (const [key, value] of request.headers.entries()) {
    const lower = key.toLowerCase();
    if (SENSITIVE_HEADERS.has(lower)) continue;
    if (ALLOWED_REQUEST_HEADERS.has(lower)) {
      forwardHeaders.set(key, value);
    }
  }

  const authHeader = await buildAuthorizationHeader(request, secret);
  if (isAuthHeaderError(authHeader)) {
    return authHeader.response;
  }

  const { headerValue, userId } = authHeader;
  forwardHeaders.set("authorization", headerValue);
  forwardHeaders.set("x-langgraph-user-id", userId);

  const forwardedHost = request.headers.get("host");
  if (forwardedHost) forwardHeaders.set("x-forwarded-host", forwardedHost);
  const proto = request.nextUrl.protocol.replace(":", "");
  if (proto) forwardHeaders.set("x-forwarded-proto", proto);

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers: forwardHeaders,
    redirect: "manual",
    signal: request.signal,
  };

  if (request.body) {
    init.body = request.body as any;
    init.duplex = "half";
  }

  try {
    const response = await fetch(targetUrl.href, init);
    const responseHeaders = new Headers(response.headers);
    responseHeaders.delete("transfer-encoding");
    responseHeaders.delete("set-cookie");
    responseHeaders.delete("cookie");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("LangGraph proxy fetch failed:", err);
    return NextResponse.json(
      { error: "Failed to reach LangGraph server" },
      { status: 502 }
    );
  }
}

async function buildAuthorizationHeader(
  request: NextRequest,
  secret: string
): Promise<AuthHeaderResult> {
  const identity = await resolveUserIdentity(request);
  if (identity.ok === false) {
    return { ok: false as const, response: identity.response };
  }

  const secretKey = new TextEncoder().encode(secret);
  const ttlSeconds = resolveTtlSeconds();
  const now = Math.floor(Date.now() / 1000);

  const metadata = collectUserMetadata(request);
  const permissions = collectUserPermissions(request);
  const displayName = request.headers.get("x-user-name") ?? identity.userId;
  const githubPat = request.headers.get("x-github-pat");

  const payload: Record<string, unknown> = {
    display_name: displayName,
  };
  if (Object.keys(metadata).length > 0) {
    payload.metadata = metadata;
  }
  if (permissions.length > 0) {
    payload.permissions = permissions;
  }
  if (githubPat) {
    payload.github_pat = githubPat;
  }

  const issuer = process.env.LANGGRAPH_AUTH_ISSUER ?? "deep-agents";
  const audience = process.env.LANGGRAPH_AUTH_AUDIENCE ?? "langgraph";

  const jwt = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(identity.userId)
    .setIssuedAt(now)
    .setExpirationTime(now + ttlSeconds)
    .setIssuer(issuer)
    .setAudience(audience)
    .sign(secretKey);

  return {
    ok: true as const,
    headerValue: `Bearer ${jwt}`,
    userId: identity.userId,
  };
}

async function resolveUserIdentity(
  request: NextRequest
): Promise<IdentityResult> {
  // First priority: Clerk authentication
  const { userId } = await auth();
  if (userId) {
    return { ok: true as const, userId };
  }

  // Fallback: Custom header (for testing/development)
  const headerUser = request.headers.get("x-user-id");
  if (headerUser) {
    return { ok: true as const, userId: headerUser };
  }

  // Fallback: Cookie-based identity
  const cookieUser = request.cookies.get("langgraph_user")?.value;
  if (cookieUser) {
    return { ok: true as const, userId: cookieUser };
  }

  // No authenticated user found
  return {
    ok: false as const,
    response: NextResponse.json(
      { error: "Unauthorized: Please sign in to use the agent" },
      { status: 401 }
    ),
  };
}

function resolveTtlSeconds(): number {
  const raw = process.env.LANGGRAPH_AUTH_TTL_SECONDS;
  if (!raw) return DEFAULT_TTL_SECONDS;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return DEFAULT_TTL_SECONDS;
  }
  return parsed;
}

function collectUserMetadata(request: NextRequest): Record<string, string> {
  const metadata: Record<string, string> = {};
  const organizationId = request.headers.get("x-organization-id");
  if (organizationId) {
    metadata.organizationId = organizationId;
  }
  const userAgent = request.headers.get("user-agent");
  if (userAgent) {
    metadata.userAgent = userAgent;
  }
  return metadata;
}

function collectUserPermissions(request: NextRequest): string[] {
  const header =
    request.headers.get("x-user-role") ??
    request.headers.get("x-user-permissions");
  if (!header) return [];
  return header
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

function isAuthHeaderError(
  result: AuthHeaderResult
): result is AuthHeaderError {
  return result.ok === false;
}

export {
  proxy as GET,
  proxy as POST,
  proxy as PUT,
  proxy as PATCH,
  proxy as DELETE,
  proxy as OPTIONS,
  proxy as HEAD,
};
