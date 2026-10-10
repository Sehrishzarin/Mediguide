// Public landing page. Only signed-out web visitors see it: RootRoute sends signed-in
// users to their dashboard and the native app straight to sign-in.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, MessageCircle, BellRing, NotebookPen, Baby, CalendarCheck, Siren,
  MapPin, Building2, Languages, ShieldCheck, Check, Phone
} from 'lucide-react';
import { Logo } from '../components/ui';
import Nura from '../components/nura/Nura';
import styles from './Home.module.css';

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Fade/slide sections in as they scroll into view
function useReveal(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let pending = [...root.querySelectorAll('[data-reveal]')];
    if (reduced()) {
      pending.forEach((el) => el.classList.add(styles.in));
      return undefined;
    }
    // A plain scroll check (instead of IntersectionObserver) so content can never get
    // stuck invisible, e.g. in background tabs where observers don't report
    const check = () => {
      const limit = window.innerHeight * 0.92;
      pending = pending.filter((el) => {
        if (el.getBoundingClientRect().top < limit) { el.classList.add(styles.in); return false; }
        return true;
      });
      if (!pending.length) stop();
    };
    let timer = 0;
    const onScroll = () => { if (!timer) timer = setTimeout(() => { timer = 0; check(); }, 60); };
    const stop = () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    check(); // whatever is already on screen animates in straight away
    return () => { stop(); clearTimeout(timer); };
  }, [rootRef]);
}

// ── Hero: a short conversation with Nura that plays on a loop ────────────
const SCRIPT = [
  { at: 600, show: 'user1' },
  { at: 1300, show: 'typing', mood: 'thinking' },
  { at: 2600, show: 'nura1', mood: 'empathetic' },
  { at: 3600, show: 'scale' },
  { at: 4900, show: 'pick' },
  { at: 5600, show: 'user2' },
  { at: 6300, show: 'typing2', mood: 'thinking' },
  { at: 7600, show: 'result', mood: 'concerned' },
  { at: 12500, show: 'reset' }
];
const ORDER = ['user1', 'typing', 'nura1', 'scale', 'pick', 'user2', 'typing2', 'result'];
const FACES = ['Barely', 'A little', 'Quite', 'Very', 'Extremely'];

function Face({ level }) {
  // 1 calm ... 5 distressed (simple SVG, no emoji)
  const mouth = ['M9 15 Q13 18.5 17 15', 'M9.5 15.5 Q13 17.5 16.5 15.5', 'M9.5 16 L16.5 16', 'M9.5 17 Q13 14.5 16.5 17', 'M9 17.5 Q13 13.5 17 17.5'][level - 1];
  return (
    <svg viewBox="0 0 26 26" className={styles.faceSvg} aria-hidden="true">
      <circle cx="13" cy="13" r="11.5" />
      <circle cx="9.5" cy="10.5" r="1.3" className={styles.faceDot} />
      <circle cx="16.5" cy="10.5" r="1.3" className={styles.faceDot} />
      <path d={mouth} />
    </svg>
  );
}

function HeroDemo({ onMood }) {
  const [step, setStep] = useState(reduced() ? 'result' : '');
  const shown = (key) => step && ORDER.indexOf(step) >= ORDER.indexOf(key);

  useEffect(() => {
    if (reduced()) { onMood('concerned'); return undefined; }
    let timers = [];
    const run = () => {
      timers.forEach(clearTimeout);
      timers = SCRIPT.map(({ at, show, mood }) => setTimeout(() => {
        if (show === 'reset') { setStep(''); onMood('idle'); timers.push(setTimeout(run, 900)); return; }
        setStep(show);
        if (mood) onMood(mood);
        else if (show === 'nura1' || show === 'scale') onMood('empathetic');
      }, at));
    };
    run();
    return () => timers.forEach(clearTimeout);
  }, [onMood]);

  return (
    <div className={styles.chat} aria-hidden="true">
      {shown('user1') && <div className={`${styles.msg} ${styles.user}`}>I&apos;ve had a fever since yesterday</div>}
      {step === 'typing' && <div className={`${styles.msg} ${styles.nuraMsg} ${styles.typing}`}><i /><i /><i /></div>}
      {shown('nura1') && (
        <div className={`${styles.msg} ${styles.nuraMsg}`}>
          I&apos;m sorry, that sounds draining. <strong>How unwell do you feel right now?</strong>
        </div>
      )}
      {shown('scale') && (
        <div className={styles.scale}>
          {FACES.map((label, i) => (
            <span key={label} className={`${styles.scaleItem} ${shown('pick') && i === 3 ? styles.picked : ''}`} style={{ '--i': i }}>
              <Face level={i + 1} />
              <small>{label}</small>
            </span>
          ))}
        </div>
      )}
      {shown('user2') && <div className={`${styles.msg} ${styles.user}`}>Very unwell (4/5)</div>}
      {step === 'typing2' && <div className={`${styles.msg} ${styles.nuraMsg} ${styles.typing}`}><i /><i /><i /></div>}
      {shown('result') && (
        <div className={styles.result}>
          <div className={styles.resultHead}>
            <span className={styles.resultDot} />
            See a doctor within 24 hours
          </div>
          <div className={styles.resultBody}>
            <span><MapPin size={14} /> Margalla Heights Medical Center · 2.4 km</span>
            <span className={styles.resultSlot}>Dr. Hamza Qureshi · Today, 4:00 PM</span>
          </div>
          <span className={styles.resultBtn}>Book this session</span>
        </div>
      )}
    </div>
  );
}

