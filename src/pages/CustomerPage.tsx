import { useEffect, useState, useCallback } from 'react';
import { findCustomer, redeemCoffee, getPointsLog, subscribeToCustomer } from '../lib/db';
import { Customer, PointsLog } from '../types';
import Header from '../components/Header';

const GOAL = 10;

/* رمز كوب القهوة SVG — نسخة ذهبية */
function CupIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
      <path
        d="M17 8H18C19.1046 8 20 8.89543 20 10V11C20 12.1046 19.1046 13 18 13H17"
        stroke={filled ? '#C9A43C' : 'rgba(201,164,60,0.2)'}
        strokeWidth="1.8" strokeLinecap="round"
      />
      <path
        d="M4 8H17V15C17 16.6569 15.6569 18 14 18H7C5.34315 18 4 16.6569 4 15V8Z"
        fill={filled ? 'rgba(201,164,60,0.18)' : 'transparent'}
        stroke={filled ? '#C9A43C' : 'rgba(201,164,60,0.2)'}
        strokeWidth="1.8"
      />
      <path d="M2 21H19" stroke={filled ? '#C9A43C' : 'rgba(201,164,60,0.2)'} strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M8 5C8 5 8.5 4 9.5 4C10.5 4 11 5 12 5C13 5 13.5 4 14.5 4"
        stroke={filled ? '#C9A43C' : 'rgba(201,164,60,0.15)'}
        strokeWidth="1.4" strokeLinecap="round"
      />
    </svg>
  );
}

function buildQrUrl(phone: string) {
  return `${window.location.origin}/c?id=${encodeURIComponent(phone)}`;
}

