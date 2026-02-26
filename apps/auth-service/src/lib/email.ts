import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { logger } from './logger';

// ─── Lazy-initialized Email Transporter ────────────────────────────
// The transporter is created lazily (on first use) so that dotenv.config()
// has already loaded the SMTP env vars by the time we create it.

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(process.env.SMTP_PORT) || 587;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    logger.info(`Creating SMTP transporter: host=${host}, port=${port}, user=${user ? user.replace(/(.{2}).*(@.*)/, '$1***$2') : 'NOT SET'}`);

    if (!user || !pass) {
      logger.error('SMTP_USER or SMTP_PASS is not set! Password reset emails will fail.');
    }

    transporter = nodemailer.createTransport({
      host,
      port,
      secure: false,
      auth: { user, pass },
    });

    // Verify connection
    transporter.verify()
      .then(() => logger.info('SMTP transporter verified successfully'))
      .catch((err) => logger.error('SMTP transporter verification failed:', err));
  }
  return transporter;
}

// ─── Send Password Reset Email ─────────────────────────────────────

export async function sendPasswordResetEmail(
  to: string,
  resetToken: string,
  firstName: string
): Promise<void> {
  const frontendUrl = process.env.CORS_ORIGIN || 'http://localhost:3000';
  const resetLink = `${frontendUrl}/reset-password?token=${resetToken}`;
  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || 'noreply@flexwork.com';

  const mailOptions = {
    from: `"FlexWork" <${fromAddress}>`,
    to,
    subject: 'Reset Your Password – FlexWork',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
          <tr>
            <td align="center">
              <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.07);">
                <!-- Header -->
                <tr>
                  <td style="background:linear-gradient(135deg,#6366f1,#8b5cf6);padding:32px 32px 24px;text-align:center;">
                    <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">FlexWork</h1>
                  </td>
                </tr>
                <!-- Body -->
                <tr>
                  <td style="padding:32px;">
                    <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">Password Reset Request</h2>
                    <p style="margin:0 0 24px;color:#71717a;font-size:14px;line-height:1.6;">
                      Hi <strong style="color:#18181b;">${firstName}</strong>, we received a request to reset the password for your FlexWork account.
                    </p>
                    <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
                      <tr>
                        <td align="center" bgcolor="#6366f1" style="border-radius:8px;">
                          <a href="${resetLink}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-weight:600;font-size:15px;letter-spacing:0.3px;">
                            Reset Password
                          </a>
                        </td>
                      </tr>
                    </table>
                    <p style="margin:24px 0 0;color:#a1a1aa;font-size:12px;line-height:1.6;">
                      This link will expire in <strong>1 hour</strong>. If you didn't request a password reset, you can safely ignore this email.
                    </p>
                    <hr style="margin:24px 0;border:none;border-top:1px solid #e4e4e7;">
                    <p style="margin:0;color:#a1a1aa;font-size:11px;line-height:1.5;">
                      If the button doesn't work, copy and paste this link into your browser:<br>
                      <a href="${resetLink}" style="color:#6366f1;word-break:break-all;">${resetLink}</a>
                    </p>
                  </td>
                </tr>
                <!-- Footer -->
                <tr>
                  <td style="padding:16px 32px;background-color:#fafafa;text-align:center;">
                    <p style="margin:0;color:#a1a1aa;font-size:11px;">© ${new Date().getFullYear()} FlexWork. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `,
  };

  try {
    const transport = getTransporter();
    const info = await transport.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${to.replace(/(.{2}).*(@.*)/, '$1***$2')}, messageId: ${info.messageId}`);
  } catch (error) {
    logger.error('Failed to send password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
}
