// What happens after an answer: reassurance, a re-check offer, or help options.
import { useState } from 'react';
import { Phone, Siren, Stethoscope, Check, Smartphone, ShieldCheck } from 'lucide-react';
import { Alert, Button, Card } from '../../../components/ui';
import Nura from '../../../components/nura/Nura';
import friendlyError from '../../../utils/friendlyError';
import { imOk, dismissRecent } from './monitoringStore';
import { agreedNames, clockTime, countdown, firstName, joinNames, recheckUrl } from './format';
import { useNow } from './hooks';
import DemoBadge from './DemoBadge';
import s from './Monitoring.module.css';

function NextCheckIn({ monitoring }) {
  const now = useNow(1000);
  return (
    <p className={s.nextLine}>
      Next check-in at <strong>{clockTime(monitoring.nextCheckInAt, monitoring.demoSpeed)}</strong>
      {' '}({countdown(monitoring.nextCheckInAt, now, monitoring.demoSpeed)})
    </p>
  );
}

// Better / Same / Worse / I'm OK (alert cancelled)
export function AnswerDone({ monitoring, recent }) {
  const { answer } = recent;
  const names = (recent.alertedNames || []).map(firstName);
  const copy = {
    better: { mood: 'happy', title: "Glad you're feeling better", text: 'Keep resting and following your care plan.' },
    same: { mood: 'idle', title: 'Thanks for letting me know', text: "Keep resting. If anything changes, you can tell Nura any time." },
    worse: { mood: 'empathetic', title: "I'm sorry it's getting worse", text: "Let's look at your symptoms again so Nura can guide you." },
    ok: { mood: 'happy', title: "Glad you're OK. The alert is cancelled", text: recent.alertWasSent && names.length ? `Nura told ${joinNames(names)} you're fine (demo).` : 'No one was alerted.' }
  }[answer] || { mood: 'idle', title: 'Thanks for answering', text: '' };

  return (
    <div className={s.stack}>
      <div className={s.promptHead}>
        <Nura size={72} mood={copy.mood} />
        <h1 className={s.promptTitle}>{copy.title}</h1>
        {copy.text && <p className={s.heroText}>{copy.text}</p>}
      </div>

      {answer === 'worse' && (
        <div className={s.actionsCol}>
          <Button size="lg" block icon={Stethoscope} to={recheckUrl(monitoring.reason)}>Re-check my symptoms with Nura</Button>
          <Button variant="secondary" block icon={Phone} href="tel:1122">Feeling seriously unwell? Call 1122</Button>
        </div>
      )}

      <Card padding="md">
        <NextCheckIn monitoring={monitoring} />
      </Card>

      <Button variant={answer === 'worse' ? 'ghost' : 'primary'} block icon={Check} onClick={dismissRecent}>Done</Button>
    </div>
  );
}

// "Need help" was pressed: contacts alerted (demo), call 1122, emergency help
export function HelpSent({ monitoring }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const names = agreedNames(monitoring).map(firstName);
  const firstAgreed = monitoring.contacts.find((c) => c.consent === 'agreed');

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
        <Nura size={64} mood="concerned" />
        <div className={s.promptBadges}><DemoBadge>Demo: no real text was sent</DemoBadge></div>
        <h1 className={s.promptTitle}>
          {names.length ? `We've alerted ${joinNames(names)}` : 'Your request for help was recorded'}
        </h1>
        <p className={s.heroText}>
          {names.length
            ? 'Nura texted them your last known location (demo). If this is an emergency, call 1122 now.'
            : 'No contact has agreed yet, so no one could be alerted. If this is an emergency, call 1122 now.'}
        </p>
      </div>

      <div className={s.actionsCol}>
        <Button variant="danger" size="lg" block icon={Phone} href="tel:1122" className={s.callBtn}>Call 1122</Button>
        <Button variant="secondary" size="lg" block icon={Siren} to="/patient/emergency">Emergency help</Button>
      </div>

      {error && <Alert tone="danger">{error}</Alert>}
      <Button variant="ghost" block icon={ShieldCheck} onClick={cancel} loading={busy}>I'm OK now, cancel the alert</Button>
      {firstAgreed && (
        <Button variant="ghost" icon={Smartphone} to={`/patient/monitoring/contact/${firstAgreed.id}`}>
          See what {firstName(firstAgreed.name)} receives
        </Button>
      )}
    </div>
  );
}
