export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

  try {
    const { data } = req.body;
    const fields = data?.fields || [];

    const findField = (test) =>
      fields.find((f) => typeof f.label === 'string' && test(f.label.toLowerCase()));

    const nameField =
      findField((l) => l.includes('full name')) ||
      findField((l) => l.includes('name') && !l.includes('company'));
    const companyField = findField((l) => l.includes('company'));
    const referralField = findField((l) => l.includes('referred'));

    const name = nameField?.value || 'Unknown respondent';
    const company = companyField?.value ? ` (${companyField.value})` : '';
    const referral = referralField?.value ? `\n🔗 Referred by: ${referralField.value}` : '';
    const formName = data?.formName || 'Tally form';
    const previewUrl = data?.submissionPreviewUrl;

    const lines = [
      `🎉 *New submission* ~ ${formName}`,
      `👤 ${name}${company}${referral}`,
      previewUrl ? `📄 [View full response](${previewUrl})` : null,
    ].filter(Boolean);

    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: lines.join('\n'),
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('tally-webhook error:', e);
    return res.status(200).json({ ok: false, error: String(e) });
  }
}
