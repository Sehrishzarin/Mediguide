// Doctor summary: a printable overview of the last 7 / 14 / 30 days of the journal.
import { useState } from 'react';
import { Printer, Share2, Check, FileText } from 'lucide-react';
import { getJournalReport } from '../../../services/api';
import { Button, Card, EmptyState, ErrorState, PageHeader, Segmented, Skeleton } from '../../../components/ui';
import { useBack } from '../monitoring/hooks';
import { useLoad } from './journalStore';
import { ageFrom, formatDay, formatShort } from './dates';
import { MOODS, ENERGY, PAIN, FEVER_C, labelOf } from './journalModel';
import s from './Journal.module.css';

const RANGES = [7, 14, 30];
const PLAN_TITLES = { pregnancy: 'Pregnancy', tb: 'TB treatment', chemo: 'Chemotherapy', diabetes: 'Diabetes', hypertension: 'High blood pressure', asthma: 'Asthma' };
const planTitle = (type) => PLAN_TITLES[type] || (type ? type[0].toUpperCase() + type.slice(1) : 'Care plan');

function Bar({ label, value, max, min = 0, scale }) {
  const pct = value === null || value === undefined ? 0 : ((value - min) / (max - min)) * 100;
  const word = value === null || value === undefined ? 'Not logged' : `${value} of ${max}${scale ? ` (${labelOf(scale, Math.round(value)).toLowerCase()})` : ''}`;
  return (
    <div className={s.bar}>
      <div className={s.barTop}><span>{label}</span><span className={s.barValue}>{word}</span></div>
      <span className={s.barTrack} aria-hidden="true"><span className={s.barFill} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} /></span>
    </div>
  );
}

function textSummary(r) {
  const lines = [];
  const p = r.patient;
  lines.push(`Health journal summary: ${p.name || 'Patient'}`);
  lines.push(`${formatDay(r.range.from)} to ${formatDay(r.range.to)} (${r.range.daysLogged} of ${r.range.days} days logged)`);
  if (p.allergies?.length) lines.push(`Allergies: ${p.allergies.join(', ')}`);
  if (p.conditions?.length) lines.push(`Conditions: ${p.conditions.join(', ')}`);
  if (p.medications?.length) lines.push(`Medications: ${p.medications.join('; ')}`);
  const a = r.averages;
  lines.push(`Average mood ${a.mood ?? '-'} / 5, energy ${a.energy ?? '-'} / 5, pain ${a.pain ?? '-'} / 5`);
  if (r.temperature) lines.push(`Highest temperature ${r.temperature.max} °C, ${r.temperature.daysWithFever} day(s) with fever`);
  if (r.topSymptoms?.length) lines.push(`Symptoms: ${r.topSymptoms.map((x) => `${x.name} (${x.count})`).join(', ')}`);
  r.plans?.forEach((pl) => lines.push(`${planTitle(pl.type)} plan${pl.adherence !== null && pl.adherence !== undefined ? `: medicines taken ${pl.adherence}% of logged days` : ''}`));
  lines.push('Patient-reported data from MediGuide. Not a diagnosis.');
  return lines.join('\n');
}

