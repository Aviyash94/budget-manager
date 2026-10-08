import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sendEmail } from "./email";

const mail = { to: "a@test.mu", subject: "Hello", text: "body", html: "<p>body</p>" };

beforeEach(() => {
  vi.stubEnv("RESEND_API_KEY", "");
  vi.stubEnv("EMAIL_FROM", "");
  vi.stubEnv("EMAIL_OUTBOX_DIR", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("sendEmail", () => {
  it("posts to Resend with the key and sender when configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "Budget <noreply@example.test>");
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal("fetch", fetchMock);

    await sendEmail(mail);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer re_test");
    expect(JSON.parse(init.body)).toMatchObject({
      from: "Budget <noreply@example.test>",
      to: ["a@test.mu"],
      subject: "Hello",
    });
  });

  it("fails loudly if the provider rejects the message, without echoing the response body", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("EMAIL_FROM", "x@example.test");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    await expect(sendEmail(mail)).rejects.toThrow("HTTP 403");
  });

  it("requires a sender when an API key is set", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    await expect(sendEmail(mail)).rejects.toThrow("EMAIL_FROM");
  });

  it("writes to the outbox directory when set (tests only)", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "outbox-"));
    try {
      vi.stubEnv("EMAIL_OUTBOX_DIR", dir);
      await sendEmail(mail);
      const files = await readdir(dir);
      expect(files).toHaveLength(1);
      expect(JSON.parse(await readFile(path.join(dir, files[0]), "utf8"))).toMatchObject(mail);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("prints to the console outside production when nothing is configured", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await sendEmail(mail);
    expect(log.mock.calls[0][0]).toContain("body");
  });

  it("refuses to pretend in production when nothing is configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(sendEmail(mail)).rejects.toThrow("No email provider configured");
  });
});
