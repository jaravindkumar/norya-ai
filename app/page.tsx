import { DemoCallForm } from './demo-call-form';

export default function HomePage() {
  return (
    <main className="shell">
      <nav className="nav" aria-label="Primary navigation">
        <a className="brand" href="/">Norya<span>AI</span></a>
        <a className="button buttonQuiet" href="/login">Sign in</a>
      </nav>
      <section className="hero">
        <p className="eyebrow">Your calls, handled beautifully</p>
        <h1>An AI receptionist that never misses the moment.</h1>
        <p className="lede">Norya answers every call, understands what customers need, and books the next step—day or night.</p>
        <div className="actions">
          <a className="button buttonPrimary" href="/login">Start your free trial</a>
          <a className="button buttonQuiet" href="#demo">Get a demo call</a>
        </div>
      </section>
      <section className="proof" id="how-it-works" aria-label="Product benefits">
        <article><strong>24/7</strong><span>Every call answered</span></article>
        <article><strong>Real-time</strong><span>Availability checked</span></article>
        <article><strong>One view</strong><span>Calls and bookings</span></article>
      </section>
      <DemoCallForm />
    </main>
  );
}
