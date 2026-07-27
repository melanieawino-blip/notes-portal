// Sends the admin an email when a lecturer signs up. Uses Resend
// (https://resend.com). If RESEND_API_KEY isn't set yet, this just logs
// and does nothing — it never throws, so signup always succeeds even if
// email isn't configured.
async function notifyAdminOfLecturerSignup({ name, email, staff_number, status }) {
  const apiKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!apiKey || !adminEmail) {
    console.log('Email notification skipped (RESEND_API_KEY or ADMIN_EMAIL not set)');
    return;
  }
  const subject = status === 'approved'
    ? `Lecturer auto-approved: ${name}`
    : `New lecturer pending approval: ${name}`;
  const body = `
    <p><strong>${name}</strong> (${email}) signed up as a lecturer.</p>
    <p>Staff number: ${staff_number || 'n/a'}</p>
    <p>Status: ${status}</p>
    ${status === 'pending' ? '<p>Review and approve on your admin dashboard.</p>' : '<p>This staff number was on your auto-approve list, so no action is needed.</p>'}
  `;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || 'notifications@resend.dev',
        to: adminEmail,
        subject,
        html: body
      })
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('Resend API error:', res.status, text);
    }
  } catch (err) {
    // Never let email failure break signup
    console.error('Failed to send admin notification email:', err.message);
  }
}
module.exports = { notifyAdminOfLecturerSignup };
