import { useState, useCallback, FormEvent } from 'react';
import { findCustomer, addPoint } from '../lib/db';
import { Customer } from '../types';
import QRScanner from '../components/QRScanner';
import Header from '../components/Header';

const PIN: string = import.meta.env.VITE_CASHIER_PIN ?? '';

type State = 'pin' | 'idle' | 'scanning' | 'result';

interface ScanResult {
  phone: string;
  customer: Customer;
  success: boolean;
  message: string;
}

function extractPhone(text: string): string {
  try {
    const url = new URL(text);
    const id = url.searchParams.get('id');
    if (id) return id;
  } catch {}
  return text.replace(/\s+/g, '').trim();
}

export default function AdminPage() {
  const [state, setState]       = useState<State>('pin');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [result, setResult]     = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);

  function handlePin(e: FormEvent) {
    e.preventDefault();
    if (pinInput === PIN) {
      setState('idle'); setPinError('');
    } else {
      setPinError('رمز PIN خاطئ'); setPinInput('');
    }
  }

  const handleScan = useCallback(async (text: string) => {
    setState('result'); setProcessing(true); setResult(null);
    const phone = extractPhone(text);
    try {
      const customer = await findCustomer(phone);
      if (!customer) {
        setResult({ phone, customer: { phone, points: 0, createdAt: '' }, success: false, message: `العميل ${phone} غير مسجّل` });
        return;
      }
      await addPoint(phone, PIN);
      const updated = await findCustomer(phone);
      setResult({ phone, customer: updated!, success: true, message: `✓ نقطة أُضيفت — الرصيد: ${updated!.points}` });
    } catch (err: any) {
      setResult({ phone, customer: { phone, points: 0, createdAt: '' }, success: false, message: err?.message ?? 'خطأ غير متوقع' });
    } finally { setProcessing(false); }
  }, []);

  /* ── شاشة PIN ───────────────────────── */
  if (state === 'pin') return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '1.5rem',
      background: 'radial-gradient(ellipse 80% 50% at 50% 10%, rgba(201,164,60,0.10) 0%, transparent 60%), var(--dark-900)',
    }}>
      <img src="/logo.jpg" alt="Classic Cafe" className="cc-logo" style={{ marginBottom: '1.5rem' }} />

      <div className="cc-card anim-in" style={{ width: '100%', maxWidth: '320px', padding: '2rem' }}>
        <p style={{ margin: '0 0 0.25rem', fontSize: '1.15rem', fontWeight: 800, textAlign: 'center', color: 'var(--text-primary)' }}>
          لوحة الكاشير
        </p>
        <p style={{ margin: '0 0 1.75rem', fontSize: '0.88rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          أدخل رمز PIN للدخول
        </p>

        <form onSubmit={handlePin}>
          <input
            className="cc-input"
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="••••"
            value={pinInput}
            maxLength={8}
            onChange={(e) => setPinInput(e.target.value)}
            autoFocus
            style={{ fontSize: '1.6rem', letterSpacing: '8px', marginBottom: pinError ? '0.5rem' : '1.25rem' }}
          />
          {pinError && (
            <p style={{ color: '#E57373', textAlign: 'center', fontSize: '0.85rem', margin: '0 0 1rem' }}>{pinError}</p>
          )}
          <button className="cc-btn-gold" type="submit">دخول ←</button>
        </form>

        <a href="/" style={{ display: 'block', textAlign: 'center', marginTop: '1.25rem', color: 'var(--text-dim)', fontSize: '0.82rem', textDecoration: 'none' }}>
          ← صفحة العملاء
        </a>
      </div>
    </div>
  );

  /* ── شاشة الكاشير الرئيسية ─────────── */
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(201,164,60,0.08) 0%, transparent 60%), var(--dark-900)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '0 1rem 2.5rem',
    }}>

      <Header
        start={
          <button
            className="cc-btn-ghost"
            onClick={() => { setState('pin'); setPinInput(''); }}
          >
            🔒 قفل
          </button>
        }
      />

      {/* بطاقة المسح */}
      <div className="cc-card anim-in" style={{ width: '100%', maxWidth: '440px', marginTop: '1.25rem', padding: '2rem', textAlign: 'center' }}>
        <p style={{ margin: '0 0 0.2rem', fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '1.5px' }}>
          CLASSIC CAFE — CASHIER
        </p>

        <div className="cc-divider" style={{ margin: '0.85rem auto 1.5rem' }} />

        <p style={{ margin: '0 0 1.75rem', fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
          امسح رمز QR العميل
          <br />
          <span style={{ fontSize: '0.85rem', fontWeight: 400, color: 'var(--text-muted)' }}>
            تُضاف نقطة واحدة تلقائياً
          </span>
        </p>

        <button
          className="cc-btn-gold"
          style={{ fontSize: '1.15rem', padding: '1.1rem', maxWidth: 280, margin: '0 auto' }}
          onClick={() => { setState('scanning'); setResult(null); }}
        >
          📷 مسح QR
        </button>
      </div>

      {/* نتيجة المسح */}
      {state === 'result' && (
        <div className={`cc-card anim-in`} style={{ width: '100%', maxWidth: '440px', marginTop: '0.85rem', padding: '1.75rem', textAlign: 'center' }}>
          {processing ? (
            <div style={{ padding: '0.75rem 0' }}>
              <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3 }} />
              <p style={{ marginTop: '0.75rem', color: 'var(--text-muted)' }}>جارٍ المعالجة...</p>
            </div>
          ) : result ? (
            <>
              <p style={{
                fontWeight: 800, fontSize: '1.1rem',
                color: result.success ? 'var(--gold-300)' : '#E57373',
                margin: '0 0 0.5rem',
              }}>
                {result.message}
              </p>

              {result.success && result.customer.points >= 10 && (
                <div style={{
                  marginTop: '0.75rem', padding: '0.65rem 1rem',
                  background: 'rgba(201,164,60,0.1)',
                  border: '1px solid rgba(201,164,60,0.35)',
                  borderRadius: '0.75rem',
                  color: 'var(--gold-300)', fontSize: '0.88rem',
                }}>
                  🎁 وصل العميل لـ 10 نقاط — يمكنه الاستبدال
                </div>
              )}

              <p style={{ margin: '0.75rem 0 1.25rem', fontSize: '0.82rem', color: 'var(--text-dim)', direction: 'ltr' }}>
                {result.phone}
              </p>

              <button className="cc-btn-gold" onClick={() => setState('idle')}>
                📷 مسح عميل آخر
              </button>
            </>
          ) : null}
        </div>
      )}

      {/* Scanner modal */}
      {state === 'scanning' && (
        <QRScanner onScan={handleScan} onClose={() => setState('idle')} />
      )}
    </div>
  );
}
