import { NextRequest } from "next/server";

const rawBaseUrl = process.env.LANGGRAPH_BASE_URL;
const normalizedBaseUrl = rawBaseUrl?.replace(/\/+$/, "");

type Params = {
  params: {
    _path?: string[];
  };
};

async function proxy(request: NextRequest, { params }: Params) {
  if (!normalizedBaseUrl) {
    return new Response("LANGGRAPH_BASE_URL environment variable is not set", {
      status: 500,
    });
  }

  const { _path = [] } = params;
  const search = request.nextUrl.search;
  const pathname = _path.map(encodeURIComponent).join("/");
  const targetUrl = new URL(`${pathname}${search}`, `${normalizedBaseUrl}/`);

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("content-length");

  const forwardedHost = request.headers.get("host");
  if (forwardedHost) {
    headers.set("x-forwarded-host", forwardedHost);
  }

  const protocol = request.nextUrl.protocol.replace(":", "");
  if (protocol) {
    headers.set("x-forwarded-proto", protocol);
  }

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
    signal: request.signal,
  };

  if (request.body) {
    init.body = request.body as any;
    init.duplex = "half";
  }

  const response = await fetch(targetUrl, init);

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("transfer-encoding");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as OPTIONS, proxy as HEAD };
