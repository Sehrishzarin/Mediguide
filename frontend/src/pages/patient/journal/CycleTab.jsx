import { useState } from 'react';
import { Droplet, CalendarCheck2, Info, Settings2, Sparkles, CheckCircle2, Baby, History as HistoryIcon } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { getJournalToday, getJournalEntries, saveJournalEntry } from '../../../services/api';
import friendlyError from '../../../utils/friendlyError';
import { Alert, Badge, Button, Card, EmptyState, ErrorState, List, ListItem, SectionHeader, Skeleton } from '../../../components/ui';
import { useCycle, cycleFlags, saveEntry, refreshJournal } from './journalStore';
import { addDays, daysBetween, formatDay, formatRange, formatShort } from './dates';
import { BLEEDING, entryBody } from './journalModel';
import s from './Journal.module.css';

const ACCURACY = { estimate: 'Estimate', learning: 'Learning your cycle', good: 'Based on your history' };
const R = 80;
const C = 2 * Math.PI * R;

// Cycle ring: period days, fertile window, ovulation and today on a circle of `length` days
function CycleRing({ summary }) {
  const { cycleDay, avgCycle, avgPeriod, lastPeriod, predictions } = summary;
  const length = Math.max(avgCycle, cycleDay);
  const arc = (fromDay, toDay) => {
    const a = Math.max(1, fromDay);
    const b = Math.min(length, toDay);
    if (b < a) return null;
    const start = ((a - 1) / length) * C;
    const len = ((b - a + 1) / length) * C;
    return { dasharray: `${Math.max(len - 2, 1)} ${C}`, dashoffset: -start - 1 };
  };
  const periodLen = lastPeriod?.length || avgPeriod;
  const period = arc(1, Math.max(periodLen, 1));
  const fwStart = daysBetween(lastPeriod.start, predictions.fertileWindow.start) + 1;
  const fwEnd = daysBetween(lastPeriod.start, predictions.fertileWindow.end) + 1;
  const fertile = arc(fwStart, fwEnd);
  const pos = (day) => {
    const angle = (((day - 0.5) / length) * 360 - 90) * (Math.PI / 180);
    return { x: 100 + R * Math.cos(angle), y: 100 + R * Math.sin(angle) };
  };
  const ovDay = daysBetween(lastPeriod.start, predictions.ovulation) + 1;
  const ov = ovDay >= 1 && ovDay <= length ? pos(ovDay) : null;
  const now = pos(Math.min(cycleDay, length));

  return (
    <svg viewBox="0 0 200 200" className={s.ring} role="img" aria-label={`Cycle day ${cycleDay} of about ${avgCycle}`}>
      <circle cx="100" cy="100" r={R} className={s.ringTrack} />
      {period && <circle cx="100" cy="100" r={R} className={s.ringPeriod} strokeDasharray={period.dasharray} strokeDashoffset={period.dashoffset} transform="rotate(-90 100 100)" />}
      {fertile && <circle cx="100" cy="100" r={R} className={s.ringFertile} strokeDasharray={fertile.dasharray} strokeDashoffset={fertile.dashoffset} transform="rotate(-90 100 100)" />}
      {ov && <circle cx={ov.x} cy={ov.y} r="4" className={s.ringOvulation} />}
      <circle cx={now.x} cy={now.y} r="11" className={s.ringToday} />
      <text x="100" y="94" textAnchor="middle" className={s.ringDay}>Day {cycleDay}</text>
      <text x="100" y="118" textAnchor="middle" className={s.ringOf}>of about {avgCycle}</text>
    </svg>
  );
}

function headline(summary) {
  const { phase, cycleDay, predictions, late } = summary;
  if (late) return { title: `Period is ${late.days} days late`, sub: 'Cycles can vary with stress, illness or travel.' };
  if (phase === 'period') return { title: `Period day ${cycleDay}`, sub: `Next period expected around ${formatDay(predictions.nextPeriodStart)}.` };
  if (phase === 'fertile') return { title: 'Fertile window', sub: `Ovulation estimated ${formatShort(predictions.ovulation)}.` };
  const n = predictions.daysUntilNext;
  if (n > 1) return { title: `Period in ${n} days`, sub: `Expected ${formatShort(predictions.nextPeriodStart)}.` };
  if (n === 1) return { title: 'Period expected tomorrow', sub: formatShort(predictions.nextPeriodStart) };
  if (n === 0) return { title: 'Period expected today', sub: 'Log it when it starts.' };
  return { title: 'Period may start any day', sub: `It was expected ${formatShort(predictions.nextPeriodStart)}.` };
}

