import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  // Unit/integration tests only; Playwright specs in e2e/ run with `npm run test:e2e`.
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
