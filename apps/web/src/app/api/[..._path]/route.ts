// apps/web/src/app/api/[..._path]/route.ts
import { NextRequest, NextResponse } from "next/server";

type Params = {
  params: Promise<{
    _path?: string[];
  }>;
};

// Minimal, explicit list of request headers we allow forwarding to LangGraph.
// Keep this small and add entries only when your LangGraph runtime expects them.
const ALLOWED_REQUEST_HEADERS = new Set([
  "content-type",
  "accept",
  "x-requested-with",
  // add custom headers here only if LangGraph is configured to accept them:
  "x-user-id",
  "x-organization-id",
]);

// Headers that must never be forwarded from the browser.
const SENSITIVE_HEADERS = new Set([
  "authorization",
  "x-api-key",
  "cookie",
  "set-cookie",
  "host",
]);

async function proxy(request: NextRequest, props: Params) {
  const params = await props.params;
  const rawBaseUrl = process.env.LANGGRAPH_BASE_URL;
  if (!rawBaseUrl) {
    return NextResponse.json(
      { error: "LANGGRAPH_BASE_URL environment variable is not set" },
      { status: 500 }
    );
  }
  const normalizedBaseUrl = rawBaseUrl.replace(/\/+$/, "");

  const { _path = [] } = params;
  const pathname = _path.map(encodeURIComponent).join("/");
  const targetUrl = new URL(`${pathname}${request.nextUrl.search}`, `${normalizedBaseUrl}/`);

  // Build a clean header bag: copy only allowed headers from the incoming request.
  const forwardHeaders = new Headers();
  for (const [key, value] of request.headers.entries()) {
    const lower = key.toLowerCase();
    if (SENSITIVE_HEADERS.has(lower)) continue;
    if (ALLOWED_REQUEST_HEADERS.has(lower)) forwardHeaders.set(key, value);
  }

  // Intentionally add a server-side auth token if configured (never expose to client).
  if (process.env.LANGGRAPH_SERVER_TOKEN) {
    forwardHeaders.set("authorization", `Bearer ${process.env.LANGGRAPH_SERVER_TOKEN}`);
  }

  // Forward a couple of useful proxy headers intentionally.
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

  // Support streaming bodies when present
  if (request.body) {
    init.body = request.body as any;
    init.duplex = "half";
  }

  try {
    const response = await fetch(targetUrl.href, init);

    // Clone & sanitize response headers before returning to client.
    const responseHeaders = new Headers(response.headers);
    // Remove hop-by-hop and sensitive headers
    responseHeaders.delete("transfer-encoding");
    responseHeaders.delete("set-cookie");
    responseHeaders.delete("cookie");

    // If you want to allow certain response headers to reach the client,
    // add them explicitly here (do not leak internal headers).
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    console.error("LangGraph proxy fetch failed:", err);
    return NextResponse.json({ error: "Failed to reach LangGraph server" }, { status: 502 });
  }
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as OPTIONS, proxy as HEAD };
