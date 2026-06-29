// Tally -> Telegram booking alert.

const TELEGRAM_API_BASE = 'https://api.telegram.org';

function getFieldValue(fields, label) {
  const field = fields.find((item) =>
    String(item?.label || '').toLowerCase().includes(label.toLowerCase())
  );

  if (!field) return '';
  if (Array.isArray(field.value)) {
    return field.value.map((item) => item?.url || item?.name || item).join(', ');
  }

  return field.value ?? '';
}

function formatLine(label, value) {
  return value ? `${label}: ${value}` : null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.error('tally-webhook missing Telegram environment variables');
    return res.status(500).json({
      ok: false,
      error: 'Missing Telegram environment variables',
    });
  }

  try {
    const data = req.body?.data || {};
    const fields = Array.isArray(data.fields) ? data.fields : [];

    const formName = data.formName || 'AI @ Work booking';
    const name = getFieldValue(fields, 'Your name');
    const email = getFieldValue(fields, 'Your email');
    const others = getFieldValue(fields, 'How many others');
    const code = getFieldValue(fields, 'Referral code');
    const total = getFieldValue(fields, 'total');
    const ref = getFieldValue(fields, 'reference');
    const proof = getFieldValue(fields, 'proof');

    const lines = [
      `New booking - ${formName}`,
      '',
      formatLine('Name', name),
      formatLine('Email', email),
      formatLine('Others joining', others),
      formatLine('Code', code),
      formatLine('Total', total ? `PHP ${total}` : ''),
      formatLine('Ref #', ref),
      formatLine('Proof', proof),
    ].filter(Boolean);

    const telegramResponse = await fetch(
      `${TELEGRAM_API_BASE}/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: lines.join('\n'),
          disable_web_page_preview: true,
        }),
      }
    );

    if (!telegramResponse.ok) {
      const telegramError = await telegramResponse.text();
      console.error('tally-webhook telegram error:', telegramError);
      return res.status(502).json({
        ok: false,
        error: 'Telegram send failed',
      });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('tally-webhook error:', error);
    return res.status(500).json({ ok: false, error: 'Webhook failed' });
  }
};
