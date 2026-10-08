import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { submitTriageSymptom } from '../../services/api';
import ChatMessage from './ChatMessage';
import { loadSessions, saveSessions, newId, slimResult, MAX_SESSIONS, MAX_MESSAGES } from './chatStorage';
import styles from './SymptomInput.module.css';

const QUICK_TOPICS = ['Headache', 'Fever', 'Cough', 'Stomach pain', 'Skin rash', 'Back pain', 'Chest pain'];
const HISTORY_TURNS = 8; // recent turns sent to the server (it keeps 12 at most)
const SpeechRecognitionApi = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : undefined;

const friendlyError = (err) => {
  if (err?.status === 429) return 'You are sending messages too quickly. Please wait a minute and try again.';
  return err?.message || 'Something went wrong. Please try again.';
};

const dayLabel = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

function Consultation({ userId, startFresh }) {
  const [sessions, setSessions] = useState(() => loadSessions(userId));
  const [activeId, setActiveId] = useState(() => (startFresh ? null : loadSessions(userId)[0]?.id ?? null));
  const [text, setText] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null); // { sessionId, text, history, message }
  const [replyTo, setReplyTo] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [listening, setListening] = useState(false);
  const [voiceNote, setVoiceNote] = useState('');

  const scrollRef = useRef(null);
  const nearBottomRef = useRef(true);
  const textareaRef = useRef(null);
  const recognitionRef = useRef(null);
  const voiceBaseRef = useRef('');

  const active = useMemo(() => sessions.find((s) => s.id === activeId) || null, [sessions, activeId]);
  const messages = useMemo(() => (active ? active.messages : []), [active]);
  const lastMessage = messages[messages.length - 1];
  const lastAiId = useMemo(() => [...messages].reverse().find((m) => m.sender === 'ai')?.id, [messages]);

  // Persist whenever the list changes
  useEffect(() => { saveSessions(userId, sessions); }, [userId, sessions]);

  // Stop the microphone if we leave the page
  useEffect(() => () => { recognitionRef.current?.abort?.(); }, []);

  // Keep the textarea sized to its content (re-measured after layout settles and on resize)
  useEffect(() => {
    const fit = () => {
      const el = textareaRef.current;
      if (!el) return;
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
    };
    fit();
    const frame = requestAnimationFrame(fit);
    window.addEventListener('resize', fit);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', fit); };
  }, [text]);

  // Follow new messages only when the reader is already near the bottom (or just sent one)
  useEffect(() => {
    const el = scrollRef.current;
    if (el && (nearBottomRef.current || lastMessage?.sender === 'user')) {
      const rows = el.querySelectorAll('[data-row]');
      const last = rows[rows.length - 1];
      // A long assistant reply (e.g. an emergency banner) should be read from its top
      const tall = lastMessage?.sender === 'ai' && !pending && last && last.offsetHeight > el.clientHeight - 48;
      el.scrollTo({ top: tall ? last.offsetTop - 12 : el.scrollHeight, behavior: 'smooth' });
    }
  }, [lastMessage, pending, error]);

  // Opening a different conversation always starts at the latest message
  useEffect(() => {
    nearBottomRef.current = true;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [activeId]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (el) nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
  };

  const appendMessages = useCallback((sessionId, newMessages, title) => {
    setSessions((prev) => {
      const exists = prev.some((s) => s.id === sessionId);
      const updated = exists
        ? prev.map((s) => (s.id === sessionId ? { ...s, messages: [...s.messages, ...newMessages].slice(-MAX_MESSAGES) } : s))
        : [{ id: sessionId, title: title || 'Consultation', createdAt: newMessages[0].time, messages: newMessages }, ...prev];
      // Most recent conversation first
      const current = updated.find((s) => s.id === sessionId);
      return [current, ...updated.filter((s) => s.id !== sessionId)].slice(0, MAX_SESSIONS);
    });
  }, []);

  const requestAi = useCallback(async (sessionId, message, history) => {
    setPending(true);
    setError(null);
    try {
      const result = await submitTriageSymptom(message, history);
      appendMessages(sessionId, [{
        id: newId(),
        sender: 'ai',
        text: result.conversational_response || 'I could not generate a response.',
        result: slimResult(result),
        time: new Date().toISOString()
      }]);
    } catch (err) {
      setError({ sessionId, text: message, history, message: friendlyError(err) });
    } finally {
      setPending(false);
    }
  }, [appendMessages]);

  const send = useCallback((raw) => {
    const message = raw.trim();
    if (!message || pending) return;
    const sessionId = active?.id || newId();
    const history = (active?.messages || []).slice(-HISTORY_TURNS).map((m) => ({ sender: m.sender, text: m.text }));
    appendMessages(
      sessionId,
      [{ id: newId(), sender: 'user', text: message, time: new Date().toISOString() }],
      message.length > 42 ? `${message.slice(0, 42)}...` : message
    );
    setActiveId(sessionId);
    setText('');
    setReplyTo('');
    requestAi(sessionId, message, history);
  }, [active, pending, appendMessages, requestAi]);

  const retry = () => {
    if (error && !pending) requestAi(error.sessionId, error.text, error.history);
  };

  const startNew = () => {
    recognitionRef.current?.abort?.();
    setActiveId(null);
    setError(null);
    setText('');
    setReplyTo('');
    setDrawerOpen(false);
    textareaRef.current?.focus();
  };

  const openSession = (id) => {
    setActiveId(id);
    setError(null);
    setDrawerOpen(false);
  };

  const deleteSession = (id) => {
    setSessions((prev) => prev.filter((s) => s.id !== id));
    setConfirmDeleteId(null);
    if (id === activeId) setActiveId(null);
  };

  const onKeyDown = (e) => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    // On touch devices Enter is a newline; the send button submits
    if (window.matchMedia('(pointer: coarse)').matches) return;
    e.preventDefault();
    send(text);
  };

  const pickQuestion = (question) => {
    setReplyTo(question);
    textareaRef.current?.focus();
  };

  // ---- Voice input ----
  const toggleVoice = () => {
    if (!SpeechRecognitionApi) {
      setVoiceNote('Voice input is not supported in this browser. Please type your symptoms.');
      return;
    }
    if (listening) { recognitionRef.current?.stop(); return; }
    setVoiceNote('');
    const rec = new SpeechRecognitionApi();
    rec.lang = 'en-US';
    rec.interimResults = true;
    rec.continuous = false;
    voiceBaseRef.current = text ? `${text.trim()} ` : '';
    rec.onresult = (event) => {
      const heard = Array.from(event.results).map((r) => r[0].transcript).join('');
      setText(voiceBaseRef.current + heard);
    };
    rec.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setVoiceNote('Microphone access was blocked. Allow it in your browser or device settings to use voice.');
      } else if (event.error === 'no-speech') {
        setVoiceNote('I did not hear anything. Tap the microphone and try again.');
      } else if (event.error !== 'aborted') {
        setVoiceNote('Voice input stopped unexpectedly. Please try again or type instead.');
      }
    };
    rec.onend = () => { setListening(false); recognitionRef.current = null; };
    recognitionRef.current = rec;
    try { rec.start(); setListening(true); } catch { setVoiceNote('Could not start the microphone.'); }
  };

  const showError = Boolean(error) && error.sessionId === activeId;

  return (
    <div className={styles.shell}>
      {drawerOpen && <button type="button" className={styles.scrim} aria-label="Close history" onClick={() => setDrawerOpen(false)} />}

      <aside className={`${styles.history} ${drawerOpen ? styles.historyOpen : ''}`} aria-label="Consultation history">
        <div className={styles.historyHead}>
          <h2 className={styles.historyTitle}>History</h2>
          <button type="button" className={styles.newBtn} onClick={startNew}>+ New</button>
          <button type="button" className={`${styles.iconBtn} ${styles.drawerClose}`} aria-label="Close history" onClick={() => setDrawerOpen(false)}>&#10005;</button>
        </div>
        <ul className={styles.sessionList}>
          {sessions.length === 0 && <li className={styles.historyEmpty}>Your consultations will appear here.</li>}
          {sessions.map((s) => (
            <li key={s.id} className={`${styles.sessionItem} ${s.id === activeId ? styles.sessionActive : ''}`}>
              {confirmDeleteId === s.id ? (
                <div className={styles.confirmRow}>
                  <span>Delete this chat?</span>
                  <button type="button" className={styles.confirmYes} onClick={() => deleteSession(s.id)}>Delete</button>
                  <button type="button" className={styles.confirmNo} onClick={() => setConfirmDeleteId(null)}>Keep</button>
                </div>
              ) : (
                <>
                  <button type="button" className={styles.sessionMain} onClick={() => openSession(s.id)}>
                    <span className={styles.sessionName}>{s.title}</span>
                    <span className={styles.sessionMeta}>{dayLabel(s.createdAt)} &middot; {s.messages.length} messages</span>
                  </button>
                  <button type="button" className={styles.iconBtn} aria-label={`Delete ${s.title}`} onClick={() => setConfirmDeleteId(s.id)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m-9 0 1 14h8l1-14" /></svg>
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </aside>

      <section className={styles.chat} aria-label="AI consultation">
        <header className={styles.chatHead}>
          <button type="button" className={`${styles.iconBtn} ${styles.historyToggle}`} aria-label="Open history" onClick={() => setDrawerOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10" /></svg>
          </button>
          <div className={styles.chatHeadText}>
            <h1 className={styles.chatTitle}>AI Health Counselor</h1>
            <p className={styles.chatSub}>Guidance based on your symptoms and medical profile</p>
          </div>
          <button type="button" className={styles.newBtn} onClick={startNew}>+ New</button>
        </header>

        <div ref={scrollRef} className={styles.messages} onScroll={onScroll} role="log" aria-live="polite">
          {messages.length === 0 && (
            <div className={styles.intro}>
              <div className={styles.introIcon} aria-hidden="true">&#10022;</div>
              <h2>How are you feeling today?</h2>
              <p>Describe your symptoms in your own words. I will suggest how urgent it is and which specialist to see.</p>
              <div className={styles.topicRow}>
                {QUICK_TOPICS.map((t) => (
                  <button key={t} type="button" className={styles.topicChip} disabled={pending} onClick={() => send(`I have ${t.toLowerCase()}`)}>{t}</button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <ChatMessage
              key={m.id}
              message={m}
              isLatestAi={m.id === lastAiId && m === lastMessage}
              canAsk={!pending}
              onPickQuestion={pickQuestion}
            />
          ))}

          {pending && (
            <div className={styles.msgRow}>
              <div className={`${styles.bubble} ${styles.bubbleAi} ${styles.typing}`} aria-label="MediGuide is typing">
                <span /><span /><span />
              </div>
            </div>
          )}

          {showError && (
            <div className={styles.msgRow}>
              <div className={styles.errorBubble} role="alert">
                <p>{error.message}</p>
                <button type="button" className={styles.retryBtn} onClick={retry} disabled={pending}>Try again</button>
              </div>
            </div>
          )}
        </div>

        <div className={styles.composerWrap}>
          <p className={styles.disclaimer}>MediGuide gives guidance, not a diagnosis. In an emergency call <a href="tel:1122">1122</a>.</p>
          {voiceNote && <p className={styles.voiceNote} role="status">{voiceNote}</p>}
          {replyTo && (
            <div className={styles.replyBar}>
              <span className={styles.replyText}>Answering: {replyTo}</span>
              <button type="button" className={styles.iconBtn} aria-label="Clear" onClick={() => setReplyTo('')}>&#10005;</button>
            </div>
          )}
          <form className={styles.composer} onSubmit={(e) => { e.preventDefault(); send(text); }}>
            <button
              type="button"
              className={`${styles.micBtn} ${listening ? styles.micOn : ''}`}
              onClick={toggleVoice}
              aria-label={listening ? 'Stop voice input' : 'Start voice input'}
              aria-pressed={listening}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>
            </button>
            <textarea
              ref={textareaRef}
              className={styles.input}
              rows={1}
              value={text}
              maxLength={2000}
              placeholder={listening ? 'Listening...' : 'Describe your symptoms...'}
              aria-label="Describe your symptoms"
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
            />
            <button type="submit" className={styles.sendBtn} disabled={pending || !text.trim()} aria-label="Send message">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m22 2-7 20-4-9-9-4 20-7Z" /></svg>
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

export default function SymptomInput() {
  const { user } = useAuth();
  const location = useLocation();
  const startFresh = new URLSearchParams(location.search).get('new') === 'true';
  // Remount on every navigation so "New consult" links always open a clean conversation
  return <Consultation key={`${user.id}:${location.key}`} userId={user.id} startFresh={startFresh} />;
}
