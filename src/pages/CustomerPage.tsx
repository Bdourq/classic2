import { useEffect, useState, useCallback, FormEvent, CSSProperties } from 'react';
import { findCustomer, createCustomer, getPointsLog, subscribeToCustomer } from '../lib/db';
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

/* ─── الهيدر الثابت أعلى الصفحة: بانر بعرض الصفحة الكامل بلوجو + عنوان "نقاطي" ──── */
function Hero() {
  return (
    <div className="cc-hero-banner anim-in">
      <img src="/logo.jpg" alt="Classic Cafe" className="cc-logo" style={{ marginBottom: '1.1rem' }} />
      <h1 className="cc-title" style={{ margin: '0 0 0.3rem', fontSize: '1.9rem' }}>
        نقاطي
      </h1>
      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        <span className="cc-eyebrow" style={{ color: 'var(--gold-400)' }}>CLASSIC CAFE</span>
        {' — نظام الولاء'}
      </p>
    </div>
  );
}

/* عدد النقاط اللازم لاستبدال قهوة مجانية — يطابق REDEEM_GOAL في لوحة الكاشير */
const REDEEM_GOAL = 7;

/* ─── عبارة تشجيعية فاخرة تتطور مع تراكم النقاط ─────────── */
function encouragement(points: number): { title: string; subtitle?: string } {
  if (points === 0) {
    return {
      title: 'أهلاً بك في عالم Classic Cafe ☕',
      subtitle: 'كل زيارة تقرّبك خطوة من فنجانك المجاني القادم',
    };
  }

  const cycles    = Math.floor(points / REDEEM_GOAL);
  const remainder = points % REDEEM_GOAL;
  const toNext    = REDEEM_GOAL - remainder;

  if (remainder === 0) {
    // بالضبط عند مضاعف الهدف — مكافأة جاهزة للاستبدال
    return cycles === 1
      ? { title: '🎉 وصلت لهدفك! قهوتك المجانية جاهزة', subtitle: 'اطلبها من الكاشير الآن واستمتع ☕👑' }
      : { title: `🏆 ${cycles} مكافآت متراكمة بانتظارك`, subtitle: 'ولاؤك يُصنع منه أفضل قهوة — تفضّل بالاستبدال من الكاشير' };
  }

  if (toNext === 1) {
    return { title: 'نقطة واحدة فقط! ✨', subtitle: 'وتصبح قهوتك المجانية جاهزة للاستبدال 🎉' };
  }
  if (toNext <= 3) {
    return { title: `قريباً جداً! ${toNext} نقاط تفصلك عن قهوتك المجانية`, subtitle: 'كل رشفة تقرّبك أكثر ☕✨' };
  }
  if (cycles === 0) {
    return points === 1
      ? { title: 'بداية موفقة! نقطتك الأولى في حسابك 🌱', subtitle: 'استمر، والمكافآت الجميلة قادمة' }
      : { title: `رائع! لديك ${points} نقاط وتتراكم بثبات 🌟`, subtitle: 'أنت على الطريق الصحيح نحو أول مكافأة' };
  }

  // بعد تحقيق مكافأة واحدة على الأقل، ولا يزال هناك تراكم إضافي
  return cycles >= 3
    ? { title: 'عميلنا الأغلى، ولاؤك فخرنا 💛👑', subtitle: `${points} نقطة — و${toNext} نقاط أخرى نحو مكافأتك التالية` }
    : { title: `عميل مميز يستحق أفضل القهوة ☕🏆`, subtitle: `${points} نقطة — باقي ${toNext} نقاط للمكافأة التالية` };
}

type Stage = 'need-phone' | 'loading' | 'ready' | 'error';

