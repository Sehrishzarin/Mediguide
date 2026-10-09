// Public landing page. Only signed-out web visitors see it: RootRoute sends signed-in
// users to their dashboard and the native app straight to sign-in.
import { MessageCircle, CalendarCheck, Siren, Building2, ArrowRight, ShieldCheck, Mic, Check } from 'lucide-react';
import { Button, Logo } from '../components/ui';
import Nura from '../components/nura/Nura';
import styles from './Home.module.css';

const FEATURES = [
  {
    icon: MessageCircle,
    title: 'Chat with Nura',
    text: 'Describe how you feel by typing or speaking. Nura explains how urgent it sounds and which specialist fits, using your medical profile.'
  },
  {
    icon: CalendarCheck,
    title: 'Book verified doctors',
    text: 'Choose a session at a facility our team has verified, and confirm it in a few taps. No phone calls, no queues.'
  },
  {
    icon: Siren,
    title: 'Emergency help',
    text: 'One tap shows the nearest hospitals, your emergency contact and the medical details responders need.'
  }
];

const STEPS = [
  { title: 'Tell Nura how you feel', text: 'Type or speak your symptoms in your own words.' },
  { title: 'Get clear guidance', text: 'See how urgent it is and what kind of care you need.' },
  { title: 'Book the right doctor', text: 'Pick an available session nearby and confirm instantly.' }
];

const ORG_POINTS = ['List your hospital, clinic or pharmacy', 'Add doctors and they become bookable', 'Verified listings build patient trust'];

const YEAR = new Date().getFullYear();

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.navWrap}>
        <nav className={styles.nav} aria-label="Main">
          <Logo size={32} to="/" />
          <div className={styles.navActions}>
            <Button variant="ghost" size="sm" to="/login" className={styles.navBtn}>Sign in</Button>
            <Button size="sm" to="/signup" className={styles.navBtn}>Get started</Button>
          </div>
        </nav>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="hero-h">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Your health assistant</p>
            <h1 id="hero-h" className={styles.title}>Know what to do next when you feel unwell.</h1>
            <p className={styles.lead}>
              MediGuide pairs you with Nura, a friendly health assistant that helps you understand your symptoms,
              then finds verified care nearby and books it for you.
            </p>
            <div className={styles.ctas}>
              <Button size="lg" to="/signup" iconRight={ArrowRight}>Get started free</Button>
              <Button size="lg" variant="secondary" to="/login">Sign in</Button>
            </div>
            <p className={styles.trust}>
              <ShieldCheck size={16} aria-hidden="true" />
              Your medical profile stays private and in your control.
            </p>
          </div>

          <div className={styles.heroVisual} aria-hidden="true">
            <div className={styles.nuraPanel}>
              <Nura size={140} mood="happy" />
              <div className={styles.bubbleUser}>I&apos;ve had a fever and sore throat since yesterday.</div>
              <div className={styles.bubbleNura}>
                <span className={styles.bubbleName}>Nura</span>
                That sounds like a common viral infection. Rest and drink fluids. A general physician can check it if it lasts more than 3 days.
                <span className={styles.bubbleTags}>
                  <span className={styles.tagLow}>Low urgency</span>
                  <span className={styles.tagSpec}>General physician</span>
                </span>
              </div>
              <div className={styles.micHint}><Mic size={14} /> Speak or type</div>
            </div>
          </div>
        </section>

        <section className={styles.section} aria-labelledby="features-h">
          <h2 id="features-h" className={styles.h2}>Everything you need, from first symptom to booked visit</h2>
          <div className={styles.features}>
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <article key={title} className={styles.feature}>
                <span className={styles.featureIcon}><Icon size={20} aria-hidden="true" /></span>
                <h3 className={styles.h3}>{title}</h3>
                <p className={styles.text}>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section} aria-labelledby="how-h">
          <h2 id="how-h" className={styles.h2}>How it works</h2>
          <ol className={styles.steps}>
            {STEPS.map((s, i) => (
              <li key={s.title} className={styles.step}>
                <span className={styles.stepNum} aria-hidden="true">{i + 1}</span>
                <div>
                  <h3 className={styles.h3}>{s.title}</h3>
                  <p className={styles.text}>{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section} aria-labelledby="org-h">
          <div className={styles.orgBand}>
            <div className={styles.orgCopy}>
              <span className={styles.orgIcon}><Building2 size={20} aria-hidden="true" /></span>
              <h2 id="org-h" className={styles.orgTitle}>For hospitals and clinics</h2>
              <p className={styles.text}>
                Reach patients who need your services. Sign up and choose &ldquo;Healthcare organization&rdquo; to get started.
              </p>
              <ul className={styles.orgPoints}>
                {ORG_POINTS.map((p) => (
                  <li key={p}><Check size={16} aria-hidden="true" />{p}</li>
                ))}
              </ul>
            </div>
            <Button size="lg" to="/signup" iconRight={ArrowRight} className={styles.orgCta}>Register your facility</Button>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Logo size={28} />
          <p className={styles.disclaimer}>
            MediGuide and Nura provide general health guidance and are not a substitute for professional medical care,
            diagnosis or treatment. In an emergency, call <a href="tel:1122" className={styles.emergency}>1122</a> or your local emergency number.
          </p>
          <p className={styles.copy}>&copy; {YEAR} MediGuide</p>
        </div>
      </footer>
    </div>
  );
}
