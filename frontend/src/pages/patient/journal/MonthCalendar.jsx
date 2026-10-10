// Month calendar (Monday first). Each logged day shows a mood dot and a fever marker;
// with cycle tracking on it also shows logged period days, predicted periods,
// the fertile window and the estimated ovulation day.
import { useMemo } from 'react';
import { ChevronLeft, ChevronRight, Thermometer } from 'lucide-react';
import { IconButton, Button } from '../../../components/ui';
import { monthGrid, formatMonth, addMonths, addDays, monthKey as toMonthKey, formatShort } from './dates';
import { BLEEDING, FEVER_C, MOODS, labelOf, moodTone } from './journalModel';
import s from './Journal.module.css';

const cx = (...p) => p.filter(Boolean).join(' ');
const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// date → { predicted, fertile, ovulation } from the cycle summary
function cycleMarks(summary, today) {
  const marks = {};
  if (!summary?.hasData || !summary.predictions) return marks;
  const mark = (d, key) => { marks[d] = { ...marks[d], [key]: true }; };
  const { predictions, avgPeriod } = summary;
  const upcoming = predictions.upcoming?.length
    ? predictions.upcoming
    : [{ start: predictions.nextPeriodStart, end: addDays(predictions.nextPeriodStart, (avgPeriod || 5) - 1) }];
  upcoming.forEach((p, i) => {
    for (let d = p.start; d <= p.end; d = addDays(d, 1)) if (d >= today) mark(d, 'predicted');
    const ov = i === 0 && predictions.ovulation ? predictions.ovulation : addDays(p.start, -14);
    const fs = i === 0 && predictions.fertileWindow ? predictions.fertileWindow.start : addDays(ov, -5);
    const fe = i === 0 && predictions.fertileWindow ? predictions.fertileWindow.end : addDays(ov, 1);
    for (let d = fs; d <= fe; d = addDays(d, 1)) mark(d, 'fertile');
    mark(ov, 'ovulation');
  });
  return marks;
}

export default function MonthCalendar({ month, onMonthChange, entries, today, cycleSummary, showCycle, onPick, busy }) {
  const grid = useMemo(() => monthGrid(month), [month]);
  const byDate = useMemo(() => Object.fromEntries((entries || []).map((e) => [e.date, e])), [entries]);
  const marks = useMemo(() => (showCycle ? cycleMarks(cycleSummary, today) : {}), [showCycle, cycleSummary, today]);
  const thisMonth = toMonthKey(today);

  return (
    <div className={s.calendar} aria-busy={busy || undefined}>
      <div className={s.calHead}>
        <h2 className={s.calTitle} aria-live="polite">{formatMonth(month)}</h2>
        <div className={s.calNav}>
          {month !== thisMonth && (
            <Button variant="ghost" size="sm" onClick={() => onMonthChange(thisMonth)}>Today</Button>
          )}
          <IconButton icon={ChevronLeft} label="Previous month" onClick={() => onMonthChange(addMonths(month, -1))} />
          <IconButton icon={ChevronRight} label="Next month" onClick={() => onMonthChange(addMonths(month, 1))} />
        </div>
      </div>

      <div className={s.calGrid} role="grid" aria-label={formatMonth(month)}>
        <div className={s.calRow} role="row">
          {WEEKDAYS.map((w) => <span key={w} role="columnheader" className={s.calWeekday} aria-label={w}>{w.slice(0, 1)}<span className={s.wdRest}>{w.slice(1)}</span></span>)}
        </div>
        {Array.from({ length: grid.days.length / 7 }, (_, r) => (
          <div key={r} className={s.calRow} role="row">
            {grid.days.slice(r * 7, r * 7 + 7).map((d) => {
              const e = byDate[d];
              const m = marks[d] || {};
              const future = d > today;
              const outside = toMonthKey(d) !== month;
              const flow = showCycle && e?.period?.flow;
              const bleeding = flow && BLEEDING.includes(flow);
              const spotting = flow === 'spotting';
              const fever = typeof e?.temperature === 'number' && e.temperature >= FEVER_C;
              const tone = moodTone(e?.mood);
              const predicted = m.predicted && !bleeding;
              const fertile = m.fertile && !bleeding && !predicted;

              const label = [
                formatShort(d, { weekday: 'long', month: 'long' }),
                d === today && 'today',
                e ? (e.mood ? `mood ${labelOf(MOODS, e.mood).toLowerCase()}` : 'logged') : !future && 'not logged',
                bleeding && 'period',
                spotting && 'spotting',
                fever && `temperature ${e.temperature} °C`,
                predicted && 'predicted period',
                fertile && 'fertile window',
                m.ovulation && 'estimated ovulation'
              ].filter(Boolean).join(', ');

              return (
                <div key={d} role="gridcell" className={cx(s.calCell, fertile && s.calFertile)}>
                  <button
                    type="button"
                    className={cx(
                      s.calDay,
                      outside && s.calOutside,
                      d === today && s.calToday,
                      bleeding && s.calPeriod,
                      predicted && s.calPredicted
                    )}
                    disabled={future}
                    onClick={() => onPick(d)}
                    aria-label={label}
                  >
                    <span className={s.calNum}>{Number(d.slice(8))}</span>
                    <span className={s.calMarks} aria-hidden="true">
                      {tone && <span className={cx(s.dot, s[`dot_${tone}`])} />}
                      {!tone && e && <span className={cx(s.dot, s.dot_none)} />}
                      {spotting && <span className={cx(s.dot, s.dot_period)} />}
                    </span>
                    {fever && <Thermometer size={10} strokeWidth={2.5} className={s.calFever} aria-hidden="true" />}
                    {m.ovulation && !bleeding && <span className={s.calOvulation} aria-hidden="true" />}
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <ul className={s.legend} aria-label="Legend">
        <li><span className={cx(s.dot, s.dot_good)} />Good mood</li>
        <li><span className={cx(s.dot, s.dot_mid)} />Okay</li>
        <li><span className={cx(s.dot, s.dot_low)} />Low</li>
        <li><Thermometer size={12} strokeWidth={2.5} className={s.legendFever} aria-hidden="true" />38 °C or more</li>
        {showCycle && (
          <>
            <li><span className={s.lgPeriod} />Period</li>
            <li><span className={s.lgPredicted} />Predicted</li>
            <li><span className={s.lgFertile} />Fertile window</li>
            <li><span className={s.lgOvulation} />Ovulation</li>
          </>
        )}
      </ul>
    </div>
  );
}
