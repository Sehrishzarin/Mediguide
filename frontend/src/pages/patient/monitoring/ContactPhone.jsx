// Screen 4 (DEMO): what an emergency contact receives by SMS and phone call.
// Nothing here was sent through a carrier; the server stores the messages for this view.
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft, FlaskConical, MapPin, PhoneMissed, PhoneCall, TriangleAlert, UserX } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { Alert, Button, EmptyState, ErrorState, IconButton, Skeleton } from '../../../components/ui';
import { getContactMessages, sendContactReply } from '../../../services/api';
import friendlyError from '../../../utils/friendlyError';
import { useMonitoring, useFastMonitoringPoll, refreshMonitoring } from './monitoringStore';
import { clockTime, dayLabel, firstName } from './format';
import { useBack, useNow } from './hooks';
import s from './ContactPhone.module.css';

const POLL_MS = 3000;
const URL_RE = /(https?:\/\/[^\s]+)/g;

// Plain text with clickable links (the location link in alerts)
function Linkified({ text }) {
  const parts = String(text || '').split(URL_RE);
  return parts.map((part, i) => (
    i % 2 === 1
      ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className={s.link}>{part}</a>
      : <Fragment key={i}>{part}</Fragment>
  ));
}

function CallRow({ message }) {
  const missed = message.kind === 'call';
  const Icon = missed ? PhoneMissed : PhoneCall;
  return (
    <div className={s.callRow}>
      <span className={`${s.callIcon} ${missed ? s.callMissed : ''}`}><Icon size={18} aria-hidden="true" /></span>
      <div className={s.callText}>
        <p className={s.callTitle}>{missed ? 'Missed call from MediGuide' : 'Automated call'}</p>
        {message.body && <p className={s.callBody}>{message.body}</p>}
      </div>
      <time className={s.time} dateTime={message.createdAt}>{clockTime(message.createdAt, true)}</time>
    </div>
  );
}

function Bubble({ message }) {
  const incoming = message.direction === 'in'; // the contact's own reply
  const alert = message.kind === 'alert' || message.kind === 'help';
  return (
    <div className={`${s.row} ${incoming ? s.rowMine : ''}`}>
      <div className={`${s.bubble} ${incoming ? s.bubbleMine : s.bubbleTheirs} ${alert ? s.bubbleAlert : ''}`}>
        {alert && (
          <p className={s.alertTag}><TriangleAlert size={14} aria-hidden="true" /> {message.kind === 'help' ? 'Help request' : 'Missed check-in alert'}</p>
        )}
        <p className={s.body}><Linkified text={message.body} /></p>
        {message.bodyUrdu && (
          <p className={s.urdu} dir="rtl" lang="ur">{message.bodyUrdu}</p>
        )}
        {message.link && alert && (
          <a href={message.link} target="_blank" rel="noopener noreferrer" className={s.locationBtn}>
            <MapPin size={16} aria-hidden="true" /> Open last known location
          </a>
        )}
        <time className={s.bubbleTime} dateTime={message.createdAt}>{clockTime(message.createdAt, true)}</time>
      </div>
    </div>
  );
}

