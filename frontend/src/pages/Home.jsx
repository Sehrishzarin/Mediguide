import { Link } from 'react-router-dom';
import styles from './Home.module.css';

const features = [
  {
    title: 'AI Triage',
    description:
      'Describe your symptoms in plain language and get a smart, AI-powered assessment of how urgent your situation is.',
    iconClass: styles.featureIconTeal,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={styles.featureIconSvg}
        aria-hidden="true"
      >
        <path d="M12 3l1.9 4.6L18.5 9l-4.6 1.9L12 15.5l-1.9-4.6L5.5 9l4.6-1.4L12 3z" />
        <path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z" />
        <path d="M5 16l.7 1.6L7.5 18l-1.8.7L5 20.5l-.7-1.8L2.5 18l1.8-.4L5 16z" />
      </svg>
    ),
  },
  {
    title: 'Smart Scheduling',
    description:
      'Find nearby doctors with matching specialties and book an available slot instantly — no phone calls needed.',
    iconClass: styles.featureIconEmerald,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={styles.featureIconSvg}
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <path d="M9 16l2 2 4-4" />
      </svg>
    ),
  },
  {
    title: 'Emergency Support',
    description:
      'One tap connects you to emergency services and shares the critical details that first responders need.',
    iconClass: styles.featureIconRose,
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={styles.featureIconSvg}
        aria-hidden="true"
      >
        <path d="M19.5 12.6L12 20l-7.5-7.4a5 5 0 1 1 7.5-6.6 5 5 0 1 1 7.5 6.6z" />
        <path d="M7 12h3l1.5-3 2 5L15 12h2" />
      </svg>
    ),
  },
];

const steps = [
  {
    title: 'Describe Symptoms',
    description: 'Tell us what you feel in your own words — text or voice.',
  },
  {
    title: 'Get AI Assessment',
    description: 'Our triage engine evaluates urgency and suggests the right specialty.',
  },
  {
    title: 'Book Appointment',
    description: 'Pick a doctor and lock in an available slot in seconds.',
  },
];

function PulseIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M2 12h4l2.5-6 4 12 2.5-6h4l1 0" />
    </svg>
  );
}

function Home() {
  return (
    <div className={styles.page}>
      {/* Hero */}
      <header className={styles.hero}>
        <div className={styles.circleTopRight} />
        <div className={styles.circleBottomLeft} />
        <svg
          className={styles.ecgLine}
          viewBox="0 0 1200 100"
          fill="none"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0 50h180l20-30 25 60 25-45 15 15h180l20-25 25 55 25-50 15 20h200l20-35 25 65 25-40 15 10h180l20-25 25 50 25-45 15 20h140"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <div className={styles.heroInner}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>
              <PulseIcon className={styles.logoPulse} />
            </span>
            <span className={styles.logoText}>MediGuide</span>
          </div>

          <h1 className={styles.heroHeading}>
            Your Health, Guided Intelligently
          </h1>
          <p className={styles.heroSubtext}>
            AI-powered triage, smart doctor scheduling, and instant emergency
            support — all in one place, whenever you need care.
          </p>

          <div className={styles.heroButtons}>
            <Link to="/patient/signup" className={styles.btnPrimary}>
              Get Started as Patient
            </Link>
            <Link to="/org/onboard" className={styles.btnOutline}>
              Register Your Organization
            </Link>
          </div>
        </div>
      </header>

      {/* Features */}
      <section className={styles.featuresSection}>
        <div>
          <h2 className={styles.featuresHeading}>
            Everything you need for smarter care
          </h2>
          <p className={styles.featuresSubtext}>
            From the first symptom to a booked appointment, MediGuide walks
            with you at every step.
          </p>
        </div>

        <div className={styles.featuresGrid}>
          {features.map((feature) => (
            <div key={feature.title} className={styles.featureCard}>
              <div className={feature.iconClass}>
                {feature.icon}
              </div>
              <h3 className={styles.featureTitle}>{feature.title}</h3>
              <p className={styles.featureDesc}>{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className={styles.howSection}>
        <div className={styles.howInner}>
          <h2 className={styles.howHeading}>How it works</h2>
          <p className={styles.howSubtext}>
            Three simple steps from "I don't feel well" to seeing a doctor.
          </p>

          <ol className={styles.stepsList}>
            {steps.map((step, index) => (
              <li key={step.title} className={styles.stepItem}>
                {index < steps.length - 1 && (
                  <span className={styles.connector} aria-hidden="true" />
                )}
                <span className={styles.stepNumber}>{index + 1}</span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Provider CTA */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaCard}>
          <div>
            <h2 className={styles.ctaHeading}>
              Are you a healthcare provider?
            </h2>
            <p className={styles.ctaText}>
              Bring your clinic or hospital onto MediGuide and let patients
              find and book you effortlessly.
            </p>
          </div>
          <Link to="/org/onboard" className={styles.ctaBtn}>
            Onboard Your Organization
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <PulseIcon className={styles.footerPulse} />
            <span className={styles.footerBrandName}>MediGuide</span>
          </div>
          <p className={styles.footerCopy}>
            © 2026 MediGuide. All rights reserved.
          </p>
          <Link to="/admin" className={styles.footerAdmin}>
            Admin access
          </Link>
        </div>
      </footer>
    </div>
  );
}

export default Home;
