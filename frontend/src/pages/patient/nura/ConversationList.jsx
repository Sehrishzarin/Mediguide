// Messaging-style list of Nura conversations, with search and delete.
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SquarePen, Search, Trash2, SearchX } from 'lucide-react';
import { Button, IconButton, Input, Chip, ChipRow, EmptyState } from '../../../components/ui';
import Nura from '../../../components/nura/Nura';
import { newId, previewText } from '../chatStorage';
import { sendMessage, deleteSession } from './nuraStore';
import { listTime, useNow } from './time';
import s from './ConversationList.module.css';

const STARTERS = [
  'I have a symptom to check',
  'Tips for better sleep',
  'What are my allergies?',
  'Book a doctor'
];

const cx = (...p) => p.filter(Boolean).join(' ');

function Row({ session, active, nowMs, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const last = session.messages[session.messages.length - 1];
  const preview = last ? `${last.sender === 'user' ? 'You: ' : ''}${previewText(last.text)}` : '';

  if (confirming) {
    return (
      <li className={cx(s.row, s.rowConfirm)}>
        <p className={s.confirmText}>Delete this conversation?</p>
        <div className={s.confirmActions}>
          <Button variant="secondary" size="sm" onClick={() => setConfirming(false)} autoFocus>Cancel</Button>
          <Button variant="danger" size="sm" onClick={() => onDelete(session.id)}>Delete</Button>
        </div>
      </li>
    );
  }

  return (
    <li className={cx(s.row, active && s.rowActive)}>
      <Link to={`/patient/nura/${session.id}`} className={s.rowLink} aria-current={active ? 'page' : undefined}>
        <Nura size={40} still className={s.rowAvatar} />
        <span className={s.rowText}>
          <span className={s.rowTop}>
            <span className={s.rowTitle}>{session.title}</span>
            <span className={s.rowTime}>{listTime(session.updatedAt || session.createdAt, nowMs)}</span>
          </span>
          <span className={s.rowPreview}>{preview}</span>
        </span>
      </Link>
      <IconButton
        icon={Trash2}
        size="sm"
        label={`Delete conversation: ${session.title}`}
        className={s.rowDelete}
        onClick={() => setConfirming(true)}
      />
    </li>
  );
}

export default function ConversationList({ userId, sessions, activeId, pane = false }) {
  const navigate = useNavigate();
  const nowMs = useNow();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sessions;
    return sessions.filter((x) => x.title.toLowerCase().includes(q) || x.messages.some((m) => m.text.toLowerCase().includes(q)));
  }, [sessions, query]);

  const startWith = (text) => {
    const id = newId();
    if (sendMessage(userId, id, text)) navigate(`/patient/nura/${id}`);
  };

  const remove = (id) => {
    deleteSession(userId, id);
    if (id === activeId) navigate('/patient/nura', { replace: true });
  };

  return (
    <div className={cx(s.wrap, pane && s.pane)}>
      <header className={s.header}>
        <Nura size={pane ? 40 : 48} mood="idle" />
        <div className={s.headerText}>
          <h1 className={s.title}>Nura</h1>
          <p className={s.subtitle}>Your health assistant</p>
        </div>
        {pane ? (
          <IconButton icon={SquarePen} label="New chat" variant="secondary" to="/patient/nura/new" />
        ) : (
          <Button icon={SquarePen} to="/patient/nura/new">New chat</Button>
        )}
      </header>

      {sessions.length === 0 ? (
        <div className={s.empty}>
          <Nura size={pane ? 72 : 96} mood="happy" />
          <h2 className={s.emptyTitle}>Start your first conversation</h2>
          <p className={s.emptyText}>Ask Nura about a symptom, your medicines, sleep, nutrition or your health profile.</p>
          <ChipRow wrap className={s.starters}>
            {STARTERS.map((t) => <Chip key={t} onClick={() => startWith(t)}>{t}</Chip>)}
          </ChipRow>
        </div>
      ) : (
        <>
          <div className={s.search}>
            <Search size={18} className={s.searchIcon} aria-hidden="true" />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search conversations"
              aria-label="Search conversations"
              className={s.searchInput}
            />
          </div>
          {filtered.length === 0 ? (
            <EmptyState compact icon={SearchX} title="No conversations found" text="Try a different word, or start a new chat." />
          ) : (
            <ul className={s.list} aria-label="Conversations">
              {filtered.map((x) => (
                <Row key={x.id} session={x} active={x.id === activeId} nowMs={nowMs} onDelete={remove} />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