// ── Content ───────────────────────────────────────────────────────────────
const FEATURES = [
  {
    key: 'nura', icon: MessageCircle, title: 'A health chat that listens',
    text: 'Tell Nura what is wrong in your own words, typed or spoken. She asks the right follow-up questions, then explains how urgent it sounds and who to see.',
    wide: true
  },
  {
    key: 'checkin', icon: BellRing, title: 'Nura Check-In',
    text: 'Recovering at home? Nura checks on you, and if you go quiet she alerts someone you trust, in English and Urdu.'
  },
  {
    key: 'journal', icon: NotebookPen, title: 'Journal and cycle',
    text: 'Log how you feel each day. See patterns, period predictions and a summary to show your doctor.'
  },
  {
    key: 'plans', icon: Baby, title: 'Care plans',
    text: 'Pregnancy week by week, TB treatment, chemotherapy and more: every check-up on one timeline.'
  },
  {
    key: 'book', icon: CalendarCheck, title: 'Book verified doctors',
    text: 'Open sessions from partner hospitals and clinics near you. Confirm in a few taps.'
  },
  {
    key: 'sos', icon: Siren, title: 'Help in an emergency',
    text: 'Danger signs are flagged instantly, with one tap to call 1122 and the nearest hospital.',
    full: true
  }
];

const TOPICS = [
  'Fever and flu', 'Headaches', 'Pregnancy week by week', 'Period and cycle', 'Medicines and allergies',
  'Sleep and stress', 'Stomach trouble', 'Blood pressure', 'Diabetes', 'TB treatment', 'Skin rashes',
  'Finding the right specialist', 'Emergency help'
];

const STEPS = [
  { title: 'Tell Nura how you feel', text: 'In your own words. She asks a few gentle questions, one at a time.' },
  { title: 'Know what to do next', text: 'Home care, a doctor this week, or urgent care, with the reasons explained.' },
  { title: 'Get care, then get better', text: 'Book a nearby doctor, and let Nura check in while you recover.' }
];

function FeatureVisual({ id }) {
  if (id === 'nura') {
    return (
      <div className={styles.visScale}>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={n === 3 ? styles.visActive : ''}><Face level={n} /></span>
        ))}
      </div>
    );
  }
  if (id === 'checkin') {
    return (
      <ul className={styles.visTimeline}>
        <li className={styles.visDone}><Check size={12} /> Check-in sent</li>
        <li className={styles.visDone}><Check size={12} /> Gentle reminder</li>
        <li className={styles.visNow}>Calling your phone</li>
      </ul>
    );
  }
  if (id === 'journal') {
    return (
      <div className={styles.visCal}>
        {Array.from({ length: 14 }, (_, i) => (
          <span key={i} className={[styles.visDay, [2, 3, 4].includes(i) ? styles.visPeriod : '', [9, 10].includes(i) ? styles.visFertile : '', [0, 6, 8, 12].includes(i) ? styles.visMood : ''].join(' ')} />
        ))}
      </div>
    );
  }
  if (id === 'plans') {
    return (
      <div className={styles.visPlan}>
        <div className={styles.visPlanRow}><span>Week 24</span><span>2nd trimester</span></div>
        <div className={styles.visBar}><span /></div>
        <small>Next: glucose test · in 9 days</small>
      </div>
    );
  }
  if (id === 'book') {
    return (
      <div className={styles.visChips}>
        {['9:00', '11:00', '2:30', '4:00'].map((t, i) => <span key={t} className={i === 2 ? styles.visChipOn : ''}>{t}</span>)}
      </div>
    );
  }
  return <span className={styles.visSos}><Phone size={14} /> Call 1122</span>;
}

