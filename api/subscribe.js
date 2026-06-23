const { Resend } = require('resend');

const FRIENDLY_ERROR = "Something didn't go through. Please check your email and try again.";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function confirmationEmail(firstName) {
  const safeName = escapeHtml(firstName);
  const text = `Hi ${firstName},\n\nThanks — you're on the list.\n\nWe'll send the final review call date, workshop materials, and next steps here once confirmed.\n\nChiibitsu Labs\nMore human, by design.`;
  const html = `
    <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#2B2330;">
      <p style="font-size:13px;letter-spacing:0.08em;text-transform:uppercase;color:#B5A664;font-weight:600;margin:0 0 16px;">Chiibitsu Labs &middot; AI @ Work</p>
      <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Hi ${safeName},</p>
      <p style="font-size:16px;line-height:1.6;margin:0 0 16px;">Thanks — you're on the list.</p>
      <p style="font-size:16px;line-height:1.6;margin:0 0 24px;">We'll send the final review call date, workshop materials, and next steps here once confirmed.</p>
      <p style="font-size:14px;line-height:1.6;color:#4E2A84;font-weight:600;margin:0;">Chiibitsu Labs<br /><span style="font-weight:400;color:#2B2330;">More human, by design.</span></p>
    </div>
  `;
  return { text, html };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  const body = req.body || {};
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
  const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const roleOrDepartment = typeof body.roleOrDepartment === 'string' ? body.roleOrDepartment.trim() : '';
  const consentWorkshopFollowup = body.consentWorkshopFollowup === true;
  const consentFutureUpdates = body.consentFutureUpdates === true;

  if (!firstName) {
    return res.status(400).json({ ok: false, error: 'Please enter your first name.' });
  }
  if (!lastName) {
    return res.status(400).json({ ok: false, error: 'Please enter your last name.' });
  }
  if (!email || !EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ ok: false, error: 'Please enter a valid email address.' });
  }
  if (!consentWorkshopFollowup) {
    return res.status(400).json({ ok: false, error: 'Please check the box to receive the workshop follow-up.' });
  }

  const mergSegmentId = process.env.RESEND_MERG_SEGMENT_ID;
  const futureUpdatesSegmentId = process.env.RESEND_CHIIBITSU_AI_UPDATES_SEGMENT_ID;
  const wantsFutureUpdates = consentFutureUpdates && Boolean(futureUpdatesSegmentId);

  const resend = new Resend(process.env.RESEND_API_KEY);

  const segments = [{ id: mergSegmentId }];
  if (wantsFutureUpdates) segments.push({ id: futureUpdatesSegmentId });

  const createResult = await resend.contacts.create({
    email,
    firstName,
    lastName,
    segments,
  });

  if (createResult.error) {
    console.error('[subscribe] contacts.create failed, falling back to update + per-segment add', createResult.error);

    const updateResult = await resend.contacts.update({ email, firstName, lastName });
    if (updateResult.error) {
      console.error('[subscribe] contacts.update failed (non-fatal)', updateResult.error);
    }

    const mergAddResult = await resend.contacts.segments.add({ email, segmentId: mergSegmentId });
    if (mergAddResult.error) {
      console.error('[subscribe] failed to add contact to MERG segment', mergAddResult.error);
      return res.status(502).json({ ok: false, error: FRIENDLY_ERROR });
    }

    if (wantsFutureUpdates) {
      const futureAddResult = await resend.contacts.segments.add({ email, segmentId: futureUpdatesSegmentId });
      if (futureAddResult.error) {
        console.error('[subscribe] failed to add contact to future-updates segment (non-fatal)', futureAddResult.error);
      }
    }
  }

  const { text, html } = confirmationEmail(firstName);
  const emailResult = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: email,
    replyTo: 'labs@chiibitsu.com',
    subject: "You're on the AI @ Work follow-up list",
    text,
    html,
  });
  if (emailResult.error) {
    console.error('[subscribe] failed to send confirmation email', emailResult.error);
    return res.status(502).json({ ok: false, error: FRIENDLY_ERROR });
  }

  return res.status(200).json({ ok: true });
};
