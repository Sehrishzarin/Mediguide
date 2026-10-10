// Screen 2: an open, unanswered check-in. Better / Same / Worse / Need help.
import { useState } from 'react';
import { Smile, Meh, Frown, Siren, ChevronRight } from 'lucide-react';
import { Alert, Badge, Card } from '../../../components/ui';
import Nura from '../../../components/nura/Nura';
import friendlyError from '../../../utils/friendlyError';
import { answer } from './monitoringStore';
import { ANSWER_LABEL, clockTime, comparedTo, firstName, sameDay } from './format';
import { useNow } from './hooks';
import DemoBadge from './DemoBadge';
import s from './Monitoring.module.css';

const CHOICES = [
  { value: 'better', label: 'Better', icon: Smile, cls: s.answerBetter },
  { value: 'same', label: 'Same', icon: Meh, cls: s.answerSame },
  { value: 'worse', label: 'Worse', icon: Frown, cls: s.answerWorse },
  { value: 'help', label: 'Need help', icon: Siren, cls: s.answerHelp }
];

const ANSWER_TONE = { better: 'success', same: 'neutral', worse: 'warning', help: 'danger', ok: 'brand' };

export function TodaySoFar({ history, demo }) {
  const now = useNow(60000);
  const today = (history || []).filter((h) => sameDay(h.answeredAt, now));
  return (
    <section className={s.section} aria-labelledby="today-h">
      <h2 id="today-h" className={s.sectionTitle}>Today so far</h2>
      {today.length === 0 ? (
        <p className={s.muted}>No answers yet today.</p>
      ) : (
        <Card padding="none">
          <ul className={s.historyList}>
            {today.map((h) => (
              <li key={h.id} className={s.historyRow}>
                <span className={s.historyTime}>{clockTime(h.answeredAt, demo)}</span>
                <Badge tone={ANSWER_TONE[h.answer] || 'neutral'}>{ANSWER_LABEL[h.answer] || h.answer}</Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}

export default function CheckInPrompt({ monitoring, userName, onPreview }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const now = useNow(60000);
  const open = monitoring.openCheckIn;
  const lastAnswer = monitoring.history?.[0];
  const ref = lastAnswer?.answeredAt || monitoring.startedAt;
  const name = firstName(userName);

  const choose = async (value) => {
    setBusy(value);
    setError('');
    try {
      await answer(value);
    } catch (err) {
      setError(friendlyError(err, "We couldn't save your answer. Please try again."));
      setBusy('');
    }
  };

  return (
    <div className={s.stack}>
      <div className={s.promptHead}>
        <Nura size={72} mood="empathetic" />
        <div className={s.promptBadges}>
          <Badge tone="brand">
            {monitoring.totalCheckIns ? `Check-in ${monitoring.checkInNumber} of ${monitoring.totalCheckIns}` : `Check-in ${monitoring.checkInNumber}`}
          </Badge>
          {monitoring.demoSpeed && <DemoBadge>Demo speed</DemoBadge>}
        </div>
        <h1 className={s.promptTitle}>
          Hi{name ? ` ${name}` : ''}, how are you feeling compared to {comparedTo(ref, now)}?
        </h1>
        <p className={s.muted}>Sent at {clockTime(open.sentAt, monitoring.demoSpeed)}</p>
      </div>

      <div className={s.answerGrid} role="group" aria-label="How are you feeling?">
        {CHOICES.map(({ value, label, icon: Icon, cls }) => (
          <button
            key={value}
            type="button"
            className={`${s.answerBtn} ${cls}`}
            onClick={() => choose(value)}
            disabled={Boolean(busy)}
            aria-busy={busy === value || undefined}
          >
            {busy === value ? <span className={s.spinner} aria-hidden="true" /> : <Icon size={24} aria-hidden="true" />}
            <span>{label}</span>
          </button>
        ))}
      </div>
      {error && <Alert tone="danger">{error}</Alert>}

      <TodaySoFar history={monitoring.history} demo={monitoring.demoSpeed} />

      <button type="button" className={s.textLink} onClick={onPreview}>
        See what happens if you don't reply <ChevronRight size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
