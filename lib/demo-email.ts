import 'server-only';

export async function sendDemoCode(email: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.DEMO_FROM_EMAIL;
  if (!apiKey || apiKey === 'placeholder' || !from) throw new Error('Demo email delivery is not configured');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to: [email], subject: 'Your Norya demo code', html: `<p>Your Norya verification code is <strong>${code}</strong>.</p><p>It expires in 10 minutes and can only be used once.</p>` }),
  });
  if (!response.ok) throw new Error(`Demo email delivery failed (${response.status})`);
}
