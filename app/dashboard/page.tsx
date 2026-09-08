import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';

export default async function DashboardPage() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: account } = await supabase
    .from('accounts')
    .select('business_name, plan, status, minutes_included, minutes_used')
    .single();
  return (
    <main className="dashboardShell">
      <p className="eyebrow">Norya dashboard</p>
      <h1 className="dashboardTitle">{account?.business_name || 'Let’s set up your receptionist'}</h1>
      <p className="authCopy">Signed in as {user.email}</p>
      <a className="button buttonPrimary" href="/onboarding">Continue setup</a>
    </main>
  );
}
