// MediGuide UI kit — the building blocks every screen uses.
// Keep screens free of one-off button/card styles: extend these instead.
import { forwardRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, AlertCircle, RotateCw, Eye, EyeOff } from 'lucide-react';
import s from './ui.module.css';

const cx = (...parts) => parts.filter(Boolean).join(' ');

// ── Button ────────────────────────────────────────────────────────────────
// variant: primary | secondary | ghost | danger | dangerSoft ; size: sm | md | lg
// Renders a <Link> when `to` is given, an <a> when `href` is given.
export const Button = forwardRef(function Button(
  { variant = 'primary', size = 'md', block, icon: Icon, iconRight: IconRight, loading, to, href, className, children, disabled, ...rest },
  ref
) {
  const cls = cx(s.btn, s[`btn_${variant}`], s[`btn_${size}`], block && s.block, className);
  const content = (
    <>
      {loading ? <span className={s.btnSpinner} aria-hidden="true" /> : Icon && <Icon size={size === 'sm' ? 16 : 18} aria-hidden="true" />}
      {children && <span>{children}</span>}
      {IconRight && !loading && <IconRight size={size === 'sm' ? 16 : 18} aria-hidden="true" />}
    </>
  );
  if (to) return <Link ref={ref} to={to} className={cls} {...rest}>{content}</Link>;
  if (href) return <a ref={ref} href={href} className={cls} {...rest}>{content}</a>;
  return (
    <button ref={ref} type="button" className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
});

// Square icon-only button; `label` is required for screen readers.
export function IconButton({ icon: Icon, label, variant = 'ghost', size = 'md', to, className, ...rest }) {
  const cls = cx(s.iconBtn, s[`iconBtn_${variant}`], s[`iconBtn_${size}`], className);
  const icon = <Icon size={size === 'sm' ? 18 : 20} aria-hidden="true" />;
  if (to) return <Link to={to} className={cls} aria-label={label} title={label} {...rest}>{icon}</Link>;
  return <button type="button" className={cls} aria-label={label} title={label} {...rest}>{icon}</button>;
}

// ── Surfaces ──────────────────────────────────────────────────────────────
export function Card({ as: Tag = 'section', padding = 'md', interactive, className, children, ...rest }) {
  return (
    <Tag className={cx(s.card, s[`pad_${padding}`], interactive && s.interactive, className)} {...rest}>
      {children}
    </Tag>
  );
}

// Page title row. `back` = route to go back to (shows a back button);
// `onBack` = click handler instead (e.g. history back with a fallback).
export function PageHeader({ title, subtitle, back, onBack, actions, className }) {
  return (
    <header className={cx(s.pageHeader, className)}>
      {onBack
        ? <IconButton icon={ChevronLeft} label="Back" onClick={onBack} className={s.backBtn} />
        : back && <IconButton icon={ChevronLeft} label="Back" to={back} className={s.backBtn} />}
      <div className={s.pageHeaderText}>
        <h1 className={s.pageTitle}>{title}</h1>
        {subtitle && <p className={s.pageSubtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={s.pageActions}>{actions}</div>}
    </header>
  );
}

export function SectionHeader({ title, action, className }) {
  return (
    <div className={cx(s.sectionHeader, className)}>
      <h2 className={s.sectionTitle}>{title}</h2>
      {action}
    </div>
  );
}

// ── Small elements ────────────────────────────────────────────────────────
// tone: neutral | brand | danger | warning | success | info
export function Badge({ tone = 'neutral', icon: Icon, children, className }) {
  return (
    <span className={cx(s.badge, s[`badge_${tone}`], className)}>
      {Icon && <Icon size={12} aria-hidden="true" />}
      {children}
    </span>
  );
}

export function Avatar({ name = '', size = 40, className }) {
  const initials = name.trim().split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <span className={cx(s.avatar, className)} style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {initials}
    </span>
  );
}

export function Skeleton({ height = 16, width = '100%', radius, className }) {
  return <span className={cx(s.skeleton, className)} style={{ height, width, borderRadius: radius }} aria-hidden="true" />;
}

// ── States ────────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, text, action, compact, className }) {
  return (
    <div className={cx(s.state, compact && s.stateCompact, className)}>
      {Icon && <span className={s.stateIcon}><Icon size={22} aria-hidden="true" /></span>}
      <p className={s.stateTitle}>{title}</p>
      {text && <p className={s.stateText}>{text}</p>}
      {action && <div className={s.stateAction}>{action}</div>}
    </div>
  );
}

