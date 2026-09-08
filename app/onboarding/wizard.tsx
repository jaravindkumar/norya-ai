'use client';

import { useMemo, useState } from 'react';
import { forwardingCode, onboardingCanContinue, type Carrier, type OnboardingProfile } from '@/lib/onboarding';

const steps = ['Business', 'Services', 'Assistant', 'Calendar', 'Phone', 'Go live'];
const voices = [
  { id: 'rachel', name: 'Rachel', note: 'Warm and clear' }, { id: 'charlotte', name: 'Charlotte', note: 'Friendly and bright' },
  { id: 'george', name: 'George', note: 'Calm and assured' }, { id: 'daniel', name: 'Daniel', note: 'Polished and natural' },
];
const carriers: Carrier[] = ['BT', 'EE', 'Vodafone', 'Three', 'Virgin', 'Sky'];

type Place = {
  displayName?: { text?: string }; formattedAddress?: string; nationalPhoneNumber?: string;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
};

const initial: OnboardingProfile = {
  businessName: '', address: '', existingPhone: '', industry: '', services: '', openingHours: '',
  agentName: 'Nora', greeting: 'Hello, thanks for calling. How can I help you today?', voiceId: 'rachel',
  language: 'en-GB', phoneMode: 'dedicated', carrier: 'BT',
};

