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
  await sgMail.send(msg)
}
