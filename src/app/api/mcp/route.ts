import { NextRequest, NextResponse } from "next/server";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { verifyAgentRequest } from "@/lib/agent/auth";
import { createBayitMcpServer } from "@/lib/agent/mcp-server";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

/**
 * /api/mcp: remote MCP server (Streamable HTTP transport, stateless).
 *
 * Auth: the same per-household bearer token as /api/agent/*
 * (`verifyAgentRequest`). The household comes from the token, never from tool
 * arguments. Missing or bad token → 401; fails closed on every other
 * non-success. See src/lib/agent/mcp-server.ts for the tools.
 *
 * Stateless: a fresh server + transport per request (no session ids, plain
 * JSON responses), which is what serverless functions need.
 */
export const dynamic = "force-dynamic";

const limiter = rateLimit({ windowMs: 60_000, max: 60 });

const unauthorizedHeaders = {
  "WWW-Authenticate": 'Bearer realm="bayit-beseder"',
  "Cache-Control": "no-store",
};

export async function POST(request: NextRequest) {
  // Rate limit BEFORE the token lookup (auth queries the DB per distinct token).
  const rl = await limiter.check(getClientIp(request));
  if (!rl.success) {
    return NextResponse.json(
      { error: "יותר מדי בקשות. נסו שוב עוד דקה." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(rl.reset / 1000)) } }
    );
  }

  const auth = await verifyAgentRequest(request);
  if (!auth.ok) {
    // Missing token is already 401. A wrong token is 403 upstream; for MCP
    // clients that is still "not authenticated", so answer 401 too. A 503 (auth
    // backend outage) stays 503 so it is not mistaken for a bad credential.
    const status = auth.status === 403 ? 401 : auth.status;
    return NextResponse.json(
      { error: auth.error },
      { status, headers: status === 401 ? unauthorizedHeaders : { "Cache-Control": "no-store" } }
    );
  }
  if (!auth.householdId) {
    return NextResponse.json(
      { error: "הטוקן אינו מורשה לפעול על אף משק בית." },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  const server = createBayitMcpServer({
    origin: new URL(request.url).origin,
    authorization: request.headers.get("authorization") ?? "",
    forwardedFor: request.headers.get("x-forwarded-for"),
  });
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    // The response is fully built (JSON mode) before handleRequest resolves.
    void server.close();
  }
}

/** Auth first (so an unauthenticated probe gets 401), then 405: this server
 * is stateless and offers no server-initiated SSE stream. */
async function methodNotAllowed(request: NextRequest) {
  const rl = await limiter.check(getClientIp(request));
  if (!rl.success) {
    return NextResponse.json({ error: "יותר מדי בקשות." }, { status: 429 });
  }
  const auth = await verifyAgentRequest(request);
  if (!auth.ok) {
    const status = auth.status === 403 ? 401 : auth.status;
    return NextResponse.json(
      { error: auth.error },
      { status, headers: status === 401 ? unauthorizedHeaders : { "Cache-Control": "no-store" } }
    );
  }
  return NextResponse.json(
    { error: "Use POST (MCP Streamable HTTP, stateless)." },
    { status: 405, headers: { Allow: "POST" } }
  );
}

export const GET = methodNotAllowed;
export const DELETE = methodNotAllowed;
