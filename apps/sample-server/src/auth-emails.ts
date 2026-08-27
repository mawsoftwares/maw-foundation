import { DeliveryStatus, type Logger } from '@mawsoftwares/sdk';
import type { EmailService } from '@mawsoftwares/communication';

export interface AuthEmailSenderOptions {
  readonly emailService: EmailService;
  readonly tenantId: string;
  readonly webOrigin: string;
  readonly from: string;
  readonly logger: Logger;
}

function stripTrailingSlash(origin: string): string {
  return origin.endsWith('/') ? origin.slice(0, -1) : origin;
}

function authMessageHtml(title: string, intro: string, actionLabel: string, actionUrl: string, token: string): string {
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px;background:#f5f7fa;font-family:system-ui,sans-serif;color:#1a1a2e;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:8px;padding:24px;">
    <h1 style="margin:0 0 12px;font-size:20px;">${title}</h1>
    <p style="margin:0 0 16px;line-height:1.5;">${intro}</p>
    <p style="margin:0 0 24px;">
      <a href="${actionUrl}" style="display:inline-block;background:#1565c0;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:6px;">${actionLabel}</a>
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#5c6b7a;">If the button does not work, copy this code into the app:</p>
    <p style="margin:0;font-family:ui-monospace,monospace;font-size:13px;word-break:break-all;">${token}</p>
  </div>
</body>
</html>`;
}

export function createAuthEmailSender(options: AuthEmailSenderOptions) {
  const webOrigin = stripTrailingSlash(options.webOrigin);

  async function send(kind: 'verify' | 'reset', email: string, token: string): Promise<void> {
    const actionUrl = kind === 'verify'
      ? `${webOrigin}/?verifyToken=${encodeURIComponent(token)}`
      : `${webOrigin}/?resetToken=${encodeURIComponent(token)}`;
    const subject = kind === 'verify' ? 'Confirm your email address' : 'Reset your password';
    const title = kind === 'verify' ? 'Confirm your email' : 'Reset your password';
    const intro = kind === 'verify'
      ? 'Thanks for creating an account. Confirm your email to sign in.'
      : 'We received a request to reset your password. Use the button below to choose a new one.';
    const actionLabel = kind === 'verify' ? 'Confirm email' : 'Reset password';
    const text = kind === 'verify'
      ? `Confirm your email by opening ${actionUrl}\n\nOr paste this code in the app: ${token}`
      : `Reset your password by opening ${actionUrl}\n\nOr paste this code in the app: ${token}`;

    options.logger.info('Sending auth email', { kind, to: email });
    const result = await options.emailService.send({
      tenantId: options.tenantId,
      email: {
        to: email,
        from: options.from,
        subject,
        body: text,
        html: authMessageHtml(title, intro, actionLabel, actionUrl, token),
      },
      metadata: { source: 'auth' },
    });
    options.logger.info('Auth email result', {
      kind,
      to: email,
      status: result.status,
      id: result.id,
      error: result.error,
    });
    if (result.status === DeliveryStatus.FAILED) {
      throw new Error(result.error ?? `Failed to send ${kind} email`);
    }
  }

  return {
    sendVerificationEmail: (email: string, token: string) => send('verify', email, token),
    sendResetEmail: (email: string, token: string) => send('reset', email, token),
  };
}
