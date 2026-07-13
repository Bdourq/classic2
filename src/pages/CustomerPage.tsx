import { useEffect, useState, useCallback } from 'react';
import { findCustomer, redeemCoffee, getPointsLog, subscribeToCustomer } from '../lib/db';
import { Customer, PointsLog } from '../types';

const GOAL = 10;

function buildQrUrl(phone: string): string {
  const base = window.location.origin;
  return `${base}/c?id=${encodeURIComponent(phone)}`;
}

function QrImage({ phone }: { phone: string }) {
  const url = buildQrUrl(phone);
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(url)}&size=220x220&margin=10&color=4a2010&bgcolor=fdf6f0`;
  return (
    <div style={{ textAlign: 'center' }}>
      <img
        src={qrSrc}
        alt="QR Code"
        style={{ width: 160, height: 160, borderRadius: '0.75rem', border: '3px solid var(--brown-200)' }}
      />
      <p style={{ margin: '0.5rem 0 0', fontSize: '0.78rem', color: 'var(--brown-400)', direction: 'ltr' }}>
        {phone}
      </p>
    </div>
  );
}

function CoffeeProgress({ points }: { points: number }) {
  const filled = Math.min(points, GOAL);
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        {Array.from({ length: GOAL }).map((_, i) => (
          <span key={i} style={{ fontSize: '1.45rem', transition: 'filter 0.2s', filter: i < filled ? 'none' : 'grayscale(1) opacity(0.35)' }}>
            ☕
          </span>
        ))}
      </div>
      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--brown-500)' }}>
        {filled} / {GOAL} نقطة
        {points >= GOAL && <span style={{ color: '#16a34a', fontWeight: 700 }}> — استحققت قهوتك! 🎉</span>}
      </p>
    </div>
  );
}

export default function CustomerPage() {
  const params = new URLSearchParams(window.location.search);
  const phone = params.get('id') ?? '';

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [log, setLog] = useState<PointsLog[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemMsg, setRedeemMsg] = useState('');
  const [error, setError] = useState('');
  const [newPoint, setNewPoint] = useState(false);

  const loadData = useCallback(async (flash = false) => {
    if (!phone) { setError('رابط غير صحيح'); setLoading(false); return; }
    try {
      const c = await findCustomer(phone);
      if (!c) { window.location.href = '/'; return; }
      setCustomer((prev) => {
        if (flash && prev && c.points > prev.points) setNewPoint(true);
        return c;
      });
      const l = await getPointsLog(phone);
      setLog(l);
    } catch (e: any) {
      setError(e?.message ?? 'خطأ في التحميل');
    } finally {
      setLoading(false);
    }
  }, [phone]);

  useEffect(() => {
    loadData();
    const unsub = subscribeToCustomer(phone, () => loadData(true));
    return unsub;
  }, [loadData, phone]);

  useEffect(() => {
    if (newPoint) {
      const t = setTimeout(() => setNewPoint(false), 2500);
      return () => clearTimeout(t);
    }
  }, [newPoint]);

  async function handleRedeem() {
    if (!customer || customer.points < GOAL) return;
    setRedeeming(true);
    setRedeemMsg('');
    try {
      await redeemCoffee(phone);
      setRedeemMsg('تم استبدال 10 نقاط بقهوة مجانية ☕ استمتع!');
      await loadData();
    } catch (e: any) {
      setRedeemMsg('❌ ' + (e?.message ?? 'خطأ أثناء الاستبدال'));
    } finally {
      setRedeeming(false);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span className="spin" style={{ width: 36, height: 36, border: '3px solid var(--brown-200)', borderTopColor: 'var(--brown-700)', borderRadius: '50%', display: 'inline-block' }} />
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem', textAlign: 'center' }}>
        <p style={{ color: 'var(--brown-600)', fontSize: '1.1rem' }}>{error || 'لم يتم العثور على الحساب'}</p>
        <a href="/" style={{ marginTop: '1rem', color: 'var(--brown-700)', fontWeight: 700 }}>العودة للرئيسية</a>
      </div>
    );
  }

  const canRedeem = customer.points >= GOAL;

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'linear-gradient(180deg, var(--brown-900) 0%, var(--brown-800) 30%, var(--brown-50) 30%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '0 1rem 2rem',
    }}>
      {/* الهيدر */}
      <div style={{ width: '100%', maxWidth: '420px', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/" style={{ color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '0.88rem' }}>← خروج</a>
        <span style={{ color: 'white', fontWeight: 800, fontSize: '1rem' }}>☕ Classic Cafe</span>
        <div style={{ width: 40 }} />
      </div>

      {/* بطاقة رئيسية */}
      <div
        className={`cafe-card animate-in${newPoint ? ' pulse-green' : ''}`}
        style={{ width: '100%', maxWidth: '420px', marginTop: '1.5rem', padding: '1.75rem', textAlign: 'center' }}
      >
        <p style={{ margin: '0 0 0.25rem', color: 'var(--brown-500)', fontSize: '0.9rem' }}>أهلاً</p>
        <h2 style={{ margin: '0 0 0.25rem', fontSize: '1.3rem', fontWeight: 800, color: 'var(--brown-900)', direction: 'ltr' }}>
          {customer.phone}
        </h2>

        <div style={{ margin: '1.25rem 0', padding: '1rem', background: 'var(--brown-50)', borderRadius: '1rem' }}>
          <p style={{ margin: '0 0 0.1rem', color: 'var(--brown-500)', fontSize: '0.85rem' }}>رصيد نقاطك</p>
          <p style={{ margin: 0, fontSize: '3rem', fontWeight: 800, color: 'var(--brown-800)', lineHeight: 1.1 }}>
            {customer.points}
          </p>
        </div>

        <CoffeeProgress points={customer.points} />

        {newPoint && (
          <div style={{
            marginTop: '0.75rem',
            padding: '0.5rem 1rem',
            background: '#dcfce7',
            borderRadius: '0.75rem',
            color: '#15803d',
            fontWeight: 700,
            fontSize: '0.95rem',
          }}>
            +1 نقطة جديدة! ☕
          </div>
        )}

        {redeemMsg && (
          <div style={{
            marginTop: '0.75rem',
            padding: '0.6rem 1rem',
            background: redeemMsg.startsWith('❌') ? '#fee2e2' : '#dcfce7',
            borderRadius: '0.75rem',
            color: redeemMsg.startsWith('❌') ? '#dc2626' : '#15803d',
            fontWeight: 600,
            fontSize: '0.92rem',
          }}>
            {redeemMsg}
          </div>
        )}
      </div>

      {/* أزرار */}
      <div style={{ width: '100%', maxWidth: '420px', marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {canRedeem && (
          <button
            className="cafe-btn-gold"
            onClick={handleRedeem}
            disabled={redeeming}
            style={{ fontSize: '1.1rem', padding: '1rem' }}
          >
            {redeeming
              ? '⏳ جارٍ الاستبدال...'
              : '🎁 استبدال قهوة مجانية (10 نقاط)'}
          </button>
        )}

        <button className="cafe-btn-outline" onClick={() => setShowQr(!showQr)}>
          {showQr ? '🔼 إخفاء QR' : '📲 عرض رمز QR الخاص بي'}
        </button>

        <button className="cafe-btn-outline" onClick={() => setShowHistory(!showHistory)}>
          {showHistory ? '🔼 إخفاء السجل' : '📋 تاريخ النقاط'}
        </button>
      </div>

      {/* QR Code */}
      {showQr && (
        <div className="cafe-card animate-in" style={{ width: '100%', maxWidth: '420px', marginTop: '0.75rem', padding: '1.5rem', textAlign: 'center' }}>
          <p style={{ margin: '0 0 1rem', fontWeight: 700, color: 'var(--brown-800)' }}>رمز QR الخاص بي</p>
          <QrImage phone={customer.phone} />
          <p style={{ margin: '0.75rem 0 0', fontSize: '0.82rem', color: 'var(--brown-400)' }}>
            أظهر هذا الرمز للكاشير عند كل كوب ☕
          </p>
        </div>
      )}

      {/* السجل */}
      {showHistory && (
        <div className="cafe-card animate-in" style={{ width: '100%', maxWidth: '420px', marginTop: '0.75rem', padding: '1.25rem' }}>
          <p style={{ margin: '0 0 0.75rem', fontWeight: 700, color: 'var(--brown-800)', fontSize: '1rem' }}>📋 تاريخ النقاط</p>
          {log.length === 0
            ? <p style={{ textAlign: 'center', color: 'var(--brown-400)', fontSize: '0.9rem' }}>لا يوجد سجل بعد</p>
            : log.map((entry) => (
              <div key={entry.id} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.6rem 0',
                borderBottom: '1px solid var(--brown-100)',
              }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--brown-600)' }}>
                  {new Date(entry.createdAt).toLocaleDateString('ar-JO', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </span>
                <span style={{
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  color: entry.action === 'add' ? '#16a34a' : '#dc2626',
                }}>
                  {entry.action === 'add' ? '+1 ☕' : '-10 🎁'}
                </span>
              </div>
            ))
          }
        </div>
      )}
    </div>
  );
}
