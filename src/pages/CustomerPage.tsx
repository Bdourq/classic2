import { useEffect, useState, useCallback, CSSProperties } from 'react';
import { findCustomer, createCustomer, redeemCoffee, getPointsLog, subscribeToCustomer } from '../lib/db';
import { Customer, PointsLog } from '../types';

const STORAGE_KEY = 'cc_phone';

/* ─── شارة النقاط — تعرض الرصيد الكامل بدون سقف ────────── */
function PointsBadge({ points }: { points: number }) {
  const size = 190;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(201,164,60,0.14)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="url(#ccGoldRing)" strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={0} strokeLinecap="round"
        />
        <defs>
          <linearGradient id="ccGoldRing" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C9A43C" />
            <stop offset="50%" stopColor="#F5D980" />
            <stop offset="100%" stopColor="#C9A43C" />
          </linearGradient>
        </defs>
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{
          fontSize: points >= 100 ? '2.4rem' : '3rem', fontWeight: 900, lineHeight: 1,
          background: 'var(--gold-gradient)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          {points}
        </span>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>نقطة ☕</span>
      </div>
    </div>
  );
}

/* ─── تنسيق وقت النشاط: اليوم / أمس / تاريخ ───────────── */
function formatActivityTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const time = d.toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' });

  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(d, now)) return `اليوم ${time}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, yesterday)) return `أمس ${time}`;

  return `${d.toLocaleDateString('ar-JO', { day: 'numeric', month: 'short' })} ${time}`;
}

/* ─── الهيدر الثابت أعلى الصفحة: لوجو + عنوان "نقاطي" ──── */
function Hero() {
  return (
    <div className="anim-in" style={{ textAlign: 'center', margin: '2rem 0 1.5rem' }}>
      <img src="/logo.jpg" alt="Classic Cafe" className="cc-logo" style={{ marginBottom: '1rem' }} />
      <h1 style={{
        margin: '0 0 0.15rem',
        fontFamily: "'Cinzel', serif",
        fontSize: '1.6rem', fontWeight: 700, letterSpacing: '2px',
        color: 'var(--text-primary)',
      }}>
        نقاطي
      </h1>
      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>
        CLASSIC CAFE — نظام الولاء
      </p>
    </div>
  );
}

type Stage = 'need-phone' | 'loading' | 'ready' | 'error';

export default function CustomerPage() {
  const idFromUrl = new URLSearchParams(window.location.search).get('id');

  const [stage, setStage]         = useState<Stage>('loading');
  const [phone, setPhone]         = useState<string>('');
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneErr, setPhoneErr]   = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [customer, setCustomer]   = useState<Customer | null>(null);
  const [log, setLog]             = useState<PointsLog[]>([]);
  const [redeeming, setRedeeming]     = useState(false);
  const [redeemMsg, setRedeemMsg]     = useState('');
  const [redeemAmount, setRedeemAmount] = useState('');
  const [errorMsg, setErrorMsg]   = useState('');
  const [flashNew, setFlashNew]   = useState(false);
  const [flashPoints, setFlashPoints] = useState(0);

  const loadData = useCallback(async (p: string, flash = false) => {
    try {
      let c = await findCustomer(p);
      if (!c) c = await createCustomer(p);
      setCustomer(prev => {
        if (flash && prev && c!.points > prev.points) {
          setFlashPoints(c!.points - prev.points);
          setFlashNew(true);
        }
        return c;
      });
      const l = await getPointsLog(p);
      setLog(l.slice(0, 5));
      setStage('ready');
    } catch (e: any) {
      setErrorMsg(e?.message ?? 'حدث خطأ أثناء تحميل البيانات');
      setStage('error');
    }
  }, []);

  /* تحديد رقم الهاتف: من رابط QR، أو من التخزين المحلي، أو نطلبه */
  useEffect(() => {
    const stored = idFromUrl || localStorage.getItem(STORAGE_KEY) || '';
    if (stored) {
      setPhone(stored);
      setStage('loading');
      loadData(stored);
    } else {
      setStage('need-phone');
    }
  }, [idFromUrl, loadData]);

  /* تحديث لحظي عند إضافة نقطة أو الاستبدال */
  useEffect(() => {
    if (!phone) return;
    const unsub = subscribeToCustomer(phone, () => loadData(phone, true));
    return unsub;
  }, [phone, loadData]);

  useEffect(() => {
    if (flashNew) { const t = setTimeout(() => setFlashNew(false), 2800); return () => clearTimeout(t); }
  }, [flashNew]);

  function handlePhoneSubmit(e: FormEvent) {
    e.preventDefault();
    const cleaned = phoneInput.replace(/\s+/g, '').trim();
    if (!cleaned)           { setPhoneErr('أدخل رقم هاتفك'); return; }
    if (cleaned.length < 7) { setPhoneErr('رقم قصير جداً');   return; }

    setPhoneErr('');
    setSubmitting(true);
    localStorage.setItem(STORAGE_KEY, cleaned);
    setPhone(cleaned);
    setStage('loading');
    loadData(cleaned).finally(() => setSubmitting(false));
  }

  function changeNumber() {
    localStorage.removeItem(STORAGE_KEY);
    setCustomer(null); setLog([]); setPhone(''); setPhoneInput('');
    setStage('need-phone');
  }

  async function handleRedeem(e: React.FormEvent) {
    e.preventDefault();
    const pts = Math.floor(parseFloat(redeemAmount) || 0);
    if (!customer || pts <= 0 || pts > customer.points) return;
    setRedeeming(true); setRedeemMsg('');
    try {
      await redeemCoffee(phone, pts);
      const label = pts === 1 ? 'نقطة واحدة' : `${pts} نقاط`;
      setRedeemMsg(`✅ تم استبدال ${label} بنجاح!`);
      setRedeemAmount('');
      await loadData(phone);
    } catch (e: any) {
      setRedeemMsg('❌ ' + (e?.message ?? 'خطأ أثناء الاستبدال'));
    } finally { setRedeeming(false); }
  }

  const pageStyle: CSSProperties = {
    minHeight: '100dvh',
    background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(201,164,60,0.09) 0%, transparent 60%), var(--dark-900)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '0 1.25rem 2.5rem',
  };

  /* ── طلب رقم الهاتف (أول زيارة) ─────────────────────── */
  if (stage === 'need-phone') return (
    <div style={pageStyle}>
      <Hero />
      <div className="cc-card anim-in" style={{ width: '100%', maxWidth: '380px', padding: '2rem' }}>
        <p style={{ margin: '0 0 0.35rem', fontSize: '1.15rem', fontWeight: 800, textAlign: 'center', color: 'var(--text-primary)' }}>
          أهلاً بك
        </p>
        <p style={{ margin: '0 0 1.5rem', fontSize: '0.88rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          أدخل رقم هاتفك لعرض نقاطك — سيتم تذكّرك في زيارتك القادمة
        </p>
        <form onSubmit={handlePhoneSubmit}>
          <input
            className="cc-input"
            type="tel"
            inputMode="tel"
            placeholder="07XXXXXXXX"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
            autoFocus
            dir="ltr"
            style={{ marginBottom: phoneErr ? '0.5rem' : '1.25rem' }}
          />
          {phoneErr && (
            <p style={{ color: '#E57373', textAlign: 'center', fontSize: '0.85rem', margin: '0 0 1rem' }}>{phoneErr}</p>
          )}
          <button className="cc-btn-gold" type="submit" disabled={submitting}>
            {submitting ? <span className="spinner" style={{ borderTopColor: 'var(--dark-900)' }} /> : 'عرض نقاطي ←'}
          </button>
        </form>
        <p style={{ marginTop: '1.1rem', textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
          إذا لم يكن لديك حساب، سيُنشأ تلقائياً
        </p>
      </div>
      <a href="/admin" style={{ marginTop: '2rem', color: 'var(--text-dim)', fontSize: '0.8rem', textDecoration: 'none' }}>
        🔒 لوحة الكاشير
      </a>
    </div>
  );

  /* ── تحميل ────────────────────────────────────────────── */
  if (stage === 'loading') return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--dark-900)' }}>
      <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
    </div>
  );

  /* ── خطأ ──────────────────────────────────────────────── */
  if (stage === 'error' || !customer) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', background: 'var(--dark-900)' }}>
      <p style={{ color: 'var(--gold-400)', marginBottom: '1rem' }}>{errorMsg || 'حدث خطأ غير متوقع'}</p>
      <button className="cc-btn-outline" style={{ maxWidth: 220 }} onClick={changeNumber}>🔄 محاولة رقم آخر</button>
    </div>
  );

  const last4 = customer.phone.slice(-4);

  /* ── الصفحة الرئيسية: النقاط + النشاطات ──────────────── */
  return (
    <div style={pageStyle}>
      <Hero />

      {/* بطاقة الرصيد */}
      <div
        className={`cc-card anim-in${flashNew ? ' pulse-gold' : ''}`}
        style={{ width: '100%', maxWidth: '420px', padding: '2rem', textAlign: 'center' }}
      >
        <p style={{ margin: '0 0 0.2rem', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          أهلاً بك، •• {last4}
        </p>
        <p style={{ margin: '0 0 1.5rem', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
          رقم العضوية المرتبط بهاتفك
        </p>

        <PointsBadge points={customer.points} />

        {flashNew && (
          <div style={{
            marginTop: '1rem', padding: '0.6rem 1rem',
            background: 'rgba(201,164,60,0.12)', border: '1px solid rgba(201,164,60,0.4)',
            borderRadius: '0.75rem', color: 'var(--gold-300)', fontWeight: 700, fontSize: '0.92rem',
          }}>
            +{flashPoints} {flashPoints === 1 ? 'نقطة جديدة' : 'نقاط جديدة'}! ☕
          </div>
        )}
      </div>

      {/* بطاقة الاستبدال */}
      {customer.points > 0 && (
        <div className="cc-card anim-in" style={{ width: '100%', maxWidth: '420px', marginTop: '0.85rem', padding: '1.5rem' }}>
          <p style={{ margin: '0 0 0.25rem', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.98rem' }}>
            🎁 استبدال النقاط
          </p>
          <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            رصيدك الحالي: <b style={{ color: 'var(--gold-300)' }}>{customer.points}</b> نقطة — أدخل عدد النقاط التي تريد استبدالها
          </p>

          <form onSubmit={handleRedeem} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="cc-input"
              type="number"
              inputMode="numeric"
              min="1"
              max={customer.points}
              placeholder={`من 1 إلى ${customer.points}`}
              value={redeemAmount}
              onChange={(e) => { setRedeemAmount(e.target.value); setRedeemMsg(''); }}
              style={{ flex: 1, marginBottom: 0 }}
            />
            <button
              className="cc-btn-gold"
              type="submit"
              disabled={redeeming || Math.floor(parseFloat(redeemAmount) || 0) <= 0 || Math.floor(parseFloat(redeemAmount) || 0) > customer.points}
              style={{ flexShrink: 0, padding: '0 1.1rem' }}
            >
              {redeeming
                ? <span className="spinner" style={{ borderTopColor: 'var(--dark-900)', width: 16, height: 16, borderWidth: 2 }} />
                : 'استبدال'}
            </button>
          </form>

          {redeemMsg && (
            <div style={{
              marginTop: '0.75rem', padding: '0.6rem 1rem',
              background: redeemMsg.startsWith('❌') ? 'rgba(229,115,115,0.1)' : 'rgba(201,164,60,0.1)',
              border: `1px solid ${redeemMsg.startsWith('❌') ? 'rgba(229,115,115,0.35)' : 'rgba(201,164,60,0.35)'}`,
              borderRadius: '0.75rem',
              color: redeemMsg.startsWith('❌') ? '#E57373' : 'var(--gold-300)',
              fontWeight: 600, fontSize: '0.9rem',
            }}>
              {redeemMsg}
            </div>
          )}
        </div>
      )}


      {/* آخر النشاطات */}
      <div className="cc-card anim-in" style={{ width: '100%', maxWidth: '420px', marginTop: '0.85rem', padding: '1.5rem' }}>
        <p style={{ margin: '0 0 0.85rem', fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.98rem' }}>
          📋 آخر النشاطات
        </p>
        {log.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', margin: '0.5rem 0' }}>
            لا يوجد نشاط بعد — أول زيارة لك تُضاف تلقائياً هنا
          </p>
        ) : (
          log.map(entry => (
            <div key={entry.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.6rem 0', borderBottom: '1px solid rgba(201,164,60,0.1)',
            }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                {formatActivityTime(entry.createdAt)}
              </span>
              <span style={{
                fontWeight: 800, fontSize: '0.92rem',
                color: entry.action === 'add' ? 'var(--gold-300)' : '#E57373',
              }}>
                {entry.action === 'add' ? `+${entry.points} ${entry.points === 1 ? 'نقطة' : 'نقاط'} ☕` : `−${Math.abs(entry.points)} نقاط 🎁`}
              </span>
            </div>
          ))
        )}
      </div>

      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '1.5rem' }}>
        <button className="cc-btn-ghost" onClick={changeNumber}>🔄 تغيير رقم الهاتف</button>
        <a href="/admin" className="cc-btn-ghost" style={{ textDecoration: 'none' }}>🔒 لوحة الكاشير</a>
      </div>
    </div>
  );
}
