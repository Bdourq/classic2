import { ReactNode } from 'react';

interface HeaderProps {
  /** Element rendered at the start (right side in RTL) — e.g. a back/lock button. */
  start?: ReactNode;
  /** Element rendered at the end (left side in RTL) — usually left empty for balance. */
  end?: ReactNode;
  logoSize?: 'sm' | 'md';
}

/**
 * Shared page header — logo is always perfectly centered regardless of the
 * width of the start/end slots (CSS grid with two equal outer columns,
 * instead of flex `space-between`, which only centers the middle item when
 * both siblings share the same width).
 */
export default function Header({ start, end, logoSize = 'sm' }: HeaderProps) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: '440px',
        padding: '1.25rem 1.25rem 0',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: '0.5rem',
      }}
    >
      <div style={{ justifySelf: 'start' }}>{start}</div>
      <img
        src="/logo.jpg"
        alt="Classic Cafe"
        className={logoSize === 'sm' ? 'cc-logo-sm' : 'cc-logo'}
        style={{ justifySelf: 'center' }}
      />
      <div style={{ justifySelf: 'end' }}>{end}</div>
    </div>
  );
}
