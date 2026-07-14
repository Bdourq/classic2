export default function BottomNav({ active }: { active: 'customer' | 'cashier' }) {
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
      display: 'flex',
      background: 'rgba(18,14,10,0.92)',
      backdropFilter: 'blur(12px)',
      borderTop: '1px solid rgba(201,164,60,0.18)',
      boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
    }}>
      <a
        href="/"
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '0.6rem 0 calc(0.6rem + env(safe-area-inset-bottom, 0px))',
          textDecoration: 'none', gap: '0.2rem',
          borderBottom: active === 'customer' ? '2px solid var(--gold-400)' : '2px solid transparent',
          transition: 'border-color 0.2s',
        }}
      >
        <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>☕</span>
        <span style={{
          fontSize: '0.72rem', fontWeight: active === 'customer' ? 700 : 400,
          color: active === 'customer' ? 'var(--gold-400)' : 'var(--text-dim)',
        }}>
          صفحة العميل
        </span>
      </a>

      <a
        href="/admin"
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '0.6rem 0 calc(0.6rem + env(safe-area-inset-bottom, 0px))',
          textDecoration: 'none', gap: '0.2rem',
          borderBottom: active === 'cashier' ? '2px solid var(--gold-400)' : '2px solid transparent',
          transition: 'border-color 0.2s',
        }}
      >
        <span style={{ fontSize: '1.3rem', lineHeight: 1 }}>🔒</span>
        <span style={{
          fontSize: '0.72rem', fontWeight: active === 'cashier' ? 700 : 400,
          color: active === 'cashier' ? 'var(--gold-400)' : 'var(--text-dim)',
        }}>
          لوحة الكاشير
        </span>
      </a>
    </nav>
  );
}
