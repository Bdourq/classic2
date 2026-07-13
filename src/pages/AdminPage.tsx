import { useState, useCallback } from 'react';
import { findCustomer, addPoint } from '../lib/db';
import { Customer } from '../types';
import QRScanner from '../components/QRScanner';

const PIN = import.meta.env.VITE_CASHIER_PIN || '1234';

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
  // إذا كان النص مجرد رقم هاتف
  const cleaned = text.replace(/\s+/g, '').trim();
  return cleaned;
}

export default function AdminPage() {
  const [state, setState] = useState<State>('pin');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [processing, setProcessing] = useState(false);

  function handlePin(e: React.FormEvent) {
    e.preventDefault();
    if (pinInput === PIN) {
      setState('idle');
      setPinError('');
    } else {
      setPinError('رمز PIN خاطئ، حاول مجدداً');
      setPinInput('');
    }
  }

  const handleScan = useCallback(async (text: string) => {
    setState('result');
    setProcessing(true);
    setResult(null);

    const phone = extractPhone(text);
    try {
      const customer = await findCustomer(phone);
      if (!customer) {
        setResult({ phone, customer: { phone, points: 0, createdAt: '' }, success: false, message: `العميل برقم ${phone} غير مسجّل` });
        setProcessing(false);
        return;
      }
      await addPoint(phone);
      const updated = await findCustomer(phone);
      setResult({
        phone,
        customer: updated!,
        success: true,
        message: `تمت إضافة نقطة! الرصيد الجديد: ${updated!.points} نقطة ☕`,
      });
    } catch (err: any) {
      setResult({ phone, customer: { phone, points: 0, createdAt: '' }, success: false, message: err?.message ?? 'خطأ غير متوقع' });
    } finally {
      setProcessing(false);
    }
  }, []);

  // ─── شاشة PIN ───
  if (state === 'pin') {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'linear-gradient(160deg, var(--brown-950) 0%, var(--brown-900) 100%)',
      }}>
        <div className="cafe-card animate-in" style={{ width: '100%', maxWidth: '340px', padding: '2rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2.5rem' }}>🔒</div>
            <h1 style={{ margin: '0.5rem 0 0.25rem', fontSize: '1.3rem', fontWeight: 800, color: 'var(--brown-900)' }}>
              لوحة الكاشير
            </h1>
            <p style={{ margin: 0, color: 'var(--brown-500)', fontSize: '0.9rem' }}>أدخل رمز PIN للدخول</p>
          </div>

          <form onSubmit={handlePin}>
            <input
              className="cafe-input"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="••••"
              value={pinInput}
              maxLength={8}
              onChange={(e) => setPinInput(e.target.value)}
              autoFocus
              style={{ fontSize: '1.5rem', letterSpacing: '6px', marginBottom: pinError ? '0.5rem' : '1.25rem' }}
            />
            {pinError && <p style={{ color: '#dc2626', textAlign: 'center', fontSize: '0.88rem', margin: '0 0 1rem' }}>{pinError}</p>}
            <button className="cafe-btn-primary" type="submit">دخول →</button>
          </form>

          <a href="/" style={{ display: 'block', textAlign: 'center', marginTop: '1rem', color: 'var(--brown-400)', fontSize: '0.85rem', textDecoration: 'none' }}>
            ← صفحة الزبائن
          </a>
        </div>
      </div>
    );
  }

  // ─── شاشة الكاشير الرئيسية ───
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(180deg, var(--brown-900) 0%, var(--brown-800) 25%, var(--brown-50) 25%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '0 1rem 2rem',
    }}>
      {/* الهيدر */}
      <div style={{
        width: '100%', maxWidth: '420px',
        paddingTop: '1.25rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <button
          onClick={() => { setState('pin'); setPinInput(''); }}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.85rem' }}
        >
          ← خروج
        </button>
        <span style={{ color: 'white', fontWeight: 800, fontSize: '1rem' }}>☕ Classic Cafe — كاشير</span>
        <div style={{ width: 40 }} />
      </div>

      {/* البطاقة الرئيسية */}
      <div className="cafe-card animate-in" style={{ width: '100%', maxWidth: '420px', marginTop: '1.5rem', padding: '1.75rem', textAlign: 'center' }}>
        <p style={{ margin: '0 0 0.25rem', color: 'var(--brown-500)', fontSize: '0.9rem' }}>لكل كوب قهوة</p>
        <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.35rem', fontWeight: 800, color: 'var(--brown-900)' }}>
          امسح QR العميل لإضافة نقطة
        </h2>

        <button
          className="cafe-btn-primary"
          style={{ fontSize: '1.15rem', padding: '1.1rem' }}
          onClick={() => { setState('scanning'); setResult(null); }}
        >
          📷 مسح QR
        </button>

        <p style={{ marginTop: '1rem', fontSize: '0.82rem', color: 'var(--brown-400)' }}>
          سيُضاف 1 نقطة تلقائياً لكل عملية مسح
        </p>
      </div>

      {/* نتيجة المسح */}
      {state === 'result' && (
        <div className="cafe-card animate-in" style={{
          width: '100%', maxWidth: '420px', marginTop: '1rem', padding: '1.5rem', textAlign: 'center',
        }}>
          {processing ? (
            <div>
              <span className="spin" style={{ width: 32, height: 32, border: '3px solid var(--brown-200)', borderTopColor: 'var(--brown-700)', borderRadius: '50%', display: 'inline-block' }} />
              <p style={{ marginTop: '0.75rem', color: 'var(--brown-600)' }}>جارٍ المعالجة...</p>
            </div>
          ) : result ? (
            <div>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
                {result.success ? '✅' : '❌'}
              </div>
              <p style={{
                fontWeight: 700,
                fontSize: '1rem',
                color: result.success ? '#15803d' : '#dc2626',
                margin: '0 0 0.5rem',
              }}>
                {result.message}
              </p>
              {result.success && (
                <p style={{ margin: '0 0 1rem', fontSize: '0.9rem', color: 'var(--brown-600)', direction: 'ltr' }}>
                  {result.phone}
                </p>
              )}
              {result.success && result.customer.points >= 10 && (
                <div style={{
                  background: '#fef9c3', borderRadius: '0.75rem', padding: '0.6rem 1rem',
                  marginBottom: '0.75rem', fontSize: '0.9rem', color: '#854d0e',
                }}>
                  🎁 العميل وصل لـ 10 نقاط! يمكنه الاستبدال.
                </div>
              )}
              <button
                className="cafe-btn-primary"
                onClick={() => setState('idle')}
                style={{ marginTop: '0.25rem' }}
              >
                📷 مسح عميل آخر
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* Scanner */}
      {state === 'scanning' && (
        <QRScanner
          onScan={handleScan}
          onClose={() => setState('idle')}
        />
      )}
    </div>
  );
}
