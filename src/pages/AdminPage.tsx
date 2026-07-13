import { useState, useCallback, FormEvent } from 'react';
import { findCustomer, addPoint } from '../lib/db';
import { Customer } from '../types';
import QRScanner from '../components/QRScanner';
import Header from '../components/Header';

const PIN: string = import.meta.env.VITE_CASHIER_PIN ?? '';
const REDEEM_GOAL = 7;

type State = 'pin' | 'idle' | 'scanning' | 'awaiting-amount' | 'result';

interface PointResult {
  phone: string;
  customer: Customer;
  success: boolean;
  message: string;
  pointsAdded?: number;
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
  const [state, setState]           = useState<State>('pin');
  const [pinInput, setPinInput]     = useState('');
  const [pinError, setPinError]     = useState('');
  const [result, setResult]         = useState<PointResult | null>(null);
  const [processing, setProcessing] = useState(false);

  // manual entry
  const [manualPhone, setManualPhone] = useState('');
  const [amount, setAmount]           = useState('');   // dinars entered by cashier

  // after QR scan — waiting for amount
  const [scannedPhone, setScannedPhone]       = useState('');
  const [scannedCustomer, setScannedCustomer] = useState<Customer | null>(null);

  /* ── حساب النقاط: كل دينار = نقطة واحدة ──────────────── */
  function calcPoints(jd: string): number {
    return Math.floor(parseFloat(jd) || 0);
  }

  /* ── تسجيل دخول الكاشير ───────────────────────────────── */
  function handlePin(e: FormEvent) {
    e.preventDefault();
    if (pinInput === PIN) {
      setState('idle'); setPinError('');
    } else {
      setPinError('رمز PIN خاطئ'); setPinInput('');
    }
  }

  /* ── إضافة النقاط الفعلية ─────────────────────────────── */
  async function doAddPoints(phone: string, pts: number) {
    setState('result'); setProcessing(true); setResult(null);
    try {
      await addPoint(phone, pts);
      const updated = await findCustomer(phone);
      const label = pts === 1 ? 'نقطة واحدة' : `${pts} نقاط`;
      setResult({
        phone,
        customer: updated!,
        success: true,
        message: `✓ أُضيفت ${label} — الرصيد: ${updated!.points}`,
        pointsAdded: pts,
      });
    } catch (err: any) {
      const msg = err?.message ?? 'خطأ غير متوقع';
      const isPinErr = msg.toLowerCase().includes('pin') || msg.toLowerCase().includes('unauthorized');
      setResult({
        phone,
        customer: { phone, points: 0, createdAt: '' },
        success: false,
        message: isPinErr
          ? 'فشل التحقق من رمز الكاشير — تأكد أن VITE_CASHIER_PIN مطابق لـ cashier_pin في Supabase'
          : msg,
      });
    } finally {
      setProcessing(false);
    }
  }

  /* ── إدخال يدوي: هاتف + مبلغ ─────────────────────────── */
  function handleManualSubmit(e: FormEvent) {
    e.preventDefault();
    const phone = manualPhone.replace(/\s+/g, '').trim();
    const pts   = calcPoints(amount);
    if (!phone || pts <= 0) return;
    setManualPhone(''); setAmount('');
    doAddPoints(phone, pts);
  }

  /* ── مسح QR: تحديد الهاتف ثم طلب المبلغ ─────────────── */
  const handleScan = useCallback(async (text: string) => {
    setProcessing(true);
    const phone = extractPhone(text);
    try {
      const customer = await findCustomer(phone);
      if (!customer) {
        setState('result');
        setResult({
          phone,
          customer: { phone, points: 0, createdAt: '' },
          success: false,
          message: `العميل ${phone} غير مسجّل`,
        });
        return;
      }
      setScannedPhone(phone);
      setScannedCustomer(customer);
      setAmount('');
      setState('awaiting-amount');
    } catch (err: any) {
      setState('result');
      setResult({
        phone,
        customer: { phone, points: 0, createdAt: '' },
        success: false,
        message: err?.message ?? 'خطأ غير متوقع',
      });
    } finally {
      setProcessing(false);
    }
  }, []);

  /* ── تأكيد المبلغ بعد المسح ──────────────────────────── */
  function handleAmountConfirm(e: FormEvent) {
    e.preventDefault();
    const pts = calcPoints(amount);
    if (pts <= 0) return;
    doAddPoints(scannedPhone, pts);
  }

  /* ═══════════════════════════════════════════════════════
     شاشة PIN
  ═══════════════════════════════════════════════════════ */
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

  /* ═══════════════════════════════════════════════════════
     شاشة الكاشير الرئيسية
  ═══════════════════════════════════════════════════════ */
  return (
    <div style={{
      minHeight: '100dvh',
      background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(201,164,60,0.08) 0%, transparent 60%), var(--dark-900)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '0 1rem 2.5rem',
    }}>

      <Header
        start={
          <button className="cc-btn-ghost" onClick={() => { setState('pin'); setPinInput(''); }}>
            🔒 قفل
          </button>
        }
      />

