// Nura Check-In setup: schedule, alert window, duration, overnight, contacts, start.
import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { HeartPulse, MapPin, Info, Play, Phone, Gauge } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Alert, Badge, Button, Card, PageHeader, Segmented, Switch } from '../../../components/ui';
import { getCheckInContacts } from '../../../services/api';
import friendlyError from '../../../utils/friendlyError';
import { useMonitoring, start as startMonitoring } from './monitoringStore';
import { requestNotificationPermission } from './notifications';
import { INTERVALS, ALERT_AFTER, DURATIONS, normalizeReason, reasonLabel } from './format';
import { useBack } from './hooks';
import { readDraft, saveDraft, clearDraft } from './setupDraft';
import ContactsEditor from './ContactsEditor';
import s from './Monitoring.module.css';

const DEFAULTS = { intervalMin: 240, alertAfterMin: 30, duration: '1440', overnight: true, demoSpeed: false };

const fromMonitoring = (m) => ({
  intervalMin: m.intervalMin,
  alertAfterMin: m.alertAfterMin,
  duration: m.durationMin ? String(m.durationMin) : 'until',
  overnight: m.overnight,
  demoSpeed: m.demoSpeed
});

export default function MonitoringSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const mon = useMonitoring(user?.id);
  const active = mon.data;

  const [savedDraft] = useState(readDraft);
  const routeState = location.state || {};
  const reason = normalizeReason(routeState.reason || params.get('reason') || active?.reason || savedDraft?.reason);
  const fromCheck = (routeState.from || params.get('from')) === 'symptom-check';

  const [settings, setSettings] = useState(() => savedDraft?.settings || (active ? fromMonitoring(active) : DEFAULTS));
  const change = (key) => (value) => {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveDraft({ reason, settings: next });
  };

  // Contacts
  const [contacts, setContacts] = useState(null);
  const [cStatus, setCStatus] = useState('loading');
  const [cError, setCError] = useState('');
  const [nonce, setNonce] = useState(0);
  const loadContacts = useCallback(() => getCheckInContacts(), []);

  useEffect(() => {
    let cancelled = false;
    loadContacts()
      .then((res) => { if (!cancelled) { setContacts(res.data || []); setCStatus('ready'); } })
      .catch((err) => { if (!cancelled) { setCError(friendlyError(err, "We couldn't load your contacts.")); setCStatus('error'); } });
    return () => { cancelled = true; };
  }, [loadContacts, nonce]);

  // While someone hasn't replied yet, check now and then (and when the app comes back)
  const anyPending = (contacts || []).some((c) => c.consent === 'pending');
  useEffect(() => {
    if (!anyPending) return undefined;
    let cancelled = false;
    const refresh = () => loadContacts().then((res) => { if (!cancelled) setContacts(res.data || []); }).catch(() => {});
    const id = setInterval(refresh, 5000);
    const onVisible = () => { if (document.visibilityState === 'visible') refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { cancelled = true; clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [anyPending, loadContacts]);

  const retryContacts = () => { setCStatus('loading'); setNonce((n) => n + 1); };

  // Start
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');
  const agreed = (contacts || []).filter((c) => c.consent === 'agreed');
  const canStart = agreed.length > 0 && !starting;

  const begin = async () => {
    setStarting(true);
    setStartError('');
    try {
      await requestNotificationPermission();
      await startMonitoring({
        reason,
        intervalMin: settings.intervalMin,
        alertAfterMin: settings.alertAfterMin,
        durationMin: settings.duration === 'until' ? null : Number(settings.duration),
        overnight: settings.overnight,
        demoSpeed: Boolean(settings.demoSpeed && mon.demoSpeedAllowed)
      });
      clearDraft();
      navigate('/patient/monitoring', { replace: true });
    } catch (err) {
      setStartError(friendlyError(err, "We couldn't start monitoring. Please try again."));
      setStarting(false);
    }
  };

  const back = useBack(active ? '/patient/monitoring' : '/patient/home');
  const half = Math.round(settings.alertAfterMin / 2);

  return (
    <div className={s.page}>
      <PageHeader title="Nura Check-In" onBack={back} />

      <div className={s.setup}>
        {fromCheck && (
          <div className={s.fromChip}>
            <Badge tone="brand" icon={HeartPulse} className={s.fromBadge}>
              From your {reasonLabel(reason)} check · Manage at home
            </Badge>
          </div>
        )}

        <div className={s.intro}>
          <h2 className={s.heroTitle}>Let Nura keep an eye on you</h2>
          <p className={s.heroText}>Nura will check in on a schedule. If you don't answer, she'll reach someone you trust.</p>
        </div>

        {active && (
          <Alert tone="info" icon={Info} title="Nura Check-In is already on">
            Starting again replaces your current schedule.
          </Alert>
        )}

        <Card padding="md" className={s.options}>
          <div className={s.option}>
            <p className={s.optionLabel}>Check in with me every</p>
            <Segmented label="Check in with me every" options={INTERVALS} value={settings.intervalMin} onChange={change('intervalMin')} />
          </div>

          <div className={s.option}>
            <p className={s.optionLabel}>If I don't reply, alert my contact after</p>
            <Segmented label="If I don't reply, alert my contact after" options={ALERT_AFTER} value={settings.alertAfterMin} onChange={change('alertAfterMin')} />
            <p className={s.note}>
              <Info size={16} aria-hidden="true" />
              <span>Before anyone is alerted, Nura sends a louder reminder at {half} min and then calls your phone.</span>
            </p>
          </div>

          <div className={s.option}>
            <p className={s.optionLabel}>Keep monitoring for</p>
            <Segmented label="Keep monitoring for" options={DURATIONS} value={settings.duration} onChange={change('duration')} />
          </div>

          <div className={s.optionSwitch}>
            <Switch
              checked={settings.overnight}
              onChange={change('overnight')}
              label="Check in overnight"
              description={settings.overnight ? 'On: Nura checks in while you sleep too' : 'Off: no check-ins between 10 PM and 7 AM'}
            />
          </div>
        </Card>

        <section className={s.section} aria-labelledby="cc-h">
          <div className={s.sectionHead}>
            <h2 id="cc-h" className={s.sectionTitle}>Emergency contacts</h2>
            <span className={s.meta}>Up to 3</span>
          </div>
          <Card padding="md">
            <ContactsEditor contacts={contacts} status={cStatus} error={cError} onRetry={retryContacts} onChange={setContacts} />
          </Card>
          <p className={s.privacy}>
            <MapPin size={16} aria-hidden="true" />
            <span>Your location is shared only if an alert goes out.</span>
          </p>
        </section>

        {mon.demoSpeedAllowed && (
          <Card padding="md" className={s.demoCard}>
            <Switch
              checked={settings.demoSpeed}
              onChange={change('demoSpeed')}
              label={<span className={s.demoLabel}><Gauge size={18} aria-hidden="true" /> Demo speed</span>}
              description="Minutes pass in seconds (for presentations). The first check-in comes 10 seconds after you start."
            />
          </Card>
        )}
      </div>

      <div className={s.stickyBar}>
        <div className={s.stickyInner}>
          {startError && <Alert tone="danger">{startError}</Alert>}
          {!startError && cStatus === 'ready' && agreed.length === 0 && (
            <p className={s.startHint}>
              {(contacts || []).length === 0
                ? 'Add a contact to start. They need to reply YES first.'
                : 'Waiting for a contact to reply YES before Nura can start.'}
            </p>
          )}
          <Button size="lg" block icon={Play} onClick={begin} disabled={!canStart} loading={starting}>
            {active ? 'Restart monitoring' : 'Start monitoring'}
          </Button>
          <p className={s.footer}>
            Nura is not an emergency service. If you feel seriously unwell, call{' '}
            <a href="tel:1122" className={s.inlineLinkStrong}><Phone size={12} aria-hidden="true" /> 1122</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
