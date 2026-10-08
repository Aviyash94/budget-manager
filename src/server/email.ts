import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export type Email = { to: string; subject: string; text: string; html?: string };
export type SendEmail = (email: Email) => Promise<void>;

/**
 * Delivery, chosen by environment:
 * - RESEND_API_KEY (+ EMAIL_FROM): sent through Resend's HTTP API.
 * - EMAIL_OUTBOX_DIR: written to a JSON file. For automated tests only; never set it in production.
 * - neither, outside production: printed to the server console so you can click the link locally.
 * - neither, in production: not sent. The error is logged and the caller still answers generically.
 */
export const sendEmail: SendEmail = async (email) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;

  if (apiKey) {
    if (!from) throw new Error("EMAIL_FROM is required when RESEND_API_KEY is set");
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [email.to],
        subject: email.subject,
        text: email.text,
        html: email.html,
      }),
    });
    if (!res.ok) throw new Error(`Email provider rejected the message (HTTP ${res.status})`);
    return;
  }

  const outbox = process.env.EMAIL_OUTBOX_DIR;
  if (outbox) {
    await mkdir(outbox, { recursive: true });
    const file = path.join(outbox, `${Date.now()}-${crypto.randomUUID()}.json`);
    await writeFile(file, JSON.stringify(email, null, 2));
    return;
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`\n[email to ${email.to}] ${email.subject}\n${email.text}\n`);
    return;
  }

  throw new Error("No email provider configured (set RESEND_API_KEY and EMAIL_FROM)");
};