function QrImage({ phone }: { phone: string }) {
  const url = buildQrUrl(phone);
  const src = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=220x220&margin=12&color=C9A43C&bgcolor=111111`;
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        display: 'inline-block',
        padding: '12px',
        background: '#111',
        borderRadius: '1rem',
        border: '2px solid rgba(201,164,60,0.4)',
        boxShadow: '0 0 30px rgba(201,164,60,0.12)',
      }}>
        <img src={src} alt="QR" style={{ width: 160, height: 160, display: 'block', borderRadius: '0.5rem' }} />
      </div>
      <p style={{ marginTop: '0.75rem', fontSize: '0.78rem', color: 'var(--text-dim)', direction: 'ltr' }}>{phone}</p>
    </div>
  );
}

function ProgressRow({ points }: { points: number }) {
  const filled = Math.min(points, GOAL);
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.3rem', flexWrap: 'wrap' }}>
        {Array.from({ length: GOAL }).map((_, i) => (
          <span key={i}><CupIcon filled={i < filled} /></span>
        ))}
      </div>
      <p style={{ textAlign: 'center', marginTop: '0.6rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        {filled} / {GOAL}
        {points >= GOAL && (
          <span style={{ color: 'var(--gold-300)', fontWeight: 700 }}> — مبروك! استحققت قهوتك ☕</span>
        )}
      </p>
    </div>
  );
}

export default function CustomerPage() {
  const phone = new URLSearchParams(window.location.search).get('id') ?? '';

  const [customer, setCustomer]   = useState<Customer | null>(null);
  const [log, setLog]             = useState<PointsLog[]>([]);
  const [showHistory, setHistory] = useState(false);
  const [showQr, setShowQr]       = useState(false);
  const [loading, setLoading]     = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState('');
  const [error, setError]         = useState('');
  const [flashNew, setFlashNew]   = useState(false);

  const loadData = useCallback(async (flash = false) => {
    if (!phone) { setError('رابط غير صحيح'); setLoading(false); return; }
    try {
      const c = await findCustomer(phone);
      if (!c) { window.location.href = '/'; return; }
      setCustomer(prev => {
        if (flash && prev && c.points > prev.points) setFlashNew(true);
        return c;
      });
      const l = await getPointsLog(phone);
      setLog(l);
    } catch (e: any) { setError(e?.message ?? 'خطأ في التحميل'); }
    finally { setLoading(false); }
  }, [phone]);

  useEffect(() => {
    loadData();
    const unsub = subscribeToCustomer(phone, () => loadData(true));
    return unsub;
  }, [loadData, phone]);

  useEffect(() => {
    if (flashNew) { const t = setTimeout(() => setFlashNew(false), 2800); return () => clearTimeout(t); }
  }, [flashNew]);

  async function handleRedeem() {
    if (!customer || customer.points < GOAL) return;
    setRedeeming(true); setRedeemMsg('');
    try {
      await redeemCoffee(phone);
      setRedeemMsg('✅ تم استبدال 10 نقاط — استمتع بقهوتك!');
      await loadData();
    } catch (e: any) {
      setRedeemMsg('❌ ' + (e?.message ?? 'خطأ أثناء الاستبدال'));
    } finally { setRedeeming(false); }
  }

  if (loading) return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--dark-900)' }}>
      <span className="spinner" style={{ width: 36, height: 36, borderWidth: 3 }} />
    </div>
  );

  if (error || !customer) return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center', background: 'var(--dark-900)' }}>
      <p style={{ color: 'var(--gold-400)' }}>{error || 'لم يتم العثور على الحساب'}</p>
      <a href="/" style={{ marginTop: '1rem', color: 'var(--gold-300)', fontWeight: 700 }}>← العودة</a>
    </div>
  );

  const canRedeem = customer.points >= GOAL;

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(201,164,60,0.08) 0%, transparent 60%), var(--dark-900)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      paddingBottom: '2.5rem',
    }}>

      <Header
        start={<a href="/" className="cc-btn-ghost" style={{ fontSize: '0.8rem' }}>← خروج</a>}
      />

      {/* بطاقة النقاط */}
      <div
        className={`cc-card anim-in${flashNew ? ' pulse-gold' : ''}`}
        style={{ width: 'calc(100% - 2rem)', maxWidth: '440px', marginTop: '1.25rem', padding: '1.75rem', textAlign: 'center' }}
      >
        {/* الرقم */}
        <p style={{ margin: '0 0 0.15rem', fontSize: '0.85rem', color: 'var(--text-muted)', letterSpacing: '1px' }}>
          رصيد النقاط
        </p>
        <p style={{
          margin: '0 0 0.1rem',
          fontSize: '4.5rem', fontWeight: 900, lineHeight: 1,
          background: 'var(--gold-gradient)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
        }}>
          {customer.points}
        </p>
        <p style={{ margin: '0 0 1.5rem', fontSize: '0.8rem', color: 'var(--text-dim)', direction: 'ltr' }}>
          {customer.phone}
        </p>

        <div className="cc-divider" style={{ marginBottom: '1.25rem' }} />

        <ProgressRow points={customer.points} />

        {flashNew && (
          <div style={{
            marginTop: '1rem', padding: '0.6rem 1rem',
            background: 'rgba(201,164,60,0.12)',
            border: '1px solid rgba(201,164,60,0.4)',
            borderRadius: '0.75rem',
            color: 'var(--gold-300)', fontWeight: 700, fontSize: '0.92rem',
          }}>
            +1 نقطة جديدة! ☕
          </div>
        )}

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

      {/* أزرار */}
      <div style={{ width: 'calc(100% - 2rem)', maxWidth: '440px', marginTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {canRedeem && (
          <button
            className="cc-btn-gold"
            onClick={handleRedeem}
            disabled={redeeming}
            style={{ fontSize: '1.05rem', padding: '1rem' }}
          >
            {redeeming ? <span className="spinner" style={{ borderTopColor: 'var(--dark-900)' }} /> : '🎁 استبدال قهوة مجانية (10 نقاط)'}
          </button>
        )}

        <button className="cc-btn-outline" onClick={() => setShowQr(!showQr)}>
          {showQr ? '▲ إخفاء رمز QR' : '📲 رمز QR الخاص بي'}
        </button>

        <button className="cc-btn-outline" onClick={() => setHistory(!showHistory)}>
          {showHistory ? '▲ إخفاء السجل' : '📋 تاريخ النقاط'}
        </button>
      </div>

      {/* QR Code */}
      {showQr && (
        <div className="cc-card anim-in" style={{ width: 'calc(100% - 2rem)', maxWidth: '440px', marginTop: '0.75rem', padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ margin: '0 0 1.25rem', fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>
            رمز QR الخاص بك
          </p>
          <QrImage phone={customer.phone} />
          <p style={{ margin: '1rem 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            أظهره للكاشير عند كل كوب ☕
          </p>
        </div>
      )}

      {/* السجل */}
      {showHistory && (
        <div className="cc-card anim-in" style={{ width: 'calc(100% - 2rem)', maxWidth: '440px', marginTop: '0.75rem', padding: '1.25rem' }}>
          <p style={{ margin: '0 0 0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>📋 تاريخ النقاط</p>
          {log.length === 0
            ? <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>لا يوجد سجل بعد</p>
            : log.map(entry => (
              <div key={entry.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.6rem 0',
                borderBottom: '1px solid rgba(201,164,60,0.1)',
              }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  {new Date(entry.createdAt).toLocaleDateString('ar-JO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span style={{
                  fontWeight: 800, fontSize: '0.92rem',
                  color: entry.action === 'add' ? 'var(--gold-300)' : '#E57373',
                }}>
                  {entry.action === 'add' ? '+1 ☕' : '−10 🎁'}
                </span>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}
