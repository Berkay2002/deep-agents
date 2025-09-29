import { NextRequest } from "next/server";

const LANGGRAPH_SERVER_URL = process.env.LANGGRAPH_SERVER_URL ?? "http://localhost:8123";

export async function GET(request: NextRequest, { params }: { params: { _path: string[] } }) {
  const targetUrl = new URL(params._path.join("/"), `${LANGGRAPH_SERVER_URL}/`);
  targetUrl.search = request.nextUrl.search;

  const response = await fetch(targetUrl, {
    method: "GET",
    headers: Object.fromEntries(request.headers),
  });

  return new Response(await response.arrayBuffer(), {
    status: response.status,
    headers: response.headers,
  });
}

export async function POST(request: NextRequest, { params }: { params: { _path: string[] } }) {
  const targetUrl = new URL(params._path.join("/"), `${LANGGRAPH_SERVER_URL}/`);
  targetUrl.search = request.nextUrl.search;

  const response = await fetch(targetUrl, {
    method: "POST",
    headers: Object.fromEntries(request.headers),
    body: request.body,
    duplex: "half",
  });

  return new Response(await response.arrayBuffer(), {
    status: response.status,
    headers: response.headers,
  });
}
