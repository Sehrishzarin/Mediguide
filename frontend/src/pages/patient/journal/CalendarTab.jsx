import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CheckCircle2, FileText, CalendarDays, Thermometer } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { getJournalEntries } from '../../../services/api';
import { Alert, Button, Card, EmptyState, ErrorState, List, ListItem, SectionHeader, Skeleton } from '../../../components/ui';
import { useCycle, useJournalToday, useLoad, cycleFlags } from './journalStore';
import { localIso, monthGrid, monthKey, relativeDay } from './dates';
import { entrySummary, FEVER_C } from './journalModel';
import TodayCard from './TodayCard';
import MonthCalendar from './MonthCalendar';
import JournalAlerts from './JournalAlerts';
import { MoodFace } from './MoodFaces';
import s from './Journal.module.css';

function RecentDays({ today, showCycle }) {
  const recent = useLoad('recent', () => getJournalEntries().then((r) => r.data.entries), "We couldn't load your recent days.");
  const items = useMemo(
    () => (recent.data || []).slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 7),
    [recent.data]
  );

  return (
    <section aria-labelledby="recent-days-h">
      <SectionHeader title={<span id="recent-days-h">Recent days</span>} />
      {recent.status === 'loading' && (
        <div className={s.stack} aria-busy="true" aria-label="Loading recent days">
          <Skeleton height={64} radius="var(--r-lg)" />
          <Skeleton height={64} radius="var(--r-lg)" />
        </div>
      )}
      {recent.status === 'error' && <Card><ErrorState compact message={recent.error} onRetry={recent.retry} /></Card>}
      {recent.status === 'ready' && items.length === 0 && (
        <Card>
          <EmptyState
            compact
            icon={CalendarDays}
            title="No days logged yet"
            text="Log today, or tap a past day on the calendar to fill it in."
          />
        </Card>
      )}
      {recent.status === 'ready' && items.length > 0 && (
        <List>
          {items.map((e) => (
            <ListItem
              key={e.date}
              to={`/patient/journal/log/${e.date}`}
              leading={e.mood ? <MoodFace mood={e.mood} className={s.listFace} /> : <span className={s.listFaceEmpty} aria-hidden="true"><CalendarDays size={18} /></span>}
              title={relativeDay(e.date, today)}
              subtitle={entrySummary(e, { cycle: showCycle })}
              meta={typeof e.temperature === 'number' && e.temperature >= FEVER_C
                ? <span className={s.feverMeta}><Thermometer size={14} aria-hidden="true" />{e.temperature}°</span>
                : undefined}
            />
          ))}
        </List>
      )}
    </section>
  );
}

export default function CalendarTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const todaySnap = useJournalToday(user);
  const cycleRes = useCycle(user);
  const cycle = cycleFlags(cycleRes);
  // Server date is the source of truth; until it arrives use the device's date
  const [deviceToday] = useState(() => localIso());
  const today = todaySnap.data?.date || deviceToday;
  const [pickedMonth, setPickedMonth] = useState(null);
  const month = pickedMonth || monthKey(today);
  const grid = useMemo(() => monthGrid(month), [month]);

  const entries = useLoad(
    `entries:${grid.start}:${grid.end}`,
    () => getJournalEntries(grid.start, grid.end).then((r) => r.data.entries),
    "We couldn't load this month."
  );

  const saved = location.state?.saved;
  const dismissSaved = () => navigate(location.pathname, { replace: true, state: null });

  return (
    <div className={s.tabBody}>
      {saved && (
        <Alert
          tone="success"
          icon={CheckCircle2}
          title={saved === 'deleted' ? 'Entry deleted' : 'Saved to your journal'}
          action={<Button variant="ghost" size="sm" onClick={dismissSaved}>Dismiss</Button>}
        />
      )}

      {todaySnap.status === 'ready' && <JournalAlerts alerts={todaySnap.data.alerts} />}

      <div className={s.calLayout}>
        <div className={s.calMain}>
          <TodayCard />
          <Card className={s.calendarCard}>
            <MonthCalendar
              month={month}
              onMonthChange={setPickedMonth}
              entries={entries.data}
              busy={entries.status === 'loading'}
              today={today}
              showCycle={cycle.active}
              cycleSummary={cycle.active ? cycleRes.data.summary : null}
              onPick={(d) => navigate(`/patient/journal/log/${d}`)}
            />
            {entries.status === 'error' && <ErrorState compact message={entries.error} onRetry={entries.retry} />}
          </Card>
        </div>
        <div className={s.calSide}>
          <RecentDays today={today} showCycle={cycle.active} />
          <Button variant="secondary" block icon={FileText} to="/patient/journal/report">Summary for your doctor</Button>
        </div>
      </div>
    </div>
  );
}
