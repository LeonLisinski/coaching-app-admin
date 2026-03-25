export function buildEmailHtml({
  recipientName,
  subject,
  body,
}: {
  recipientName?: string | null
  subject: string
  body: string
}) {
  const greeting = recipientName ? `Bok ${recipientName},` : 'Bok,'
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
                <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                  <tr>
                    <td style="background-color:#2563eb;border-radius:12px;padding:14px 28px;text-align:center;">
                      <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">UnitLift</span>
                    </td>
                  </tr>
                </table>
              </a>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              <!-- Blue top accent bar -->
              <div style="background:linear-gradient(90deg,#1d4ed8,#3b82f6);height:4px;"></div>
              <div style="padding:32px 36px 36px 36px;">
                <p style="margin:0 0 16px 0;color:#111827;font-size:15px;font-weight:600;">${greeting}</p>
                <p style="margin:0 0 0 0;color:#374151;font-size:15px;line-height:1.75;">${bodyHtml}</p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0 0;text-align:center;">
              <p style="margin:0 0 6px 0;color:#9ca3af;font-size:12px;">
                <a href="https://unitlift.com" style="color:#3b82f6;text-decoration:none;font-weight:500;">unitlift.com</a>
                &nbsp;·&nbsp;
                <a href="https://app.unitlift.com" style="color:#3b82f6;text-decoration:none;font-weight:500;">app.unitlift.com</a>
              </p>
              <p style="margin:0;color:#9ca3af;font-size:12px;">© 2026 UnitLift</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
