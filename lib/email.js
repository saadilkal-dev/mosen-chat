import sgMail from '@sendgrid/mail'

let apiKeySet = false

function ensureSendGrid() {
  const key = process.env.SENDGRID_API_KEY
  if (!key) {
    throw new Error('SENDGRID_API_KEY is not configured')
  }
  if (!apiKeySet) {
    sgMail.setApiKey(key)
    apiKeySet = true
  }
}

/**
 * Default "from" — must be a verified sender/domain in SendGrid.
 * Override per call or set SENDGRID_FROM_EMAIL in .env.local
 */
export function getDefaultFrom() {
  return process.env.SENDGRID_FROM_EMAIL || 'noreply@example.com'
}

/**
 * Low-level send. Used by invite/outreach/closed-loop routes.
 * Returns a small payload compatible with logging (SendGrid does not mirror Resend's id shape).
 */
export async function sendEmail({ to, subject, html, from, text }) {
  ensureSendGrid()
  const msg = {
    to,
    from: from || getDefaultFrom(),
    subject,
    html,
  }
  if (text) msg.text = text
  const [response] = await sgMail.send(msg)
  const messageId = response?.headers?.['x-message-id'] || ''
  return { id: messageId }
}

export function buildInviteEmail({ employeeName, initiativeTitle, inviteUrl }) {
  return {
    subject: `You've been invited to share your perspective on ${initiativeTitle}`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#FAFAF8;font-family:'DM Sans',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;border:1px solid #EBEBEA;padding:40px;">
        <tr><td>
          <div style="margin-bottom:32px;">
            <span style="font-size:22px;font-weight:700;color:#1A1A18;letter-spacing:-0.5px;">mosen</span>
          </div>
          <p style="font-size:16px;color:#1A1A18;margin:0 0 16px;">Hi ${employeeName},</p>
          <p style="font-size:15px;color:#444442;line-height:1.6;margin:0 0 16px;">
            Your team is going through <strong>${initiativeTitle}</strong>. Mosen is here as a confidential thinking partner — not connected to HR or management.
          </p>
          <p style="font-size:15px;color:#444442;line-height:1.6;margin:0 0 24px;">
            Anything you share stays with you unless you actively choose to surface it. No one sees your words without your explicit, informed consent.
          </p>
          <a href="${inviteUrl}" style="display:inline-block;background:#1D9E75;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:10px;">
            Open Mosen
          </a>
          <p style="font-size:13px;color:#999999;margin:32px 0 0;line-height:1.5;">
            This link is personal to you. If you didn't expect this email, you can safely ignore it.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}

export function buildOutreachEmail({ employeeName, message, initiativeTitle, chatUrl }) {
  return {
    subject: `A message about ${initiativeTitle}`,
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#FAFAF8;font-family:'DM Sans',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;border:1px solid #EBEBEA;padding:40px;">
        <tr><td>
          <div style="margin-bottom:32px;">
            <span style="font-size:22px;font-weight:700;color:#1A1A18;letter-spacing:-0.5px;">mosen</span>
          </div>
          <p style="font-size:16px;color:#1A1A18;margin:0 0 16px;">Hi ${employeeName},</p>
          <div style="background:#F0FAF6;border-left:3px solid #1D9E75;border-radius:4px;padding:16px 20px;margin:0 0 24px;">
            <p style="font-size:15px;color:#1A1A18;line-height:1.6;margin:0;">${message}</p>
          </div>
          <a href="${chatUrl}" style="display:inline-block;background:#1D9E75;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;padding:14px 28px;border-radius:10px;">
            Reply to Mosen
          </a>
          <p style="font-size:13px;color:#999999;margin:32px 0 0;line-height:1.5;">
            Your conversation with Mosen remains confidential. Nothing is shared without your consent.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}

export function buildClosedLoopEmail({ employeeName, closedLoopMessage, changeDescription }) {
  return {
    subject: 'Something changed because of what you shared',
    html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#FAFAF8;font-family:'DM Sans',system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;border:1px solid #EBEBEA;padding:40px;">
        <tr><td>
          <div style="margin-bottom:32px;">
            <span style="font-size:22px;font-weight:700;color:#1A1A18;letter-spacing:-0.5px;">mosen</span>
          </div>
          <p style="font-size:16px;color:#1A1A18;margin:0 0 16px;">Hi ${employeeName},</p>
          <p style="font-size:15px;color:#444442;line-height:1.6;margin:0 0 20px;">
            Something you shared made a difference.
          </p>
          <div style="background:#FFFBF0;border-left:3px solid #D4A017;border-radius:4px;padding:16px 20px;margin:0 0 20px;">
            <p style="font-size:13px;font-weight:600;color:#8B6914;text-transform:uppercase;letter-spacing:0.5px;margin:0 0 8px;">What changed</p>
            <p style="font-size:15px;color:#1A1A18;line-height:1.6;margin:0;">${changeDescription}</p>
          </div>
          <p style="font-size:15px;color:#444442;line-height:1.6;margin:0 0 0;">
            ${closedLoopMessage}
          </p>
          <p style="font-size:13px;color:#999999;margin:32px 0 0;line-height:1.5;">
            Thank you for being honest. That takes courage, and it matters.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`,
  }
}
