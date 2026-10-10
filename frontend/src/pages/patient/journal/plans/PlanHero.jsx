// Plan detail hero: where the patient is in the plan (week / month / cycle / day).
import { AlertTriangle, Phone } from 'lucide-react';
import { Alert, Badge, Button, Card, ProgressBar } from '../../../../components/ui';
import { formatDate, ordinal, relativeDays, daysBetween, notStarted, lowImmunity, toIso } from './planFormat';
import { PlanIcon } from './Icons';
import s from './Plans.module.css';

const TRIMESTERS = [
  { n: 1, from: 0, to: 14, label: '1st' },
  { n: 2, from: 14, to: 28, label: '2nd' },
  { n: 3, from: 28, to: 40, label: '3rd' }
];

function TrimesterBar({ week, day }) {
  const w = week + (day % 7) / 7;
  return (
    <div className={s.trimesters} role="img" aria-label={`Week ${week} of 40`}>
      {TRIMESTERS.map((t) => {
        const pct = Math.max(0, Math.min(1, (w - t.from) / (t.to - t.from))) * 100;
        const on = w >= t.from && (w < t.to || t.n === 3);
        return (
          <div key={t.n} className={s.triSeg}>
            <span className={s.triTrack}><span className={s.triFill} style={{ width: `${pct}%` }} /></span>
            <span className={`${s.triLabel} ${on ? s.triLabelOn : ''}`}>{t.label} trimester</span>
          </div>
        );
      })}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className={s.stat}>
      <p className={s.statLabel}>{label}</p>
      <p className={s.statValue}>{value}</p>
    </div>
  );
}

function ProgressBlock({ plan, today }) {
  const p = plan.progress || {};
  if (notStarted(plan)) {
    return (
      <>
        <p className={s.bigValue}>Starts {formatDate(plan.startDate)}</p>
        <p className={s.heroSub}>Your plan begins {relativeDays(daysBetween(today, plan.startDate))}.</p>
      </>
    );
  }
  if (plan.type === 'pregnancy') {
    const toGo = p.daysToGo;
    return (
      <>
        <div>
          <div className={s.wrapRow}>
            <p className={s.bigValue}>Week {p.week}</p>
            <Badge tone="brand">{ordinal(p.trimester)} trimester</Badge>
          </div>
          <p className={s.heroSub}>{p.label}</p>
        </div>
        <TrimesterBar week={p.week} day={p.day} />
        <div className={s.stats}>
          <Stat label="Due date" value={formatDate(p.dueDate, { year: true })} />
          <Stat
            label={toGo >= 0 ? 'Days to go' : 'Due date'}
            value={toGo > 0 ? String(toGo) : toGo === 0 ? 'Today' : `${-toGo} days ago`}
          />
        </div>
      </>
    );
  }
  if (plan.type === 'tb') {
    return (
      <>
        <div>
          <p className={s.bigValue}>Month {p.month} of 6</p>
          <p className={s.heroSub}>{p.day < 60 ? 'Intensive phase' : 'Continuation phase'} · day {p.day + 1}</p>
        </div>
        <ProgressBar value={p.percent} label="Treatment progress" />
      </>
    );
  }
  if (plan.type === 'chemo') {
    const total = Number(plan.settings?.cycles) || 0;
    const len = Number(plan.settings?.cycleDays) || 0;
    return (
      <>
        <div>
          <p className={s.bigValue}>Cycle {p.cycle}{total ? ` of ${total}` : ''}</p>
          <p className={s.heroSub}>Day {p.cycleDay}{len ? ` of ${len}` : ''}</p>
        </div>
        <ProgressBar value={p.percent} label="Treatment progress" />
      </>
    );
  }
  return (
    <>
      <div>
        <p className={s.bigValue}>Day {p.day + 1}</p>
        <p className={s.heroSub}>Since {formatDate(plan.startDate, { year: true })}</p>
      </div>
      <ProgressBar value={p.percent} label="Plan progress" />
    </>
  );
}

export default function PlanHero({ plan, today }) {
  const ended = plan.status !== 'active';
  return (
    <>
      {lowImmunity(plan) && (
        <Alert tone="danger" icon={AlertTriangle} title="Low-immunity days">
          <p>A temperature of 38°C or more needs urgent care. Call your oncology team straight away, or 1122 if you can't reach them.</p>
          <Button variant="danger" size="sm" icon={Phone} href="tel:1122" className={s.alertBtn}>Call 1122</Button>
        </Alert>
      )}
      <Card className={s.hero}>
        <div className={s.heroTop}>
          <span className={`${s.iconTile} ${ended ? s.iconTileMuted : ''}`}><PlanIcon type={plan.type} /></span>
          <div className={s.grow}>
            <p className={s.planTitle}>{plan.title}</p>
            <p className={s.meta}>Started {formatDate(plan.startDate, { year: true })}</p>
          </div>
          {ended && (
            <Badge tone={plan.status === 'completed' ? 'success' : 'neutral'}>
              {plan.status === 'completed' ? 'Completed' : 'Stopped'}
            </Badge>
          )}
        </div>
        {ended ? (
          <p className={s.heroSub}>
            {plan.status === 'completed' ? 'Completed' : 'Stopped'}{plan.endedAt ? ` on ${formatDate(toIso(new Date(plan.endedAt)), { year: true })}` : ''}. Your timeline is kept here for reference.
          </p>
        ) : (
          <ProgressBlock plan={plan} today={today} />
        )}
        {plan.note && <p className={s.note}>{plan.note}</p>}
      </Card>
    </>
  );
}