// Quick actions: log today's period (keeps the rest of today's entry), or mark it ended
function QuickActions({ summary, onChanged }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [askEnd, setAskEnd] = useState(false);

  const last = summary?.hasData ? summary.lastPeriod : null;
  // 'period' phase means today falls on the last logged period day (future days can't be logged)
  const loggedToday = summary?.phase === 'period';

  const run = async (kind, fn) => {
    setBusy(kind); setError(''); setDone('');
    try {
      const msg = await fn();
      setDone(msg);
      setAskEnd(false);
      onChanged();
    } catch (err) {
      setError(friendlyError(err, "We couldn't update your period. Please try again."));
    } finally {
      setBusy('');
    }
  };

  const logToday = () => run('log', async () => {
    const { data } = await getJournalToday();
    const body = entryBody(data.entry || {});
    if (!BLEEDING.includes(body.period.flow)) body.period = { flow: 'medium' };
    await saveEntry(data.date, body);
    return 'Period logged for today.';
  });

  // Marks every day from the period start to the chosen end as a period day, and
  // clears a period logged after it.
  const endOn = (which) => run(which, async () => {
    const { data } = await getJournalToday();
    const today = data.date;
    const end = which === 'yesterday' ? addDays(today, -1) : today;
    const res = await getJournalEntries(last.start, today);
    const byDate = Object.fromEntries(res.data.entries.map((e) => [e.date, e]));
    for (let d = last.start; d <= today; d = addDays(d, 1)) {
      const e = byDate[d];
      const flow = e?.period?.flow || 'none';
      if (d <= end && !BLEEDING.includes(flow)) {
        await saveJournalEntry(d, { ...entryBody(e || {}), period: { flow: 'light' } });
      } else if (d > end && e && BLEEDING.includes(flow)) {
        await saveJournalEntry(d, { ...entryBody(e), period: { flow: 'none' } });
      }
    }
    await refreshJournal();
    return `Got it. Your period ended ${which}.`;
  });

  const today = summary?.hasData ? addDays(summary.lastPeriod.start, summary.cycleDay - 1) : null;
  const canEnd = last && today && daysBetween(last.start, today) <= 10 && daysBetween(last.end, today) <= 3;

  return (
    <div className={s.stackSm}>
      <div className={s.actionRow}>
        <Button icon={Droplet} onClick={logToday} loading={busy === 'log'} disabled={Boolean(busy) || loggedToday}>
          {loggedToday ? 'Period logged today' : 'Log period today'}
        </Button>
        {canEnd && (
          <Button variant="secondary" icon={CalendarCheck2} onClick={() => setAskEnd((v) => !v)} disabled={Boolean(busy)} aria-expanded={askEnd}>
            Period ended
          </Button>
        )}
      </div>
      {askEnd && (
        <div className={s.endAsk} role="group" aria-label="When did your period end?">
          <span className={s.cardText}>When was your last period day?</span>
          <div className={s.actionRow}>
            {last.start < today && (
              <Button size="sm" variant="secondary" onClick={() => endOn('yesterday')} loading={busy === 'yesterday'} disabled={Boolean(busy)}>Yesterday</Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => endOn('today')} loading={busy === 'today'} disabled={Boolean(busy)}>Today</Button>
          </div>
        </div>
      )}
      {done && <Alert tone="success" icon={CheckCircle2} title={done} />}
      {error && <Alert tone="danger" title={error} />}
    </div>
  );
}

function PeriodHistory({ summary }) {
  const periods = summary.periods || [];
  if (!periods.length) return null;
  return (
    <section aria-labelledby="cycle-history-h">
      <SectionHeader title={<span id="cycle-history-h">History</span>} />
      <List>
        {periods.map((p, i) => {
          const newer = periods[i - 1];
          const cycleLen = newer ? daysBetween(p.start, newer.start) : null;
          return (
            <ListItem
              key={p.start}
              icon={i === 0 ? Droplet : HistoryIcon}
              iconTone={i === 0 ? 'brand' : 'neutral'}
              title={formatRange(p.start, p.end)}
              subtitle={`Period: ${p.length} ${p.length === 1 ? 'day' : 'days'}${cycleLen ? ` · Cycle: ${cycleLen} days` : ` · Current cycle: day ${summary.cycleDay}`}`}
            />
          );
        })}
      </List>
    </section>
  );
}

export default function CycleTab() {
  const { user } = useAuth();
  const cycleRes = useCycle(user);
  const cycle = cycleFlags(cycleRes);

  if (cycleRes.status === 'loading') {
    return (
      <div className={s.stack} aria-busy="true" aria-label="Loading your cycle">
        <Skeleton height={280} radius="var(--r-lg)" />
        <Skeleton height={120} radius="var(--r-lg)" />
      </div>
    );
  }
  if (cycleRes.status === 'error') return <Card><ErrorState message={cycleRes.error} onRetry={cycleRes.retry} /></Card>;

  if (cycle.paused) {
    return (
      <Card>
        <EmptyState icon={Baby} title="Cycle tracking is paused during pregnancy" text="It will be back when your pregnancy plan ends." />
      </Card>
    );
  }

  const summary = cycleRes.data.summary;
  const refresh = () => cycleRes.retry();

  if (!summary?.hasData) {
    return (
      <div className={s.tabBody}>
        <Card>
          <EmptyState
            icon={Droplet}
            title="Start tracking your cycle"
            text="Log the days of your period from the calendar or here. After one period you'll see your next period and fertile window."
            action={<QuickActions summary={summary} onChanged={refresh} />}
          />
        </Card>
        <p className={s.disclaimer}>Predictions are estimates and are not a method of contraception.</p>
        <Button variant="ghost" icon={Settings2} to="/patient/profile?section=journal">Cycle settings</Button>
      </div>
    );
  }

  const h = headline(summary);
  const p = summary.predictions;

  return (
    <div className={s.tabBody}>
      <div className={s.cycleLayout}>
        <Card className={s.cycleHero}>
          <CycleRing summary={summary} />
          <div className={s.cycleHeadline}>
            <h2 className={s.cycleTitle}>{h.title}</h2>
            <p className={s.cardText}>{h.sub}</p>
            {summary.late && (
              <p className={s.cardText}>If there's a chance you're pregnant, consider a pregnancy test.</p>
            )}
          </div>
          <ul className={s.ringLegend} aria-label="Ring legend">
            <li><span className={s.lgPeriod} />Period</li>
            <li><span className={s.lgFertile} />Fertile window</li>
            <li><span className={s.lgOvulation} />Ovulation</li>
          </ul>
          <QuickActions summary={summary} onChanged={refresh} />
        </Card>

        <div className={s.stack}>
          {summary.irregular && (
            <Alert tone="info" icon={Info} title="Your cycles vary quite a bit">
              Predictions are less certain when cycles change by more than a week.
            </Alert>
          )}
          <Card>
            <dl className={s.facts}>
              <div><dt>Next period</dt><dd>{formatShort(p.nextPeriodStart)}</dd></div>
              <div><dt>Fertile window</dt><dd>{formatRange(p.fertileWindow.start, p.fertileWindow.end)}</dd></div>
              <div><dt>Average cycle</dt><dd>{summary.avgCycle} days</dd></div>
              <div><dt>Average period</dt><dd>{summary.avgPeriod} days</dd></div>
            </dl>
            <div className={s.accuracyRow}>
              <Badge tone={summary.accuracy === 'good' ? 'brand' : 'neutral'} icon={Sparkles}>{ACCURACY[summary.accuracy] || 'Estimate'}</Badge>
              {summary.message && <p className={s.cardText}>{summary.message}</p>}
            </div>
            <p className={s.disclaimer}>Predictions are estimates and are not a method of contraception.</p>
          </Card>
          <PeriodHistory summary={summary} />
          <Button variant="ghost" icon={Settings2} to="/patient/profile?section=journal">Cycle settings</Button>
        </div>
      </div>
    </div>
  );
}
