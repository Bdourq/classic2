import { useState, FormEvent } from 'react';
import { findCustomer, createCustomer } from '../lib/db';
import { isSupabaseConfigured } from '../lib/supabase';

export default function RegisterPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cleaned = phone.replace(/\s+/g, '').trim();
    if (!cleaned)          { setError('أدخل رقم الهاتف'); return; }
    if (cleaned.length < 7){ setError('رقم قصير جداً');    return; }

    setError('');
    setLoading(true);
    try {
      let customer = await findCustomer(cleaned);
      if (!customer) customer = await createCustomer(cleaned);
      window.location.href = `/c?id=${encodeURIComponent(cleaned)}`;
    } catch (err: any) {
      setError(err?.message ?? 'حدث خطأ، حاول مجدداً');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '1.5rem',
      background: 'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(201,164,60,0.10) 0%, transparent 65%), var(--dark-900)',
    }}>

      {/* شعار */}
      <div className="anim-in" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <img src="/logo.jpg" alt="Classic Cafe" className="cc-logo" style={{ marginBottom: '1.25rem' }} />

        <h1 style={{
          margin: '0 0 0.2rem',
          fontFamily: "'Cinzel', serif",
          fontSize: '1.5rem',
          fontWeight: 700,
          letterSpacing: '3px',
          textTransform: 'uppercase',
          background: 'var(--gold-gradient)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          CLASSIC CAFE
        </h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.88rem', letterSpacing: '2px' }}>
          نظام نقاط الولاء
        </p>
      </div>

      {/* خط ذهبي */}
      <div className="cc-divider" style={{ maxWidth: 320, marginBottom: '2rem' }} />

      {/* بطاقة الدخول */}
      <div className="cc-card anim-in" style={{ width: '100%', maxWidth: '360px', padding: '2rem', animationDelay: '0.05s' }}>

        {!isSupabaseConfigured && (
          <div style={{
            background: 'rgba(201,164,60,0.08)',
            border: '1px solid rgba(201,164,60,0.3)',
            borderRadius: '0.75rem',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            fontSize: '0.85rem',
            color: 'var(--gold-300)',
            textAlign: 'center',
          }}>
            ⚠️ يرجى ضبط إعدادات Supabase
          </div>
        )}

        <p style={{
          margin: '0 0 0.35rem',
          fontSize: '1.25rem',
          fontWeight: 800,
          color: 'var(--text-primary)',
          textAlign: 'center',
        }}>
          أهلاً بك
        </p>
        <p style={{ margin: '0 0 1.75rem', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
          أدخل رقم هاتفك للدخول أو التسجيل
        </p>

        <form onSubmit={handleSubmit}>
          <input
            className="cc-input"
            type="tel"
            placeholder="07XXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            autoFocus
            dir="ltr"
            style={{ marginBottom: error ? '0.5rem' : '1.25rem' }}
          />

          {error && (
            <p style={{
              color: '#E57373',
              fontSize: '0.85rem',
              textAlign: 'center',
              margin: '0 0 1rem',
            }}>
              {error}
            </p>
          )}

          <button className="cc-btn-gold" type="submit" disabled={loading}>
            {loading ? <span className="spinner" style={{ borderTopColor: 'var(--dark-900)' }} /> : 'دخول ←'}
          </button>
        </form>

        <p style={{
          marginTop: '1.25rem',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: 'var(--text-dim)',
        }}>
          إذا لم يكن لديك حساب، سيُنشأ تلقائياً
        </p>
      </div>

      {/* رابط الكاشير */}
      <a href="/admin" style={{
        marginTop: '2.5rem',
        color: 'var(--text-dim)',
        fontSize: '0.8rem',
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        transition: 'color 0.2s',
      }}
      onMouseEnter={e => (e.currentTarget.style.color = 'var(--gold-400)')}
      onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-dim)')}
      >
        🔒 لوحة الكاشير
      </a>
    </div>
  );
}