export function ErrorState({ message = 'Something went wrong.', onRetry, compact, className }) {
  return (
    <div className={cx(s.state, compact && s.stateCompact, className)} role="alert">
      <span className={cx(s.stateIcon, s.stateIconDanger)}><AlertCircle size={22} aria-hidden="true" /></span>
      <p className={s.stateTitle}>{message}</p>
      {onRetry && (
        <div className={s.stateAction}>
          <Button variant="secondary" size="sm" icon={RotateCw} onClick={onRetry}>Try again</Button>
        </div>
      )}
    </div>
  );
}

// Inline message banner. tone: info | success | warning | danger
export function Alert({ tone = 'info', icon: Icon, title, children, action, className }) {
  return (
    <div className={cx(s.alert, s[`alert_${tone}`], className)} role={tone === 'danger' ? 'alert' : 'status'}>
      {Icon && <Icon size={18} className={s.alertIcon} aria-hidden="true" />}
      <div className={s.alertBody}>
        {title && <p className={s.alertTitle}>{title}</p>}
        {children && <div className={s.alertText}>{children}</div>}
      </div>
      {action}
    </div>
  );
}

// ── Lists ─────────────────────────────────────────────────────────────────
// A tappable row: leading icon tile, title/subtitle, trailing meta + chevron.
// `href` renders an <a> (e.g. tel: links); `disabled` applies to the button form.
export function ListItem({ icon: Icon, iconTone = 'brand', leading, title, subtitle, meta, to, href, onClick, disabled, chevron = Boolean(to || href || onClick), className }) {
  const inner = (
    <>
      {leading || (Icon && <span className={cx(s.listIcon, s[`listIcon_${iconTone}`])}><Icon size={20} aria-hidden="true" /></span>)}
      <span className={s.listText}>
        <span className={s.listTitle}>{title}</span>
        {subtitle && <span className={s.listSubtitle}>{subtitle}</span>}
      </span>
      {meta && <span className={s.listMeta}>{meta}</span>}
      {chevron && <ChevronRight size={18} className={s.listChevron} aria-hidden="true" />}
    </>
  );
  const cls = cx(s.listItem, (to || href || onClick) && s.listItemAction, className);
  if (to) return <Link to={to} className={cls}>{inner}</Link>;
  if (href) return <a href={href} className={cls}>{inner}</a>;
  if (onClick) return <button type="button" onClick={onClick} disabled={disabled} className={cls}>{inner}</button>;
  return <div className={cls}>{inner}</div>;
}

export function List({ children, className }) {
  return <div className={cx(s.list, className)}>{children}</div>;
}

// ── Choice controls ───────────────────────────────────────────────────────
export function Chip({ selected, icon: Icon, children, className, ...rest }) {
  return (
    <button type="button" className={cx(s.chip, selected && s.chipSelected, className)} aria-pressed={selected} {...rest}>
      {Icon && <Icon size={16} aria-hidden="true" />}
      {children}
    </button>
  );
}

// Horizontally scrollable on mobile, wraps on wide screens.
export function ChipRow({ children, wrap, className }) {
  return <div className={cx(s.chipRow, wrap && s.chipRowWrap, className)}>{children}</div>;
}