export default function DoctorReport() {
  const back = useBack('/patient/journal/calendar');
  const [days, setDays] = useState(14);
  const [shared, setShared] = useState('');
  const report = useLoad(`report:${days}`, () => getJournalReport(days).then((r) => r.data), "We couldn't build your summary.");
  const r = report.data;

  const share = async () => {
    if (!r) return;
    const text = textSummary(r);
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Health journal summary', text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setShared('Summary copied. Paste it into a message to your doctor.');
    } catch (err) {
      if (err?.name === 'AbortError') return;
      try {
        await navigator.clipboard.writeText(text);
        setShared('Summary copied. Paste it into a message to your doctor.');
      } catch {
        setShared("Sharing isn't available here. Use Print / Save as PDF instead.");
      }
    }
  };

  const age = r ? ageFrom(r.patient.dateOfBirth, r.range.to) : null;

  return (
    <div className={`${s.page} ${s.reportPage}`}>
      <PageHeader title="Summary for your doctor" subtitle="Share what you've logged before a visit" onBack={back} className={s.noPrint} />

      <div className={`${s.reportControls} ${s.noPrint}`}>
        <Segmented
          label="Time range"
          options={RANGES.map((d) => ({ value: d, label: `${d} days` }))}
          value={days}
          onChange={(v) => { setDays(v); setShared(''); }}
          className={s.rangeTabs}
        />
        <div className={s.actionRow}>
          <Button icon={Printer} onClick={() => window.print()} disabled={!r}>Print / Save as PDF</Button>
          <Button variant="secondary" icon={shared ? Check : Share2} onClick={share} disabled={!r}>Share</Button>
        </div>
        {shared && <p className={s.cardText} role="status">{shared}</p>}
      </div>

      {report.status === 'loading' && (
        <div className={s.stack} aria-busy="true" aria-label="Loading summary">
          <Skeleton height={120} radius="var(--r-lg)" />
          <Skeleton height={180} radius="var(--r-lg)" />
          <Skeleton height={220} radius="var(--r-lg)" />
        </div>
      )}
      {report.status === 'error' && <Card><ErrorState message={report.error} onRetry={report.retry} /></Card>}

      {r && (
        <Card as="article" className={s.report} aria-label="Health journal summary">
          <header className={s.reportHead}>
            <div>
              <p className={s.metaLabel}>Health journal summary</p>
              <h2 className={s.reportName}>{r.patient.name}</h2>
              <p className={s.cardText}>
                {[age !== null ? `${age} years` : null, r.patient.gender].filter(Boolean).join(' · ') || 'Age and gender not set'}
              </p>
            </div>
            <div className={s.reportRange}>
              <p className={s.metaLabel}>Dates</p>
              <p className={s.reportRangeText}>{formatDay(r.range.from)} – {formatDay(r.range.to)}</p>
              <p className={s.cardText}>{r.range.daysLogged} of {r.range.days} days logged</p>
            </div>
          </header>

          <dl className={s.reportFacts}>
            <div><dt>Allergies</dt><dd>{r.patient.allergies?.length ? r.patient.allergies.join(', ') : 'None recorded'}</dd></div>
            <div><dt>Conditions</dt><dd>{r.patient.conditions?.length ? r.patient.conditions.join(', ') : 'None recorded'}</dd></div>
            <div><dt>Medications</dt><dd>{r.patient.medications?.length ? r.patient.medications.join('; ') : 'None recorded'}</dd></div>
          </dl>

          {r.range.daysLogged === 0 ? (
            <EmptyState
              compact
              icon={FileText}
              title="Nothing logged in this period"
              text="Log a few days in your journal and your summary will appear here."
              action={<Button variant="secondary" size="sm" to="/patient/journal/calendar" className={s.noPrint}>Open journal</Button>}
            />
          ) : (
            <>
              <section className={s.reportSection}>
                <h3 className={s.reportH}>Averages</h3>
                <div className={s.bars}>
                  <Bar label="Mood" value={r.averages.mood} min={1} max={5} scale={MOODS} />
                  <Bar label="Energy" value={r.averages.energy} min={1} max={5} scale={ENERGY} />
                  <Bar label="Pain" value={r.averages.pain} min={0} max={5} scale={PAIN} />
                </div>
              </section>

              <div className={s.reportTwo}>
                <section className={s.reportSection}>
                  <h3 className={s.reportH}>Temperature</h3>
                  {r.temperature ? (
                    <p className={s.reportText}>Highest {r.temperature.max} °C · {r.temperature.daysWithFever} {r.temperature.daysWithFever === 1 ? 'day' : 'days'} at 38 °C or more</p>
                  ) : <p className={s.reportText}>Not recorded</p>}
                </section>
                <section className={s.reportSection}>
                  <h3 className={s.reportH}>Most common symptoms</h3>
                  {r.topSymptoms?.length ? (
                    <ul className={s.symptomList}>
                      {r.topSymptoms.map((x) => <li key={x.name}><span>{x.name}</span><span className={s.barValue}>{x.count} {x.count === 1 ? 'day' : 'days'}</span></li>)}
                    </ul>
                  ) : <p className={s.reportText}>None logged</p>}
                </section>
              </div>

              {r.plans?.length > 0 && (
                <section className={s.reportSection}>
                  <h3 className={s.reportH}>Active care plans</h3>
                  <ul className={s.symptomList}>
                    {r.plans.map((pl, i) => (
                      <li key={`${pl.type}-${i}`}>
                        <span>{planTitle(pl.type)}{pl.startDate ? ` · since ${formatDay(String(pl.startDate).slice(0, 10))}` : ''}</span>
                        <span className={s.barValue}>{pl.adherence !== null && pl.adherence !== undefined ? `Medicines taken: ${pl.adherence}%` : ''}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section className={s.reportSection}>
                <h3 className={s.reportH}>Day by day</h3>
                <div className={s.tableWrap}>
                  <table className={s.table}>
                    <thead>
                      <tr><th scope="col">Date</th><th scope="col">Mood</th><th scope="col">Energy</th><th scope="col">Pain</th><th scope="col">Temp</th><th scope="col">Symptoms and notes</th></tr>
                    </thead>
                    <tbody>
                      {r.entries.slice().reverse().map((e) => (
                        <tr key={e.date}>
                          <th scope="row">{formatShort(e.date)}</th>
                          <td>{e.mood ?? '–'}</td>
                          <td>{e.energy ?? '–'}</td>
                          <td>{e.pain ?? '–'}</td>
                          <td className={typeof e.temperature === 'number' && e.temperature >= FEVER_C ? s.tdFever : undefined}>{typeof e.temperature === 'number' ? `${e.temperature}°` : '–'}</td>
                          <td className={s.tdNotes}>{[(e.symptoms || []).join(', '), e.notes].filter(Boolean).join(' — ') || '–'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className={s.cardText}>Mood and energy: 1 (lowest) to 5 (best). Pain: 0 (none) to 5 (worst).</p>
              </section>
            </>
          )}

          <p className={s.disclaimer}>Patient-reported information from the MediGuide health journal. It is not a diagnosis and does not replace a medical examination.</p>
        </Card>
      )}
    </div>
  );
}