      {/* ── بطاقة الإضافة اليدوية ─────────────────────── */}
      {state === 'idle' && (
        <div className="cc-card anim-in" style={{ width: '100%', maxWidth: '440px', marginTop: '1.25rem', padding: '2rem' }}>
          <p style={{ margin: '0 0 0.15rem', fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '1.5px', textAlign: 'center' }}>
            CLASSIC CAFE — CASHIER
          </p>

          <div className="cc-divider" style={{ margin: '0.85rem auto 1.75rem' }} />

          {/* معادلة النقاط */}
          <div style={{
            background: 'rgba(201,164,60,0.07)', border: '1px solid rgba(201,164,60,0.22)',
            borderRadius: '0.85rem', padding: '0.75rem 1rem', marginBottom: '1.5rem',
            fontSize: '0.83rem', color: 'var(--gold-300)', textAlign: 'center', lineHeight: 1.7,
          }}>
            كل <b>دينار</b> = <b>1 نقطة</b> &nbsp;·&nbsp; كل <b>{REDEEM_GOAL} نقاط</b> = قهوة مجانية ☕
          </div>

          {/* إدخال يدوي */}
          <p style={{ margin: '0 0 0.6rem', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            إضافة نقاط يدوياً
          </p>
          <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '1.5rem' }}>
            <input
              className="cc-input"
              type="tel"
              inputMode="numeric"
              placeholder="رقم هاتف العميل"
              value={manualPhone}
              onChange={(e) => setManualPhone(e.target.value)}
              style={{ marginBottom: 0, direction: 'ltr', textAlign: 'left' }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                className="cc-input"
                type="number"
                inputMode="decimal"
                min="1"
                step="0.5"
                placeholder="قيمة المشتريات (دينار)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ flex: 1, marginBottom: 0 }}
              />
              {amount && parseFloat(amount) > 0 && (
                <span style={{
                  flexShrink: 0, padding: '0 0.75rem',
                  fontSize: '0.82rem', color: 'var(--gold-300)',
                  fontWeight: 700, whiteSpace: 'nowrap',
                }}>
                  = {calcPoints(amount)} نقطة
                </span>
              )}
            </div>
            <button
              className="cc-btn-gold"
              type="submit"
              disabled={!manualPhone.trim() || calcPoints(amount) <= 0}
            >
              إضافة النقاط ✓
            </button>
          </form>

          {/* فاصل */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>أو</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          <button
            className="cc-btn-gold"
            style={{ fontSize: '1.1rem', padding: '1rem', maxWidth: 280, margin: '0 auto' }}
            onClick={() => { setState('scanning'); setResult(null); }}
          >
            📷 مسح QR
          </button>
        </div>
      )}

      {/* ── بطاقة إدخال المبلغ بعد مسح QR ──────────────── */}
      {state === 'awaiting-amount' && scannedCustomer && (
        <div className="cc-card anim-in" style={{ width: '100%', maxWidth: '440px', marginTop: '1.25rem', padding: '2rem' }}>
          <p style={{ margin: '0 0 1rem', fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>
            تم التعرف على العميل
          </p>

          <div style={{
            background: 'rgba(201,164,60,0.07)', border: '1px solid rgba(201,164,60,0.22)',
            borderRadius: '0.85rem', padding: '0.75rem 1rem', marginBottom: '1.5rem',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', direction: 'ltr' }}>{scannedPhone}</span>
            <span style={{ fontSize: '0.88rem', color: 'var(--gold-300)', fontWeight: 700 }}>
              {scannedCustomer.points} نقطة
            </span>
          </div>

          <form onSubmit={handleAmountConfirm} style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            <label style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>قيمة المشتريات (دينار أردني):</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <input
                className="cc-input"
                type="number"
                inputMode="decimal"
                min="1"
                step="0.5"
                placeholder="مثال: 5"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
                style={{ flex: 1, marginBottom: 0 }}
              />
              {amount && parseFloat(amount) > 0 && (
                <span style={{
                  flexShrink: 0, padding: '0 0.75rem',
                  fontSize: '0.82rem', color: 'var(--gold-300)',
                  fontWeight: 700, whiteSpace: 'nowrap',
                }}>
                  = {calcPoints(amount)} نقطة
                </span>
              )}
            </div>
            <button
              className="cc-btn-gold"
              type="submit"
              disabled={calcPoints(amount) <= 0}
            >
              تأكيد الإضافة ✓
            </button>
            <button
              className="cc-btn-ghost"
              type="button"
              onClick={() => setState('idle')}
              style={{ marginTop: '0.25rem' }}
            >
              إلغاء
            </button>
          </form>
        </div>
      )}

      {/* ── نتيجة الإضافة ────────────────────────────────── */}
      {state === 'result' && (
        <div className="cc-card anim-in" style={{ width: '100%', maxWidth: '440px', marginTop: '1.25rem', padding: '1.75rem', textAlign: 'center' }}>
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

              {result.success && result.customer.points >= REDEEM_GOAL && (
                <div style={{
                  marginTop: '0.75rem', padding: '0.65rem 1rem',
                  background: 'rgba(201,164,60,0.1)',
                  border: '1px solid rgba(201,164,60,0.35)',
                  borderRadius: '0.75rem',
                  color: 'var(--gold-300)', fontSize: '0.88rem',
                }}>
                  🎁 وصل العميل لـ {REDEEM_GOAL} نقاط — يمكنه الاستبدال
                </div>
              )}

              <p style={{ margin: '0.75rem 0 1.25rem', fontSize: '0.82rem', color: 'var(--text-dim)', direction: 'ltr' }}>
                {result.phone}
              </p>

              <button className="cc-btn-gold" onClick={() => setState('idle')}>
                عميل آخر ←
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
