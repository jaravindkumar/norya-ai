import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase-server';
import Wizard from './wizard';

export default async function OnboardingPage() {
  const supabase = supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/onboarding');
  return <Wizard email={user.email ?? ''} />;
}
