'use client';

import { useEffect, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase-browser';

export default function AuthCallbackPage() {
  const [message, setMessage] = useState('Securing your session…');

  useEffect(() => {
    async function finishSignIn() {
      const next = new URLSearchParams(window.location.search).get('next');
      const safeNext = next?.startsWith('/') ? next : '/dashboard';
      const { data, error } = await supabaseBrowser().auth.getSession();

      if (!error && data.session) {
        window.location.replace(safeNext);
        return;
      }

      setMessage('This sign-in link is invalid or has expired.');
      window.setTimeout(() => window.location.replace('/login?error=invalid_link'), 1200);
    }

    void finishSignIn();
  }, []);

  return (
    <main className="authShell">
      <section className="authCard" aria-live="polite">
        <p className="eyebrow">Norya AI</p>
        <h1 className="authTitle">Signing you in</h1>
        <p className="authCopy">{message}</p>
      </section>
    </main>
  );
}
