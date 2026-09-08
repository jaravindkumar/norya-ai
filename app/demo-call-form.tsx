'use client';

import { FormEvent, useState } from 'react';

export function DemoCallForm() {
  const [step, setStep] = useState<'details' | 'code' | 'calling'>('details');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('+44');
  const [code, setCode] = useState('');
  const [verificationId, setVerificationId] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  async function requestCode(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    const response = await fetch('/api/demo/request', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, phone }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) { setMessage(data.error); return; }
    setVerificationId(data.verificationId); setStep('code');
    setMessage(`We emailed a six-digit code to ${email}. It expires in 10 minutes.`);
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault(); setBusy(true); setMessage('');
    const response = await fetch('/api/demo/verify', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ verificationId, email, code }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) { setMessage(data.error); return; }
    setStep('calling'); setMessage(`Calling ${phone} now. It normally arrives within four minutes.`);
  }

  return (
    <section className="demoCard" id="demo" aria-labelledby="demo-title">
      <p className="eyebrow">Hear Norya for yourself</p>
      <h2 id="demo-title">Get a demo call.</h2>
      {step === 'details' ? <form className="demoForm" onSubmit={requestCode}>
        <label>Mobile number<input value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" placeholder="+44 7700 900000" required /></label>
        <label>Email<input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@example.com" required /></label>
        <button className="button buttonPrimary" disabled={busy}>{busy ? 'Sending…' : 'Email my verification code'}</button>
      </form> : null}
      {step === 'code' ? <form className="demoForm" onSubmit={verifyCode}>
        <label>Six-digit code<input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" required /></label>
        <button className="button buttonPrimary" disabled={busy || code.length !== 6}>{busy ? 'Checking…' : 'Verify and call me'}</button>
      </form> : null}
      {message ? <p className="formMessage" role="status">{message}</p> : null}
    </section>
  );
}
