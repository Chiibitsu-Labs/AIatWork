// Tally → Telegram booking alert
// Drop this in your AIatWork Vercel repo as:  api/tally-webhook.js
// It fires you a Telegram message every time someone completes the booking form.

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method not allowed');

  const TOKEN   = process.env.TELEGRAM_BOT_TOKEN;   // set in Vercel env vars
  const CHAT_ID = process.env.TELEGRAM_CHAT_ID;     // set in Vercel env vars

  try {
    const fields = req.body?.data?.fields || [];

    // grab a field's value by matching part of its label (case-insensitive)
    const get = (label) => {
      const f = fields.find(x => (x.label || '').toLowerCase().includes(label.toLowerCase()));
      if (!f) return '';
      // file uploads come back as an array of { url }
      if (Array.isArray(f.value)) return f.value.map(v => v?.url || v).join(', ');
      return f.value ?? '';
    };

    const formName = req.body?.data?.formName || 'AI @ Work booking';
    const name   = get('Your name');
    const email  = get('Your email');
    const others = get('How many others');
    const code   = get('Referral code');
    const total  = get('total');          // the calculated total field
    const ref    = get('reference');      // payment reference number
    const proof  = get('proof');          // receipt upload url(s)

    const lines = [
      `🎉 *New booking* — ${formName}`,
      ``,
      `👤 ${name}`,
      `✉️ ${email}`,
      others ? `➕ Others joining: ${others}` : null,
      code   ? `🏷️ Code: ${code}`            : null,
      total  ? `💰 Total: ₱${total}`          : null,
      ref    ? `🧾 Ref #: ${ref}`             : null,
      proof  ? `📎 Proof: ${proof}`           : null,
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
    // still return 200 so Tally doesn't keep retrying
    return res.status(200).json({ ok: false, error: String(e) });
  }
}
