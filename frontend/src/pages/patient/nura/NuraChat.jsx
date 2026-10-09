// Nura — the patient's health chat.
//   /patient/nura          conversation list (desktop: list + new chat side by side)
//   /patient/nura/:chatId  a conversation (chatId = stored id or "new")
import { useEffect, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { newId } from '../chatStorage';
import { useNuraStore, sendMessage } from './nuraStore';
import ConversationList from './ConversationList';
import ChatView from './ChatView';
import s from './NuraChat.module.css';

const DESKTOP_QUERY = '(min-width: 1024px)';
const subscribeDesktop = (cb) => {
  const mq = window.matchMedia(DESKTOP_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const isDesktopNow = () => window.matchMedia(DESKTOP_QUERY).matches;
const useIsDesktop = () => useSyncExternalStore(subscribeDesktop, isDesktopNow, () => false);

// Size a pane to exactly fill the viewport below its top edge, minus the layout's bottom
// padding, so only the panes scroll. Skipped for the fixed mobile shell. DOM-only (no state).
function useFillViewport(ref) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => {
      if (getComputedStyle(el).position === 'fixed') { el.style.height = ''; return; }
      const main = el.closest('main');
      const padBottom = main ? parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0;
      const top = el.getBoundingClientRect().top + window.scrollY;
      el.style.height = `${Math.max(480, window.innerHeight - top - padBottom)}px`;
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  });
}

// Prompts passed as /patient/nura/new?q=... (e.g. Home suggestions) are sent once per
// history entry, even if the component remounts or effects re-run.
const consumedPrompts = new Set();

function useStartFromQuery(userId, chatId) {
  const location = useLocation();
  const navigate = useNavigate();
  useEffect(() => {
    if (chatId !== 'new') return;
    const q = new URLSearchParams(location.search).get('q')?.trim();
    if (!q || consumedPrompts.has(location.key)) return;
    consumedPrompts.add(location.key);
    const id = newId();
    if (sendMessage(userId, id, q.slice(0, 2000))) navigate(`/patient/nura/${id}`, { replace: true });
    else navigate('/patient/nura/new', { replace: true });
  }, [chatId, location.search, location.key, userId, navigate]);
}

export default function NuraChat() {
  const { user } = useAuth();
  const userId = user?.id || user?._id || 'guest';
  const { chatId } = useParams();
  useStartFromQuery(userId, chatId);
  const isDesktop = useIsDesktop();
  const store = useNuraStore(userId);
  const shellRef = useRef(null);
  useFillViewport(shellRef);

  const activeId = chatId || 'new';
  const session = store.sessions.find((x) => x.id === activeId) || null;

  const chat = (
    <ChatView
      key={activeId}
      userId={userId}
      user={user}
      chatId={activeId}
      session={session}
      pending={Boolean(session && store.pending[session.id])}
      error={session ? store.errors[session.id] : null}
      speaking={Boolean(session) && store.speaking === session.id}
      showBack={!isDesktop}
    />
  );

  if (isDesktop) {
    return (
      <div ref={shellRef} className={s.split}>
        <aside className={s.listPane} aria-label="Conversations">
          <ConversationList userId={userId} sessions={store.sessions} activeId={session ? session.id : null} pane />
        </aside>
        <section className={s.chatPane} aria-label="Chat with Nura">{chat}</section>
      </div>
    );
  }

  if (!chatId) {
    return <ConversationList userId={userId} sessions={store.sessions} activeId={null} />;
  }
  return <div ref={shellRef} className={s.mobileShell}>{chat}</div>;
}