// options: [{ value, label, icon? }]
export function Segmented({ options, value, onChange, label, className }) {
  return (
    <div className={cx(s.segmented, className)} role="tablist" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          className={cx(s.segment, value === o.value && s.segmentActive)}
          onClick={() => onChange(o.value)}
        >
          {o.icon && <o.icon size={16} aria-hidden="true" />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// On/off switch row: label + optional description, the whole row is the 44px target.
export function Switch({ checked, onChange, label, description, disabled, className }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(s.switchRow, className)}
    >
      <span className={s.switchText}>
        <span className={s.switchLabel}>{label}</span>
        {description && <span className={s.switchDesc}>{description}</span>}
      </span>
      <span className={cx(s.switchTrack, checked && s.switchOn)} aria-hidden="true">
        <span className={s.switchThumb} />
      </span>
    </button>
  );
}

// ── Form fields ───────────────────────────────────────────────────────────
export function Field({ label, hint, error, htmlFor, optional, children, className }) {
  return (
    <div className={cx(s.field, className)}>
      {label && (
        <label className={s.label} htmlFor={htmlFor}>
          {label}{optional && <span className={s.optional}> (optional)</span>}
        </label>
      )}
      {children}
      {error ? <p className={s.fieldError} role="alert">{error}</p> : hint && <p className={s.hint}>{hint}</p>}
    </div>
  );
}

export const Input = forwardRef(function Input({ invalid, className, ...rest }, ref) {
  return <input ref={ref} className={cx(s.input, invalid && s.invalid, className)} aria-invalid={invalid || undefined} {...rest} />;
});

export const Select = forwardRef(function Select({ invalid, className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cx(s.input, s.select, invalid && s.invalid, className)} aria-invalid={invalid || undefined} {...rest}>
      {children}
    </select>
  );
});

export const Textarea = forwardRef(function Textarea({ invalid, className, ...rest }, ref) {
  return <textarea ref={ref} className={cx(s.input, s.textarea, invalid && s.invalid, className)} aria-invalid={invalid || undefined} {...rest} />;
});

// ── Password input (show / hide toggle) ───────────────────────────────────
export const PasswordInput = forwardRef(function PasswordInput({ invalid, className, ...rest }, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <div className={cx(s.passwordWrap, className)}>
      <input
        ref={ref}
        type={visible ? 'text' : 'password'}
        className={cx(s.input, s.passwordInput, invalid && s.invalid)}
        aria-invalid={invalid || undefined}
        {...rest}
      />
      <button
        type="button"
        className={s.passwordToggle}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
      >
        {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
      </button>
    </div>
  );
});

// ── Progress bar ──────────────────────────────────────────────────────────
export function ProgressBar({ value = 0, label, className }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return (
    <div className={cx(s.progress, className)} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}>
      <span className={s.progressFill} style={{ width: `${v}%` }} />
    </div>
  );
}

// ── Brand ─────────────────────────────────────────────────────────────────
// The MediGuide mark (cropped from the logo artwork) with an optional wordmark and subtitle.
export function Logo({ size = 32, wordmark = true, subtitle, to, className }) {
  const imgW = size * 1.7;
  const mark = (
    <span className={s.logoMark} style={{ width: size, height: size }} aria-hidden="true">
      <img src="/logo.jpg" alt="" width={imgW} height={imgW} style={{ width: imgW, height: imgW, left: size / 2 - imgW * 0.5, top: size / 2 - imgW * 0.405 }} />
    </span>
  );
  const inner = (
    <>
      {mark}
      {wordmark && (
        <span className={s.logoText}>
          <span className={s.logoName}>MediGuide</span>
          {subtitle && <span className={s.logoSub}>{subtitle}</span>}
        </span>
      )}
    </>
  );
  const cls = cx(s.logo, className);
  if (to) return <Link to={to} className={cls} aria-label={wordmark ? undefined : 'MediGuide home'}>{inner}</Link>;
  return <span className={cls}>{inner}</span>;
}
