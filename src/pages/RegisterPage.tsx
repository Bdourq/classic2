import { useState } from 'react';
import { findCustomer, createCustomer } from '../lib/db';
import { isSupabaseConfigured } from '../lib/supabase';

export default function RegisterPage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = phone.replace(/\s+/g, '').trim();
    if (!cleaned) { setError('أدخل رقم الهاتف'); return; }
    if (cleaned.length < 7) { setError('رقم الهاتف قصير جداً'); return; }

    setError('');
    setLoading(true);
    try {
      let customer = await findCustomer(cleaned);
      if (!customer) {
        customer = await createCustomer(cleaned);
      }
      window.location.href = `/c?id=${encodeURIComponent(cleaned)}`;
    } catch (err: any) {
      setError(err?.message ?? 'حدث خطأ، حاول مرة أخرى');
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
      background: 'linear-gradient(160deg, var(--brown-900) 0%, var(--brown-800) 60%, var(--brown-600) 100%)',
    }}>
      {/* شعار */}
      <div style={{ textAlign: 'center', marginBottom: '2rem', color: 'white' }}>
        <div style={{ fontSize: '3.5rem', lineHeight: 1 }}>☕</div>
        <h1 style={{ margin: '0.5rem 0 0.25rem', fontSize: '1.7rem', fontWeight: 800, letterSpacing: '-0.5px' }}>
          Classic Cafe
        </h1>
        <p style={{ margin: 0, opacity: 0.75, fontSize: '0.95rem' }}>نظام نقاط الولاء</p>
      </div>

      {/* البطاقة */}
      <div className="cafe-card animate-in" style={{ width: '100%', maxWidth: '380px', padding: '2rem' }}>
        {!isSupabaseConfigured && (
          <div style={{
            background: '#fef3cd', border: '1px solid #ffc107',
            borderRadius: '0.75rem', padding: '0.75rem 1rem',
            marginBottom: '1.25rem', fontSize: '0.88rem', color: '#856404',
            textAlign: 'center',
          }}>
            ⚠️ يرجى ضبط إعدادات Supabase لتشغيل التطبيق
          </div>
        )}

        <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.3rem', fontWeight: 700, color: 'var(--brown-900)', textAlign: 'center' }}>
          أهلاً بك! 👋
        </h2>
        <p style={{ margin: '0 0 1.5rem', color: 'var(--brown-500)', fontSize: '0.95rem', textAlign: 'center' }}>
          أدخل رقم هاتفك للدخول أو التسجيل
        </p>

        <form onSubmit={handleSubmit}>
          <input
            className="cafe-input"
            type="tel"
            placeholder="07XXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            inputMode="tel"
            autoFocus
            dir="ltr"
            style={{ marginBottom: error ? '0.5rem' : '1.25rem', fontSize: '1.25rem', letterSpacing: '1px' }}
          />
          {error && (
            <p style={{ color: '#dc2626', fontSize: '0.88rem', textAlign: 'center', margin: '0 0 1rem' }}>
              {error}
            </p>
          )}
          <button className="cafe-btn-primary" type="submit" disabled={loading}>
            {loading
              ? <span className="spin" style={{ display: 'inline-block', width: 20, height: 20, border: '2px solid white', borderTopColor: 'transparent', borderRadius: '50%' }} />
              : '→ دخول'}
          </button>
        </form>

        <p style={{
          marginTop: '1.25rem', textAlign: 'center',
          fontSize: '0.82rem', color: 'var(--brown-400)',
        }}>
          إذا لم يكن لديك حساب، سيُنشأ تلقائياً
        </p>
      </div>

      {/* رابط الكاشير */}
      <a
        href="/admin"
        style={{
          marginTop: '2rem',
          color: 'rgba(255,255,255,0.45)',
          fontSize: '0.82rem',
          textDecoration: 'none',
        }}
      >
        🔒 لوحة الكاشير
      </a>
    </div>
  );
}
