import { Resend } from "resend";
import { logger } from "../middleware/logger.js";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const EMAIL_FROM = process.env.EMAIL_FROM || "Conductor <noreply@conductor.app>";

export async function sendWelcomeEmail(to: string, name: string) {
  if (!resend) {
    logger.info({ to }, "Skipping welcome email — RESEND_API_KEY not configured");
    return;
  }

  try {
    await resend.emails.send({
      from: EMAIL_FROM,
      to,
      subject: "Welcome to Conductor",
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;">
          <!-- Header -->
          <tr>
            <td style="padding:0 0 32px;">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" style="vertical-align:middle;">
                <line x1="6" y1="18" x2="18" y2="4" stroke="#e4e4e7" stroke-width="2" stroke-linecap="round"/>
                <circle cx="18" cy="4" r="2.5" fill="#e4e4e7"/>
              </svg>
              <span style="color:#e4e4e7;font-size:14px;font-weight:600;margin-left:8px;vertical-align:middle;">Conductor</span>
            </td>
          </tr>

          <!-- Main content -->
          <tr>
            <td style="background-color:#18181b;border:1px solid #27272a;border-radius:8px;padding:40px;">
              <h1 style="color:#fafafa;font-size:22px;font-weight:600;margin:0 0 16px;">Welcome to Conductor${name ? `, ${name}` : ""}</h1>
              <p style="color:#a1a1aa;font-size:14px;line-height:24px;margin:0 0 24px;">
                Your AI-powered command center is ready. Conductor lets you orchestrate teams of AI agents to run your business operations.
              </p>

              <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                <tr>
                  <td style="background-color:#27272a;border-radius:6px;padding:16px 20px;">
                    <p style="color:#fafafa;font-size:13px;font-weight:500;margin:0 0 8px;">Getting started:</p>
                    <p style="color:#a1a1aa;font-size:13px;line-height:22px;margin:0;">
                      1. Create your first organization<br>
                      2. Set up a CEO agent with your Anthropic API key<br>
                      3. Subscribe to activate your agents<br>
                      4. Watch your AI team get to work
                    </p>
                  </td>
                </tr>
              </table>

              <p style="color:#71717a;font-size:12px;line-height:20px;margin:0;">
                You're receiving this because you signed up for Conductor. No further emails will be sent unless you opt in.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0;text-align:center;">
              <p style="color:#52525b;font-size:11px;margin:0;">Conductor &mdash; Your AI-powered business command center</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`,
    });
    logger.info({ to }, "Welcome email sent");
  } catch (err) {
    logger.warn({ to, err }, "Failed to send welcome email");
  }
}
