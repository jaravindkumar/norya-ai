'use client';

import { FormEvent, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    setMessage('');
    const { error } = await supabaseBrowser().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
    });
    if (error) {
      setStatus('error');
      const isEmailRateLimit = error.status === 429 || error.code === 'over_email_send_rate_limit';
      setMessage(
        isEmailRateLimit
          ? 'Too many sign-in links were requested. Please wait up to an hour and try again.'
          : 'We could not send the link. Please try again.',
      );
      return;
    }
    setStatus('sent');
    setMessage(`Check ${email} for your secure sign-in link.`);
  }

  return (
    <main className="authShell">
      <a className="brand" href="/">Norya<span>AI</span></a>
      <section className="authCard">
        <p className="eyebrow">Welcome to Norya</p>
        <h1 className="authTitle">Sign in without a password.</h1>
        <p className="authCopy">We’ll email you a secure link that signs you in and expires automatically.</p>
        <form onSubmit={handleSubmit} className="authForm">
          <label htmlFor="email">Work email</label>
          <input id="email" name="email" type="email" autoComplete="email" required value={email}
            onChange={(event) => setEmail(event.target.value)} placeholder="you@business.co.uk" />
          <button className="button buttonPrimary" disabled={status === 'sending'} type="submit">
            {status === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
          </button>
        </form>
        {message ? <p className={`formMessage ${status}`} role="status">{message}</p> : null}
      </section>
    </main>
  );
}
