import { defineConfig } from "@playwright/test";

const PORT = process.env.E2E_PORT ?? "3100";

// Browser: by default Playwright's own Chromium (`npx playwright install chromium`).
// Set PW_CHANNEL=msedge or chrome to use an already-installed browser instead.
const channel = process.env.PW_CHANNEL || undefined;

export default defineConfig({
  testDir: "./e2e",
  testMatch: "*.spec.ts",
  timeout: 90_000,
  // Sign-up hashes a password (bcrypt) and signs in, which is slow on a cold server.
  expect: { timeout: 20_000 },
  retries: 0,
  reporter: [["list"]],
  use: { baseURL: `http://localhost:${PORT}`, channel, trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 900 } } },
    {
      name: "mobile",
      use: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
    },
  ],
  webServer: {
    command: "node e2e/serve.mjs",
    url: `http://localhost:${PORT}/login`,
    timeout: 240_000,
    reuseExistingServer: false,
  },
});
