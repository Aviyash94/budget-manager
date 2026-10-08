// Starts an isolated production server for the Playwright smoke test:
// fresh SQLite file, own build folder, own port. Never touches local.db or a running `next dev`.
import { spawn, spawnSync } from "node:child_process";
import { rmSync } from "node:fs";

const PORT = process.env.E2E_PORT ?? "3100";
const DB_FILE = "e2e.db";

const env = {
  ...process.env,
  DATABASE_URL: `file:./${DB_FILE}`,
  TURSO_AUTH_TOKEN: "",
  AUTH_SECRET: "e2e-only-secret-not-for-real-use",
  AUTH_TRUST_HOST: "true",
  NEXT_DIST_DIR: ".next-e2e",
};

function run(cmd, args) {
  const r = spawnSync(cmd, args, { stdio: "inherit", env, shell: true });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

rmSync(DB_FILE, { force: true });
run("npx", ["drizzle-kit", "migrate"]);
run("npx", ["next", "build"]);

const server = spawn("npx", ["next", "start", "-p", PORT], { stdio: "inherit", env, shell: true });
const stop = () => server.kill();
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
server.on("exit", (code) => process.exit(code ?? 0));
