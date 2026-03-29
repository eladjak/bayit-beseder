import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    // Exclude legacy Node test-runner files (*.mjs) — they use node:test which
    // is incompatible with Vitest. Run those via `bun run test:node` instead.
    exclude: ["**/node_modules/**", "**/*.mjs", "e2e/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
