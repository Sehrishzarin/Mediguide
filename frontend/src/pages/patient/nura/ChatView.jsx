// A single conversation with Nura: header, messages, suggested replies and composer.
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, SquarePen, RotateCw, AlertCircle, CalendarPlus, MapPin, Phone } from 'lucide-react';
import { IconButton, Button, Chip, ChipRow } from '../../../components/ui';
import Nura from '../../../components/nura/Nura';
import { newId, bookableSpecialty } from '../chatStorage';
import { sendMessage, retryMessage } from './nuraStore';
import MessageBubble from './MessageBubble';
import NuraWelcome from './NuraWelcome';
import Composer from './Composer';
import s from './ChatView.module.css';

const NEAR_BOTTOM_PX = 120;

// Some suggested replies are better as actions than as messages
const chipAction = (text, phone) => {
  if (/^(book a (doctor|session)|show open sessions|book an appointment)$/i.test(text)) return { type: 'book', icon: CalendarPlus };
  if (/nearest hospital/i.test(text)) return { type: 'nearby', icon: MapPin };
  if (/call my emergency contact/i.test(text) && phone) return { type: 'call', icon: Phone };
  return null;
};

export default function ChatView({ userId, user, chatId, session, pending, error, speaking, showBack }) {
  const navigate = useNavigate();
  const [listening, setListening] = useState(false);
  const scrollRef = useRef(null);
  const nearBottomRef = useRef(true);
  const inputRef = useRef(null);

  const messages = useMemo(() => session?.messages || [], [session]);
  const lastMessage = messages[messages.length - 1];
  const lastAi = useMemo(() => [...messages].reverse().find((m) => m.sender === 'ai'), [messages]);
  const lastResult = lastAi?.result;
  const firstName = (user?.name || '').trim().split(/\s+/)[0] || '';
  const emergencyPhone = user?.medicalProfile?.emergencyContact?.phone || '';

  const concerned = Boolean(lastResult && (lastResult.emergency_flag || lastResult.urgency_level === 'high'));
  let mood = 'idle';
  if (listening) mood = 'listening';
  else if (pending) mood = 'thinking';
  else if (concerned) mood = 'concerned';
  else if (speaking) mood = 'speaking';

  // ── Sending ──
  const send = useCallback((text) => {
    if (pending) return false;
    const id = session ? session.id : newId();
    const ok = sendMessage(userId, id, text);
    if (ok) {
      nearBottomRef.current = true;
      if (!session) navigate(`/patient/nura/${id}`, { replace: chatId === 'new' });
    }
    return ok;
  }, [pending, session, userId, navigate, chatId]);

  // ── Actions from replies ──
  const book = useCallback((specialty) => {
    navigate('/patient/care/book', { state: specialty ? { specialty } : undefined });
  }, [navigate]);
  const openEmergency = useCallback(() => navigate('/patient/emergency'), [navigate]);
  const openNearby = useCallback(() => navigate('/patient/care/nearby'), [navigate]);

  const pickChip = (text) => {
    const action = chipAction(text, emergencyPhone);
    if (!action) { send(text); return; }
    if (action.type === 'book') book(bookableSpecialty(lastResult));
    else if (action.type === 'nearby') openNearby();
    else if (action.type === 'call') window.location.assign(`tel:${emergencyPhone.replace(/[^\d+]/g, '')}`);
  };

  // Suggested replies come from the latest Nura reply, and only while it is the last message
  const suggestions = useMemo(() => {
    if (!lastResult || lastMessage !== lastAi || pending) return [];
    if (lastResult.suggested_replies?.length) return lastResult.suggested_replies;
    return lastResult.trigger_question ? [lastResult.trigger_question] : [];
  }, [lastResult, lastMessage, lastAi, pending]);

  // ── Scrolling: follow new messages only when the reader is near the bottom ──
  const onScroll = () => {
    const el = scrollRef.current;
    if (el) nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  };
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && messages.length > 0 && nearBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages.length, pending, error, suggestions.length]);

  const rendered = useMemo(() => messages.map((m, i) => (
    <MessageBubble
      key={m.id}
      message={m}
      showAvatar={m.sender === 'ai' && messages[i - 1]?.sender !== 'ai'}
      onBook={book}
      onEmergency={openEmergency}
      onNearby={openNearby}
    />
  )), [messages, book, openEmergency, openNearby]);

  const isEmpty = messages.length === 0;

  return (
    <div className={s.view}>
      <header className={s.header}>
        {showBack && <IconButton icon={ChevronLeft} label="Back to conversations" to="/patient/nura" className={s.back} />}
        <Nura size={40} mood={mood} />
        <div className={s.headerText}>
          <h1 className={s.name}>Nura</h1>
          <p className={s.status} aria-live="polite">
            {pending ? 'Typing…' : listening ? 'Listening…' : (
              <><span className={s.dot} aria-hidden="true" />Online · Health assistant</>
            )}
          </p>
        </div>
        {!isEmpty && <IconButton icon={SquarePen} label="New chat" to="/patient/nura/new" />}
      </header>

      <div ref={scrollRef} className={s.scroll} onScroll={onScroll}>
        {isEmpty ? (
          <NuraWelcome firstName={firstName} mood={listening ? 'listening' : 'happy'} onPick={send} disabled={pending} />
        ) : (
          <div className={s.messages} role="log" aria-label="Conversation with Nura">
            {rendered}
            {pending && (
              <div className={s.typingRow} role="status">
                <Nura size={28} mood="thinking" still className={s.typingAvatar} />
                <div className={s.typing} aria-hidden="true"><i /><i /><i /></div>
                <span className="sr-only">Nura is typing</span>
              </div>
            )}
            {error && !pending && (
              <div className={s.errorRow} role="alert">
                <div className={s.errorBubble}>
                  <AlertCircle size={18} aria-hidden="true" />
                  <span>{error.message}</span>
                </div>
                <Button variant="secondary" size="sm" icon={RotateCw} onClick={() => retryMessage(userId, session.id)}>Try again</Button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={s.footer}>
        {suggestions.length > 0 && (
          <ChipRow className={s.chips}>
            {suggestions.map((t) => {
              const action = chipAction(t, emergencyPhone);
              return <Chip key={t} icon={action?.icon} onClick={() => pickChip(t)}>{t}</Chip>;
            })}
          </ChipRow>
        )}
        <Composer onSend={send} disabled={pending} onListeningChange={setListening} inputRef={inputRef} />
        <p className={s.disclaimer}>Nura gives guidance, not a diagnosis. In an emergency call 1122.</p>
      </div>
    </div>
  );
}
