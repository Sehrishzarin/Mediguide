// "How are you feeling today?" — mood faces that open today's log, or a summary once logged.
// Used at the top of the Journal calendar and (compact) on Home.
import { useNavigate } from 'react-router-dom';
import { Pencil, Thermometer, NotebookPen } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Button, Card, Skeleton } from '../../../components/ui';
import { useJournalToday, useCycle, cycleFlags } from './journalStore';
import { MoodFace, MoodPicker } from './MoodFaces';
import { MOODS, ENERGY, PAIN, FLOWS, FEVER_C, labelOf } from './journalModel';
import s from './Journal.module.css';

export default function TodayCard({ compact, className }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = useJournalToday(user);
  const cycle = cycleFlags(useCycle(user));

  if (today.status === 'loading') {
    return (
      <Card className={`${s.todayCard} ${className || ''}`} aria-busy="true" aria-label="Loading today">
        <Skeleton width="55%" height={18} />
        <Skeleton height={compact ? 64 : 80} radius="var(--r-md)" />
      </Card>
    );
  }
  if (today.status === 'error') {
    return (
      <Card className={`${s.todayCard} ${className || ''}`}>
        <div className={s.inlineError} role="alert">
          <span>{today.error}</span>
          <Button variant="ghost" size="sm" onClick={today.retry}>Retry</Button>
        </div>
      </Card>
    );
  }

  const { date, entry } = today.data;
  const logUrl = `/patient/journal/log/${date}`;

  if (!entry) {
    return (
      <Card className={`${s.todayCard} ${className || ''}`} aria-labelledby="today-h">
        <div className={s.todayHead}>
          <div>
            <h2 id="today-h" className={s.cardTitle}>{compact ? 'Log how you feel today' : 'How are you feeling today?'}</h2>
            <p className={s.cardText}>Tap a face to start today's entry.</p>
          </div>
        </div>
        <MoodPicker value={null} compact={compact} label="How are you feeling today?" onChange={(m) => navigate(`${logUrl}?mood=${m}`)} />
      </Card>
    );
  }

  const details = [];
  if (entry.energy) details.push(`Energy: ${labelOf(ENERGY, entry.energy).toLowerCase()}`);
  if (typeof entry.pain === 'number' && entry.pain > 0) details.push(`Pain: ${labelOf(PAIN, entry.pain).toLowerCase()}`);
  if (cycle.active && entry.period?.flow && entry.period.flow !== 'none') details.push(`Period: ${labelOf(FLOWS, entry.period.flow).toLowerCase()}`);
  const fever = typeof entry.temperature === 'number' && entry.temperature >= FEVER_C;

  return (
    <Card className={`${s.todayCard} ${className || ''}`} aria-labelledby="today-h">
      <div className={s.todayLogged}>
        {entry.mood ? <MoodFace mood={entry.mood} className={s.todayFace} /> : (
          <span className={s.todayIcon} aria-hidden="true"><NotebookPen size={20} /></span>
        )}
        <div className={s.grow}>
          <p className={s.metaLabel}>Today</p>
          <h2 id="today-h" className={s.cardTitle}>
            {entry.mood ? `Feeling ${labelOf(MOODS, entry.mood).toLowerCase()}` : 'Today is logged'}
          </h2>
          {details.length > 0 && <p className={s.cardText}>{details.join(' · ')}</p>}
        </div>
        <Button variant="secondary" size="sm" icon={Pencil} to={logUrl}>Edit</Button>
      </div>
      {(typeof entry.temperature === 'number' || entry.symptoms?.length > 0) && (
        <div className={s.todayChips}>
          {typeof entry.temperature === 'number' && (
            <span className={`${s.pill} ${fever ? s.pillWarn : ''}`}>
              <Thermometer size={14} aria-hidden="true" />{entry.temperature} °C{fever ? ' (fever)' : ''}
            </span>
          )}
          {(entry.symptoms || []).slice(0, compact ? 3 : 6).map((sym) => <span key={sym} className={s.pill}>{sym}</span>)}
          {entry.symptoms?.length > (compact ? 3 : 6) && <span className={s.pill}>+{entry.symptoms.length - (compact ? 3 : 6)} more</span>}
        </div>
      )}
    </Card>
  );
}
