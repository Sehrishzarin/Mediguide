// Safe message formatter for Nura chat bubbles.

// ── Safe formatter: **bold**, "• " / "- " bullets and line breaks. No HTML injection. ──
const renderInline = (line, keyBase) =>
  line.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={`${keyBase}-${i}`}>{part.slice(2, -2)}</strong>
      : <span key={`${keyBase}-${i}`}>{part}</span>
  );

const BULLET = /^\s*(?:[•*-]|\d+[.)])\s+/;

export function FormattedText({ text, className, listClassName }) {
  const blocks = [];
  let bullets = null;
  let para = null;
  String(text || '').split('\n').forEach((raw, i) => {
    const line = raw.trimEnd();
    if (BULLET.test(line)) {
      para = null;
      if (!bullets) { bullets = { type: 'ul', items: [], key: i }; blocks.push(bullets); }
      bullets.items.push({ key: i, content: line.replace(BULLET, '') });
    } else if (!line.trim()) {
      bullets = null;
      para = null;
    } else {
      bullets = null;
      if (!para) { para = { type: 'p', lines: [], key: i }; blocks.push(para); }
      para.lines.push({ key: i, content: line.trim() });
    }
  });
  return (
    <div className={className}>
      {blocks.map((b) => (b.type === 'ul' ? (
        <ul key={b.key} className={listClassName}>
          {b.items.map((it) => <li key={it.key}>{renderInline(it.content, it.key)}</li>)}
        </ul>
      ) : (
        <p key={b.key}>
          {b.lines.map((l, idx) => (
            <span key={l.key}>{idx > 0 && <br />}{renderInline(l.content, l.key)}</span>
          ))}
        </p>
      )))}
    </div>
  );
}