export default function Home() {
  const rootRef = useRef(null);
  const [heroMood, setHeroMood] = useState('idle');
  const [hovering, setHovering] = useState(false);
  useReveal(rootRef);

  return (
    <div ref={rootRef} className={styles.page}>
      {/* ── Nav ── */}
      <header className={styles.nav}>
        <div className={styles.navInner}>
          <Logo size={32} to="/" />
          <nav className={styles.navLinks} aria-label="Sections">
            <a href="#features">Features</a>
            <a href="#how">How it works</a>
            <a href="#clinics">For clinics</a>
          </nav>
          <div className={styles.navActions}>
            <Link to="/login" className={styles.linkBtn}>Sign in</Link>
            <Link to="/signup" className={`${styles.pill} ${styles.pillDark}`}>Get started</Link>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className={styles.hero}>
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <span className={styles.eyebrow} data-reveal>
                <span className={styles.liveDot} /> Meet Nura, your health companion
              </span>
              <h1 className={styles.heroTitle} data-reveal style={{ '--d': '80ms' }}>
                Care that <em className={styles.serif}>listens</em>,<br />
                guidance you can <em className={styles.serif}>trust</em>.
              </h1>
              <p className={styles.heroText} data-reveal style={{ '--d': '160ms' }}>
                Describe how you feel and Nura helps you decide what to do next: rest at home, see a doctor,
                or get urgent care. Then book a nearby doctor in a few taps.
              </p>
              <div className={styles.heroCtas} data-reveal style={{ '--d': '240ms' }}>
                <Link to="/signup" className={`${styles.pill} ${styles.pillDark} ${styles.pillLg}`}>
                  Talk to Nura <ArrowRight size={18} />
                </Link>
                <Link to="/login" className={`${styles.pill} ${styles.pillGhost} ${styles.pillLg}`}>I have an account</Link>
              </div>
              <ul className={styles.trust} data-reveal style={{ '--d': '320ms' }}>
                <li><Languages size={16} /> English and Urdu</li>
                <li><Siren size={16} /> 1122 built in</li>
                <li><ShieldCheck size={16} /> Free for patients</li>
              </ul>
            </div>

            <div className={styles.heroArt} data-reveal style={{ '--d': '200ms' }}>
              <div className={styles.phone}>
                <div className={styles.phoneHead}>
                  <span
                    className={styles.nuraHover}
                    onPointerEnter={() => setHovering(true)}
                    onPointerLeave={() => setHovering(false)}
                  >
                    <Nura size={44} mood={hovering ? 'happy' : heroMood} gaze="pointer" />
                  </span>
                  <div>
                    <strong>Nura</strong>
                    <small><span className={styles.online} /> Online</small>
                  </div>
                </div>
                <HeroDemo onMood={setHeroMood} />
              </div>
              <span className={`${styles.floatChip} ${styles.chipA}`}><Baby size={14} /> Week 24 · on track</span>
              <span className={`${styles.floatChip} ${styles.chipB}`}><BellRing size={14} /> Check-in: feeling better</span>
            </div>
          </div>
        </section>

        {/* ── Topics ticker ── */}
        <section className={styles.ticker} aria-label="Things Nura can help with">
          <div className={styles.tickerTrack}>
            {[...TOPICS, ...TOPICS].map((t, i) => (
              <span key={`${t}-${i}`} className={styles.topic} aria-hidden={i >= TOPICS.length}>{t}</span>
            ))}
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className={styles.section}>
          <div className={styles.sectionHead} data-reveal>
            <span className={styles.kicker}>Everything in one place</span>
            <h2 className={styles.h2}>From <em className={styles.serif}>&ldquo;I don&apos;t feel well&rdquo;</em> to feeling better</h2>
          </div>
          <div className={styles.bento}>
            {FEATURES.map((f, i) => (
              <article
                key={f.key}
                className={`${styles.card} ${f.wide ? styles.cardWide : ''} ${f.full ? styles.cardFull : ''}`}
                data-reveal
                style={{ '--d': `${i * 70}ms` }}
              >
                <span className={styles.cardIcon}><f.icon size={20} /></span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
                <div className={styles.cardVisual}><FeatureVisual id={f.key} /></div>
              </article>
            ))}
          </div>
        </section>

        {/* ── How it works ── */}
        <section id="how" className={`${styles.section} ${styles.how}`}>
          <div className={styles.sectionHead} data-reveal>
            <span className={styles.kicker}>How it works</span>
            <h2 className={styles.h2}>Three steps, <em className={styles.serif}>no waiting rooms</em></h2>
          </div>
          <ol className={styles.steps} data-reveal>
            {STEPS.map((s, i) => (
              <li key={s.title} className={styles.step} style={{ '--d': `${150 + i * 160}ms` }}>
                <span className={styles.stepNum}>{i + 1}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ── For clinics ── */}
        <section id="clinics" className={styles.clinics}>
          <div className={styles.clinicsInner} data-reveal>
            <span className={styles.clinicsIcon}><Building2 size={22} /></span>
            <div>
              <h2>Run a hospital or clinic?</h2>
              <p>List your facility, add your doctors and let patients book open sessions. Verified by our team before going live.</p>
            </div>
            <Link to="/signup" className={`${styles.pill} ${styles.pillLight} ${styles.pillLg}`}>
              Register your facility <ArrowRight size={18} />
            </Link>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className={styles.final}>
          <div className={styles.finalCard} data-reveal>
            <Nura size={112} mood="happy" gaze="pointer" />
            <h2 className={styles.h2}>Not feeling great? <em className={styles.serif}>Talk to Nura.</em></h2>
            <p>It takes a minute, and it&apos;s free.</p>
            <Link to="/signup" className={`${styles.pill} ${styles.pillDark} ${styles.pillLg}`}>
              Get started <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Logo size={28} />
          <p>
            MediGuide gives general guidance and is not a substitute for professional medical care.
            In an emergency, call 1122 or go to the nearest emergency department.
          </p>
          <nav className={styles.footerLinks} aria-label="Account">
            <Link to="/login">Sign in</Link>
            <Link to="/signup">Create account</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