export default function ContactPhone() {
  const { id } = useParams();
  const { user } = useAuth();
  const mon = useMonitoring(user?.id);
  useFastMonitoringPoll();
  const back = useBack('/patient/monitoring');
  const now = useNow(60000);

  const [state, setState] = useState({ status: 'loading', data: null, error: '' });
  const [nonce, setNonce] = useState(0);
  const [replying, setReplying] = useState('');
  const [replyError, setReplyError] = useState('');
  const endRef = useRef(null);

  const load = useCallback(() => getContactMessages(id), [id]);

  useEffect(() => {
    let cancelled = false;
    let timer = null;
    const tick = () => {
      load()
        .then((res) => { if (!cancelled) setState({ status: 'ready', data: res.data, error: '' }); })
        .catch((err) => {
          if (cancelled) return;
          setState((prev) => (prev.data && err.status !== 404
            ? prev
            : { status: err.status === 404 ? 'missing' : 'error', data: null, error: friendlyError(err, "We couldn't load this demo phone.") }));
        })
        .finally(() => { if (!cancelled) timer = setTimeout(tick, POLL_MS); });
    };
    tick();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [load, nonce]);

  const messages = state.data?.messages || [];
  const count = messages.length;
  const scrolledOnce = useRef(false);
  useEffect(() => {
    if (!count || !endRef.current) return;
    // Jump to the latest message on first load, glide for new ones
    endRef.current.scrollIntoView({ block: 'end', behavior: scrolledOnce.current ? 'smooth' : 'auto' });
    scrolledOnce.current = true;
  }, [count]);

  const contact = state.data?.contact;
  const name = contact ? firstName(contact.name) : '';
  const open = mon.data?.openCheckIn;
  const alertOut = Boolean(open && open.alertSent && !open.acknowledgedBy && contact?.consent === 'agreed');
  const consentPending = contact?.consent === 'pending';

  const reply = async (text) => {
    setReplying(text);
    setReplyError('');
    try {
      await sendContactReply(id, text);
      const res = await load();
      setState({ status: 'ready', data: res.data, error: '' });
      refreshMonitoring();
    } catch (err) {
      setReplyError(friendlyError(err, "That reply didn't go through. Please try again."));
    } finally {
      setReplying('');
    }
  };

  const retry = () => { setState({ status: 'loading', data: null, error: '' }); setNonce((n) => n + 1); };

  // Group messages by day
  const groups = [];
  messages.forEach((m) => {
    const day = dayLabel(m.createdAt, new Date(now));
    if (!groups.length || groups[groups.length - 1].day !== day) groups.push({ day, items: [] });
    groups[groups.length - 1].items.push(m);
  });

  return (
    <div className={s.page}>
      <div className={s.phone}>
        <header className={s.header}>
          <IconButton icon={ChevronLeft} label="Back" onClick={back} />
          <img src="/logo.jpg" alt="" className={s.appIcon} />
          <div className={s.headerText}>
            <h1 className={s.title}>MediGuide</h1>
            <p className={s.subtitle}>Text message · {contact ? `${contact.name}'s phone` : 'contact phone'}</p>
          </div>
        </header>

        <div className={s.demoBanner} role="note">
          <FlaskConical size={16} aria-hidden="true" />
          <p>
            <strong>Demo:</strong> this is what {name || 'your contact'} would receive by SMS. Real texts and calls need an SMS provider.
          </p>
        </div>

        <div className={s.thread} aria-live="polite">
          {state.status === 'loading' && (
            <div className={s.skeletons} aria-busy="true" aria-label="Loading messages">
              <Skeleton height={72} width="78%" radius="var(--r-lg)" />
              <Skeleton height={40} width="30%" radius="var(--r-lg)" className={s.skelRight} />
              <Skeleton height={56} width="70%" radius="var(--r-lg)" />
            </div>
          )}
          {state.status === 'error' && <ErrorState compact message={state.error} onRetry={retry} />}
          {state.status === 'missing' && (
            <EmptyState
              compact
              icon={UserX}
              title="This contact was removed"
              text="Add them again from Nura Check-In setup."
              action={<Button variant="secondary" size="sm" to="/patient/monitoring/setup">Open setup</Button>}
            />
          )}
          {state.status === 'ready' && count === 0 && (
            <EmptyState compact title="No messages yet" text={`When Nura texts ${name}, it shows up here.`} />
          )}
          {groups.map((g) => (
            <div key={g.day} className={s.group}>
              <p className={s.day}>{g.day}</p>
              {g.items.map((m) => (m.channel === 'call' ? <CallRow key={m.id} message={m} /> : <Bubble key={m.id} message={m} />))}
            </div>
          ))}
          <div ref={endRef} className={s.end} />
        </div>

        {state.status === 'ready' && (
          <div className={s.replyBar}>
            {replyError && <Alert tone="danger">{replyError}</Alert>}
            <p className={s.replyHint}>
              {consentPending && `Reply as ${name}:`}
              {!consentPending && alertOut && `Reply OK as ${name} once you've reached ${firstName(user?.name) || 'them'}:`}
              {!consentPending && !alertOut && 'Nothing to reply to right now.'}
            </p>
            <div className={s.replyBtns}>
              {consentPending && (
                <>
                  <Button onClick={() => reply('YES')} loading={replying === 'YES'} disabled={Boolean(replying)} className={s.replyBtn}>YES</Button>
                  <Button variant="secondary" onClick={() => reply('NO')} loading={replying === 'NO'} disabled={Boolean(replying)} className={s.replyBtn}>NO</Button>
                </>
              )}
              {!consentPending && alertOut && (
                <Button onClick={() => reply('OK')} loading={replying === 'OK'} disabled={Boolean(replying)} className={s.replyBtn}>OK</Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
