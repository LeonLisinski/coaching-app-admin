export function buildEmailHtml({
  recipientName,
  subject,
  body,
}: {
  recipientName?: string | null
  subject: string
  body: string
}) {
  const greeting = recipientName ? `Dragi/a ${recipientName},` : 'Dragi/a treneru,'
  const bodyHtml = body
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n\n/g, '</p><p style="margin:0 0 16px 0;">')
    .replace(/\n/g, '<br>')

  return `<!DOCTYPE html>
<html lang="hr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,Ubuntu,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <a href="https://unitlift.com" style="text-decoration:none;">
                <div style="display:inline-block;background-color:#2563eb;border-radius:10px;padding:12px 24px;">
                  <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:-0.3px;">UnitLift</span>
                </div>
              </a>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:12px;padding:36px 40px;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              <p style="margin:0 0 20px 0;color:#111827;font-size:15px;font-weight:500;">${greeting}</p>
              <p style="margin:0 0 16px 0;color:#374151;font-size:15px;line-height:1.7;">${bodyHtml}</p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0 0;text-align:center;">
              <p style="margin:0 0 6px 0;color:#9ca3af;font-size:12px;">
                Problemi? Kontaktiraj nas na
                <a href="mailto:leon@unitlift.com" style="color:#2563eb;text-decoration:none;">leon@unitlift.com</a>
              </p>
              <p style="margin:0;color:#9ca3af;font-size:12px;">
                © 2026 UnitLift ·
                <a href="https://unitlift.com" style="color:#9ca3af;text-decoration:underline;">unitlift.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
