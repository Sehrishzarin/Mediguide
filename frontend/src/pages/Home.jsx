import { Link } from 'react-router-dom';
import { useAuth, homeForRole } from '../context/AuthContext';
import styles from './Home.module.css';

const features = [
  {
    title: 'AI triage',
    text: 'Describe symptoms in your own words, by typing or by voice. Get an urgency level, a suggested specialist and safe next steps that take your medical profile into account.',
    path: 'M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5l-1.9-4.6L5.5 9l4.6-1.4L12 3zM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z'
  },
  {
    title: 'Nearby care',
    text: 'See hospitals, clinics and pharmacies around you on a live map, sorted by distance, with partner facilities highlighted.',
    path: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zM12 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z'
  },
  {
    title: 'Instant booking',
    text: 'Pick a doctor session at a partner facility and book it in a few taps. No phone calls, no waiting in line.',
    path: 'M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6zM16 2v4M8 2v4M3 10h18M9 16l2 2 4-4'
  }
];

const YEAR = new Date().getFullYear();

const steps = [
  { title: 'Describe how you feel', text: 'Type or speak your symptoms to the AI counselor.' },
  { title: 'Get guidance', text: 'See how urgent it is and which specialist fits.' },
  { title: 'Book a doctor', text: 'Choose an available session and confirm instantly.' }
];

function Icon({ path }) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  );
}

export default function Home() {
  const { user, role } = useAuth();
  const signedIn = Boolean(user);

  return (
    <div className={styles.page}>
      <nav className={styles.nav} aria-label="Main">
        <Link to="/" className={styles.brand}>
          <img src="/logo.jpg" alt="" width="36" height="36" className={styles.logo} />
          <span>MediGuide</span>
        </Link>
        {signedIn ? (
          <Link to={homeForRole(role)} className={styles.navLink}>My dashboard</Link>
        ) : (
          <Link to="/login" className={styles.navLink}>Sign in</Link>
        )}
      </nav>

      <header className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Your health, guided</p>
            <h1 className={styles.title}>AI triage, nearby care, instant booking.</h1>
            <p className={styles.lead}>
              Tell MediGuide what you feel. It tells you how urgent it is, finds the right care close to you and books the appointment.
            </p>
            <div className={styles.ctas}>
              {signedIn ? (
                <Link to={homeForRole(role)} className={styles.btnPrimary}>Go to my dashboard</Link>
              ) : (
                <>
                  <Link to="/signup" className={styles.btnPrimary}>Get started</Link>
                  <Link to="/login" className={styles.btnGhost}>Sign in</Link>
                </>
              )}
            </div>
            {!signedIn && (
              <p className={styles.orgLine}>
                Run a hospital or clinic? <Link to="/signup" className={styles.orgLink}>For hospitals &amp; clinics</Link>
                {' '}&mdash; choose &ldquo;Healthcare organization&rdquo; when you sign up.
              </p>
            )}
          </div>

          <div className={styles.preview} aria-hidden="true">
            <div className={styles.previewHead}><span className={styles.dot} /> AI Health Counselor</div>
            <div className={`${styles.msg} ${styles.msgUser}`}>I have had a fever and sore throat since yesterday</div>
            <div className={`${styles.msg} ${styles.msgAi}`}>
              That sounds like a likely viral infection. Rest and fluids help.
              <span className={styles.tags}>
                <span className={styles.tagLow}>Low urgency</span>
                <span className={styles.tagSpec}>General Physician</span>
              </span>
            </div>
            <div className={styles.previewCta}>Find a General Physician session</div>
          </div>
        </div>
      </header>

      <main>
        <section className={styles.section} aria-labelledby="features-h">
          <h2 id="features-h" className={styles.h2}>From first symptom to booked visit</h2>
          <div className={styles.cards}>
            {features.map((f) => (
              <article key={f.title} className={styles.card}>
                <span className={styles.cardIcon}><Icon path={f.path} /></span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={`${styles.section} ${styles.how}`} aria-labelledby="how-h">
          <h2 id="how-h" className={styles.h2}>How it works</h2>
          <ol className={styles.steps}>
            {steps.map((s, i) => (
              <li key={s.title} className={styles.step}>
                <span className={styles.stepNum}>{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {!signedIn && (
          <section className={styles.section} aria-labelledby="org-h">
            <div className={styles.orgCard}>
              <div>
                <h2 id="org-h" className={styles.orgTitle}>For hospitals &amp; clinics</h2>
                <p>List your facility, add your doctors and let patients book you. Sign up and choose &ldquo;Healthcare organization&rdquo;.</p>
              </div>
              <Link to="/signup" className={styles.btnLight}>Register your facility</Link>
            </div>
          </section>
        )}
      </main>

      <footer className={styles.footer}>
        <p>
          MediGuide provides general guidance and is not a substitute for professional medical care, diagnosis or treatment.
          In an emergency call <a href="tel:1122" className={styles.emergency}>1122</a>.
        </p>
        <p className={styles.copy}>&copy; {YEAR} MediGuide</p>
      </footer>
    </div>
  );
}