export default function CustomerPage() {
  const idFromUrl = new URLSearchParams(window.location.search).get('id');

  const [stage, setStage]         = useState<Stage>('loading');
  const [phone, setPhone]         = useState<string>('');
  const [phoneInput, setPhoneInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [phoneErr, setPhoneErr]   = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [customer, setCustomer]   = useState<Customer | null>(null);
  const [log, setLog]             = useState<PointsLog[]>([]);
  const [errorMsg, setErrorMsg]   = useState('');
  const [flashNew, setFlashNew]   = useState(false);
  const [flashPoints, setFlashPoints] = useState(0);

  const loadData = useCallback(async (p: string, flash = false, name?: string) => {
    try {
      let c = await findCustomer(p);
      if (!c) c = await createCustomer(p, name);
      setCustomer(prev => {
        if (flash && prev && c!.points > prev.points) {
          setFlashPoints(c!.points - prev.points);
          setFlashNew(true);
        }
        return c;
      });
      const l = await getPointsLog(p);
      setLog(l.slice(0, 20));
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
    loadData(cleaned, false, nameInput).finally(() => setSubmitting(false));
  }

  function changeNumber() {
    localStorage.removeItem(STORAGE_KEY);
    setCustomer(null); setLog([]); setPhone(''); setPhoneInput(''); setNameInput('');
    setStage('need-phone');
  }


  const pageStyle: CSSProperties = {
    minHeight: '100dvh',
    background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(201,164,60,0.09) 0%, transparent 60%), var(--dark-900)',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
  };

  const contentStyle: CSSProperties = {
    width: '100%',
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    padding: '0 1.25rem 2.5rem',
  };

  /* ── طلب رقم الهاتف (أول زيارة) ─────────────────────── */
  if (stage === 'need-phone') return (
    <div style={pageStyle}>
      <Hero />
      <div style={contentStyle}>
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
            type="text"
            placeholder="اسمك (اختياري)"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            autoFocus
            style={{ marginBottom: '0.75rem' }}
          />
          <input
            className="cc-input"
            type="tel"
            inputMode="tel"
            placeholder="07XXXXXXXX"
            value={phoneInput}
            onChange={(e) => setPhoneInput(e.target.value)}
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
      </div>
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
      <div style={contentStyle}>

      {/* بطاقة الرصيد */}
      <div
        className={`cc-card anim-in${flashNew ? ' pulse-gold' : ''}`}
        style={{ width: '100%', maxWidth: '420px', padding: '2rem', textAlign: 'center' }}
      >
        <p style={{ margin: '0 0 0.2rem', fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
          {customer.name ? `أهلاً بك، ${customer.name} ☕` : `أهلاً بك، •• ${last4}`}
        </p>
        <p style={{ margin: '0 0 1.5rem', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
          رقم العضوية المرتبط بهاتفك
        </p>

        <PointsBadge points={customer.points} />

        {/* عبارة تشجيعية */}
        {(() => {
          const { title, subtitle } = encouragement(customer.points);
          return (
            <div style={{ margin: '1.1rem 0 0' }}>
              <p style={{
                margin: 0, fontSize: '0.98rem', fontWeight: 800, lineHeight: 1.6,
                background: 'var(--gold-gradient)',
                WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
              }}>
                {title}
              </p>
              {subtitle && (
                <p style={{ margin: '0.3rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  {subtitle}
                </p>
              )}
            </div>
          );
        })()}

        {flashNew && (
          <div style={{
            marginTop: '0.85rem', padding: '0.6rem 1rem',
            background: 'rgba(201,164,60,0.12)', border: '1px solid rgba(201,164,60,0.4)',
            borderRadius: '0.75rem', color: 'var(--gold-300)', fontWeight: 700, fontSize: '0.92rem',
          }}>
            +{flashPoints} {flashPoints === 1 ? 'نقطة جديدة أُضيفت' : 'نقاط جديدة أُضيفت'}! ☕
          </div>
        )}

        {/* معادلة النقاط */}
        <div style={{
          marginTop: '1.1rem',
          background: 'rgba(201,164,60,0.07)', border: '1px solid rgba(201,164,60,0.22)',
          borderRadius: '0.85rem', padding: '0.75rem 1rem',
          fontSize: '0.83rem', color: 'var(--gold-300)', textAlign: 'center', lineHeight: 1.7,
        }}>
          كل <b>دينار</b> = <b>1 نقطة</b> &nbsp;·&nbsp; كل <b>{REDEEM_GOAL} نقاط</b> = كاسة قهوة ☕
        </div>
      </div>


      {/* السجل الكامل */}
      <div className="cc-card anim-in" style={{ width: '100%', maxWidth: '420px', marginTop: '0.85rem', padding: '1.5rem' }}>
        {/* عنوان */}
        <div style={{ marginBottom: '0.9rem' }}>
          <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.98rem' }}>
            📋 السجل
          </p>
        </div>

        {(() => {
          const filtered = log;
          if (filtered.length === 0) return (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0.75rem 0' }}>
              لا يوجد نشاط بعد
            </p>
          );
          return filtered.map((entry, i) => {
            const isAdd = entry.action === 'add';
            const pts   = Math.abs(entry.points);
            return (
              <div key={entry.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.65rem 0',
                borderBottom: i < filtered.length - 1 ? '1px solid rgba(201,164,60,0.1)' : 'none',
              }}>
                <div>
                  <span style={{
                    display: 'inline-block', fontSize: '0.7rem', fontWeight: 700,
                    padding: '0.15rem 0.45rem', borderRadius: '0.35rem', marginBottom: '0.2rem',
                    background: isAdd ? 'rgba(201,164,60,0.12)' : 'rgba(229,115,115,0.12)',
                    color: isAdd ? 'var(--gold-400)' : '#E57373',
                  }}>
                    {isAdd ? 'إضافة نقاط' : 'استبدال'}
                  </span>
                  <span style={{ display: 'block', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {formatActivityTime(entry.createdAt)}
                  </span>
                </div>
                <span style={{
                  fontWeight: 800, fontSize: '0.95rem',
                  color: isAdd ? 'var(--gold-300)' : '#E57373',
                }}>
                  {isAdd ? `+${pts}` : `−${pts}`} {pts === 1 ? 'نقطة' : 'نقاط'}
                </span>
              </div>
            );
          });
        })()}
      </div>

      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '1.5rem' }}>
        <button className="cc-btn-ghost" onClick={changeNumber}>🔄 تغيير رقم الهاتف</button>
      </div>
      </div>
    </div>
  );
}
