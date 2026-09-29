import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import path from "node:path";
import { GET } from "../route";

describe("GET /api/agent/openapi.json", () => {
  it("is valid JSON, OpenAPI 3.1, with bearer auth declared", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    const spec = JSON.parse(await res.text());
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.components.securitySchemes.householdToken).toMatchObject({
      type: "http",
      scheme: "bearer",
    });
    expect(spec.security).toEqual([{ householdToken: [] }]);
  });

  it("every documented path is a real route in the repo", async () => {
    const spec = JSON.parse(await GET().text());
    const paths = Object.keys(spec.paths);
    expect(paths.length).toBeGreaterThanOrEqual(5);
    for (const p of paths) {
      const file = path.join(process.cwd(), "src/app", p, "route.ts");
      expect(existsSync(file), `${p} has no route file`).toBe(true);
    }
  });

  it("never asks the caller for a householdId", async () => {
    const text = await GET().text();
    expect(text).not.toMatch(/"householdId"\s*:/);
  });
});
