import { NextResponse } from "next/server";
import { buildAgentOpenApi } from "@/lib/agent/openapi";

/**
 * GET /api/agent/openapi.json: public OpenAPI 3.1 description of the agent
 * HTTP API. Documentation only; contains no household data and needs no token.
 */
export const dynamic = "force-static";

export function GET() {
  return NextResponse.json(buildAgentOpenApi(), {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
