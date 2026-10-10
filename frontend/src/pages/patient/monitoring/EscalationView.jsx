// Screen 3: no reply yet. A timeline of the server-side escalation and "I'm OK, cancel the alert".
// `preview` shows the same plan from the check-in prompt ("See what happens if you don't reply").
import { useState } from 'react';
import { Check, Server, ShieldCheck, Smartphone, ArrowLeft, Clock } from 'lucide-react';
import { Alert, Badge, Button } from '../../../components/ui';
import Nura from '../../../components/nura/Nura';
import friendlyError from '../../../utils/friendlyError';
import { imOk } from './monitoringStore';
import { agreedNames, alertAfterLabel, clockTime, firstName, isDemoStep, joinNames } from './format';
import { useNow } from './hooks';
import DemoBadge from './DemoBadge';
import s from './Monitoring.module.css';

function Timeline({ steps, demo, preview }) {
  return (
    <ol className={s.timeline} aria-label="What Nura does next">
      {steps.map((step) => (
        <li key={step.key} className={`${s.tlItem} ${s[`tl_${step.status}`]}`}>
          <span className={s.tlMarker} aria-hidden="true">
            {step.status === 'done' && <Check size={14} strokeWidth={3} />}
          </span>
          <div className={s.tlBody}>
            <p className={s.tlLabel}>
              {step.label}
              {step.status === 'current' && <span className={s.tlNow}>{preview ? ' · Next' : ' · Now'}</span>}
              {isDemoStep(step.key) && <> <DemoBadge /></>}
            </p>
            {step.status === 'current' && step.detail && <p className={s.tlDetail}>{step.detail}</p>}
            <p className={s.tlTime}>
              <span className="sr-only">{step.status === 'done' ? 'Done' : step.status === 'current' ? 'Next' : 'Later'}, </span>
              {clockTime(step.doneAt || step.at, demo)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function EscalationView({ monitoring, preview, onBack }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const now = useNow(1000);
  const open = monitoring.openCheckIn;
  const demo = monitoring.demoSpeed;
  const names = agreedNames(monitoring);
  const contactWord = names.length ? joinNames(names.map(firstName)) : 'Your contact';
  const firstAgreed = monitoring.contacts.find((c) => c.consent === 'agreed');
  const waiting = Math.max(0, Math.floor((now - new Date(open.sentAt).getTime()) / (monitoring.unitMs || 60000)));

  const cancel = async () => {
    setBusy(true);
    setError('');
    try {
      await imOk();
    } catch (err) {
      setError(friendlyError(err, "We couldn't cancel the alert. Please try again."));
      setBusy(false);
    }
  };

  return (
    <div className={s.stack}>
      <div className={s.promptHead}>
        <Nura size={64} mood={preview ? 'thinking' : 'concerned'} />
        <div className={s.promptBadges}>
          {!preview && !open.acknowledgedBy && <Badge tone="warning" icon={Clock}>Waiting for you · {waiting} min</Badge>}
          {demo && <DemoBadge>Demo speed</DemoBadge>}
        </div>
        <h1 className={s.promptTitle}>
          {preview ? "If you don't reply" : `No reply to the ${clockTime(open.sentAt)} check-in`}
        </h1>
        <p className={s.heroText}>
          Nura steps up gently. {contactWord} {names.length > 1 ? 'are' : 'is'} only alerted if you stay silent for the full {alertAfterLabel(monitoring.alertAfterMin)}.
        </p>
      </div>

      {open.acknowledgedBy && open.acknowledgedBy !== 'you' && (
        <Alert tone="success" icon={Check} title={`${open.acknowledgedBy} confirmed they reached you`}>
          Nura has stopped the alerts. Tap the button below to close this check-in.
        </Alert>
      )}
      {open.alertSent && !open.acknowledgedBy && (
        <Alert tone="warning" title={`${contactWord} ${names.length > 1 ? 'were' : 'was'} alerted (demo)`}>
          In this demo the text was not really sent. Tap "I'm OK" and Nura will tell them you're fine.
        </Alert>
      )}

      <Timeline steps={open.steps} demo={demo} preview={preview} />

      <Alert tone="info" icon={Server}>
        This timer runs on MediGuide's servers, so it keeps going even if your phone is off or out of signal.
      </Alert>

      {firstAgreed && (
        <Button variant="ghost" icon={Smartphone} to={`/patient/monitoring/contact/${firstAgreed.id}`} className={s.alignStart}>
          See what {firstName(firstAgreed.name)} receives
        </Button>
      )}

      {/* The main action stays in reach while the timeline scrolls */}
      <div className={s.stickyBar}>
        <div className={s.stickyInner}>
          {error && <Alert tone="danger">{error}</Alert>}
          {preview ? (
            <Button size="lg" block icon={ArrowLeft} onClick={onBack}>Back to the check-in</Button>
          ) : (
            <Button size="lg" block icon={ShieldCheck} onClick={cancel} loading={busy} className={s.okBtn}>
              {open.acknowledgedBy ? "I'm OK, close the check-in" : "I'm OK, cancel the alert"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