export default function Wizard({ email }: { email: string }) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState(initial);
  const [query, setQuery] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const canContinue = useMemo(() => onboardingCanContinue(step, profile), [step, profile]);
  const update = <K extends keyof OnboardingProfile>(key: K, value: OnboardingProfile[K]) => setProfile((p) => ({ ...p, [key]: value }));

  async function search() {
    setBusy(true); setStatus('Searching…');
    const response = await fetch('/api/onboarding/find-business', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ query }) });
    const result = await response.json();
    const found = (result.places ?? []) as Place[];
    setPlaces(found);
    setStatus(found.length ? 'Select your business, then check every detail.' : 'No match found. Add your details manually below.');
    setBusy(false);
  }

  function choose(place: Place) {
    setProfile((p) => ({ ...p, businessName: place.displayName?.text ?? '', address: place.formattedAddress ?? '', existingPhone: place.nationalPhoneNumber ?? '', openingHours: place.regularOpeningHours?.weekdayDescriptions?.join('\n') ?? '' }));
    setPlaces([]); setStatus('Is this you? Edit anything that is not quite right.');
  }

  async function activate() {
    setBusy(true); setStatus('Saving your setup…');
    const saved = await fetch('/api/onboarding/profile', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(profile) });
    const savedResult = await saved.json();
    if (!saved.ok) { setStatus(savedResult.error ?? 'Could not save your setup.'); setBusy(false); return; }
    const provisioned = await fetch('/api/provision', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(profile) });
    const result = await provisioned.json();
    if (result.code === 'TWILIO_SETUP_PENDING') setStatus('Your profile is saved. Phone activation and the live test call will unlock when Twilio is connected.');
    else if (!provisioned.ok) setStatus(`Your profile is saved. Activation needs attention: ${result.error ?? 'provider unavailable'}`);
    else setStatus('You are live. Your Norya receptionist is ready.');
    setBusy(false);
  }

  return (
    <main className="wizardShell">
      <header className="wizardHeader"><div><p className="eyebrow">Norya setup</p><h1>Meet your new receptionist.</h1></div><span>{email}</span></header>
      <ol className="stepper" aria-label="Onboarding progress">{steps.map((name, index) => <li className={step === index + 1 ? 'active' : step > index + 1 ? 'done' : ''} key={name}><b>{index + 1}</b><span>{name}</span></li>)}</ol>
      <section className="wizardCard">
        {step === 1 && <>
          <p className="eyebrow">Step 1 of 6</p><h2>Find your business</h2><p className="authCopy">Start with your Google listing, or type everything yourself.</p>
          <div className="searchRow"><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search your business name"/><button className="button buttonQuiet" disabled={busy || query.trim().length < 2} onClick={search}>Search</button></div>
          {places.length > 0 && <div className="placeList">{places.map((place, i) => <button key={`${place.formattedAddress}-${i}`} onClick={() => choose(place)}><strong>{place.displayName?.text}</strong><span>{place.formattedAddress}</span></button>)}</div>}
          <div className="fieldGrid"><Field label="Business name" value={profile.businessName} onChange={(v) => update('businessName', v)}/><Field label="Address" value={profile.address} onChange={(v) => update('address', v)}/><Field label="Business phone (optional)" value={profile.existingPhone} onChange={(v) => update('existingPhone', v)}/></div>
        </>}
        {step === 2 && <><p className="eyebrow">Step 2 of 6</p><h2>Services and hours</h2><div className="fieldGrid"><Field label="Business type" value={profile.industry} onChange={(v) => update('industry', v)} placeholder="Hair salon"/><TextArea label="Services and prices" value={profile.services} onChange={(v) => update('services', v)} placeholder="Cut — £30&#10;Colour — £75"/><TextArea label="Opening hours" value={profile.openingHours} onChange={(v) => update('openingHours', v)} placeholder="Monday–Friday, 09:00–17:00"/></div></>}
        {step === 3 && <><p className="eyebrow">Step 3 of 6</p><h2>Shape the personality</h2><div className="fieldGrid"><Field label="Assistant name" value={profile.agentName} onChange={(v) => update('agentName', v)}/><TextArea label="Greeting" value={profile.greeting} onChange={(v) => update('greeting', v)}/><label>Language<select value={profile.language} onChange={(e) => update('language', e.target.value)}><option value="en-GB">English (UK)</option><option value="en-US">English (US)</option></select></label></div><p className="sectionLabel">Voice</p><div className="choiceGrid">{voices.map((voice) => <button className={profile.voiceId === voice.id ? 'choice selected' : 'choice'} key={voice.id} onClick={() => update('voiceId', voice.id)}><strong>{voice.name}</strong><span>{voice.note}</span><small>Preview available when ElevenLabs is connected</small></button>)}</div></>}
        {step === 4 && <><p className="eyebrow">Step 4 of 6</p><h2>Connect a calendar</h2><p className="authCopy">Let Norya book appointments while you work. This is optional and can be connected later.</p><div className="integrationCard"><div><strong>Google Calendar</strong><span>OAuth connection coming in the calendar build.</span></div><button className="button buttonQuiet" disabled>Connect</button></div></>}
        {step === 5 && <><p className="eyebrow">Step 5 of 6</p><h2>Choose how calls arrive</h2><div className="choiceGrid"><button className={profile.phoneMode === 'dedicated' ? 'choice selected' : 'choice'} onClick={() => update('phoneMode', 'dedicated')}><strong>Get a dedicated number</strong><span>A new number just for your Norya receptionist.</span></button><button className={profile.phoneMode === 'forward' ? 'choice selected' : 'choice'} onClick={() => update('phoneMode', 'forward')}><strong>Forward my existing number</strong><span>Keep the number your customers already know.</span></button></div>{profile.phoneMode === 'forward' && <div className="fieldGrid forwardBox"><Field label="Existing phone number" value={profile.existingPhone} onChange={(v) => update('existingPhone', v)}/><label>Carrier<select value={profile.carrier} onChange={(e) => update('carrier', e.target.value as Carrier)}>{carriers.map((carrier) => <option key={carrier}>{carrier}</option>)}</select></label><div className="codeBox"><span>Dial this from your existing line after activation</span><code>{forwardingCode(profile.carrier, '')}</code><small>The placeholder will become your assigned Norya number.</small></div></div>}</>}
        {step === 6 && <><p className="eyebrow">Step 6 of 6</p><h2>Ready for a first call</h2><div className="review"><div><span>Business</span><strong>{profile.businessName}</strong></div><div><span>Assistant</span><strong>{profile.agentName}</strong></div><div><span>Calls</span><strong>{profile.phoneMode === 'dedicated' ? 'Dedicated number' : `Forwarded from ${profile.existingPhone}`}</strong></div><div><span>Calendar</span><strong>Skipped for now</strong></div></div><p className="authCopy">Save now. The call test and go-live switch will unlock as soon as the phone provider is connected.</p><button className="button buttonPrimary" disabled={busy} onClick={activate}>{busy ? 'Saving…' : 'Save setup & prepare activation'}</button></>}
        {status && <p className="wizardStatus" role="status">{status}</p>}
        <footer className="wizardActions">{step > 1 && <button className="button buttonQuiet" onClick={() => { setStep((s) => s - 1); setStatus(''); }}>Back</button>}<span/>{step < 6 && <button className="button buttonPrimary" disabled={!canContinue} onClick={() => { setStep((s) => s + 1); setStatus(''); }}>{step === 4 ? 'Skip for now' : 'Continue'}</button>}</footer>
      </section>
    </main>
  );
}

function Field({ label, value, onChange, placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) { return <label>{label}<input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}/></label>; }
function TextArea({ label, value, onChange, placeholder = '' }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string }) { return <label>{label}<textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}/></label>; }
