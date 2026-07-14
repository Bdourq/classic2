import { useState, useCallback, useEffect, FormEvent } from 'react';
import { findCustomer, addPoint, redeemCoffee, getAllCustomers, deleteCustomer, getPointsLog } from '../lib/db';
import { Customer, PointsLog } from '../types';
import QRScanner from '../components/QRScanner';
import Header from '../components/Header';

const PIN: string = import.meta.env.VITE_CASHIER_PIN ?? '';
const REDEEM_GOAL = 7;
const INACTIVE_DAYS = 30;

/** عدد الأيام منذ آخر إضافة نقاط (أو الانضمام إن لم تُضف نقاط بعد) */
function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

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

  // lookup & redeem
  const [lookupPhone, setLookupPhone]       = useState('');
  const [lookupCustomer, setLookupCustomer] = useState<Customer | null>(null);
  const [lookupLog, setLookupLog]           = useState<PointsLog[]>([]);
  const [lookupLoading, setLookupLoading]   = useState(false);
  const [lookupError, setLookupError]       = useState('');
  const [redeeming, setRedeeming]           = useState(false);
  const [redeemMsg, setRedeemMsg]           = useState('');

  // customers list
  const [allCustomers, setAllCustomers]     = useState<Customer[]>([]);
  const [listLoading, setListLoading]       = useState(false);
  const [listError, setListError]           = useState('');
  const [search, setSearch]                 = useState('');
  const [showList, setShowList]             = useState(true);

  // حذف عميل غير نشط
  const [confirmDelete, setConfirmDelete]   = useState<string | null>(null);
  const [deletingPhone, setDeletingPhone]   = useState<string | null>(null);
  const [deleteError, setDeleteError]       = useState('');

  // تفاصيل عميل منتقى من القائمة
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [detailLog, setDetailLog]           = useState<PointsLog[]>([]);
  const [detailLoading, setDetailLoading]   = useState(false);

  /* ── جلب قائمة العملاء عند فتح القسم ─────────────────── */
  async function loadAllCustomers() {
    setListLoading(true); setListError('');
    try { setAllCustomers(await getAllCustomers()); }
    catch (e: any) { setListError(e?.message ?? 'خطأ أثناء تحميل العملاء'); }
    finally { setListLoading(false); }
  }

  useEffect(() => {
    if (showList && state === 'idle') loadAllCustomers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showList, state]);

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

  /* ── الاستعلام عن نقاط العميل ─────────────────────────── */
  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    const phone = lookupPhone.replace(/\s+/g, '').trim();
    if (!phone) return;
    setLookupLoading(true); setLookupError(''); setLookupCustomer(null); setLookupLog([]); setRedeemMsg('');
    try {
      const c = await findCustomer(phone);
      if (!c) { setLookupError('العميل غير مسجّل'); }
      else {
        setLookupCustomer(c);
        setLookupLog(await getPointsLog(phone));
      }
    } catch (e: any) {
      setLookupError(e?.message ?? 'خطأ أثناء الاستعلام');
    } finally { setLookupLoading(false); }
  }

  /* ── فتح تفاصيل عميل من القائمة ──────────────────────── */
  async function openCustomerDetail(c: Customer) {
    setDetailCustomer(c);
    setDetailLoading(true);
    try { setDetailLog(await getPointsLog(c.phone)); }
    catch { setDetailLog([]); }
    finally { setDetailLoading(false); }
  }

  /* ── حذف عميل غير نشط (لم تُضف له نقاط خلال 30 يوماً) ── */
  async function handleDeleteCustomer(phone: string) {
    setDeletingPhone(phone); setDeleteError('');
    try {
      await deleteCustomer(phone);
      setAllCustomers(prev => prev.filter(c => c.phone !== phone));
      setConfirmDelete(null);
    } catch (e: any) {
      setDeleteError(e?.message ?? 'تعذّر حذف العميل');
    } finally {
      setDeletingPhone(null);
    }
  }

  /* ── استبدال قهوة من لوحة الكاشير ────────────────────── */
  async function handleCashierRedeem() {
    if (!lookupCustomer || lookupCustomer.points < REDEEM_GOAL) return;
    setRedeeming(true); setRedeemMsg('');
    try {
      await redeemCoffee(lookupCustomer.phone, REDEEM_GOAL);
      const updated = await findCustomer(lookupCustomer.phone);
      setLookupCustomer(updated);
      setLookupLog(await getPointsLog(lookupCustomer.phone));
      setRedeemMsg('✅ تم الاستبدال — خُصمت 7 نقاط بنجاح');
    } catch (e: any) {
      setRedeemMsg('❌ ' + (e?.message ?? 'خطأ أثناء الاستبدال'));
    } finally { setRedeeming(false); }
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
        <p className="cc-title" style={{ margin: '0 0 0.25rem', fontSize: '1.3rem', textAlign: 'center' }}>
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
          <p style={{ margin: '0 0 0.15rem', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            <span className="cc-eyebrow" style={{ color: 'var(--gold-400)' }}>CLASSIC CAFE — CASHIER</span>
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

      {/* ── بطاقة الاستعلام والاستبدال ──────────────────── */}
      {state === 'idle' && (
        <div className="cc-card anim-in" style={{ width: '100%', maxWidth: '440px', marginTop: '0.85rem', padding: '2rem' }}>
          <p style={{ margin: '0 0 0.15rem', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            🔍 استعلام عن رصيد العميل
          </p>
          <p style={{ margin: '0 0 1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            أدخل رقم هاتف العميل لمعرفة نقاطه أو إجراء استبدال
          </p>

          <form onSubmit={handleLookup} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              className="cc-input"
              type="tel"
              inputMode="numeric"
              placeholder="رقم هاتف العميل"
              value={lookupPhone}
              onChange={(e) => { setLookupPhone(e.target.value); setLookupCustomer(null); setLookupError(''); setRedeemMsg(''); }}
              style={{ flex: 1, marginBottom: 0, direction: 'ltr', textAlign: 'left' }}
            />
            <button
              className="cc-btn-gold"
              type="submit"
              disabled={lookupLoading || !lookupPhone.trim()}
              style={{ flexShrink: 0, padding: '0 1.1rem' }}
            >
              {lookupLoading
                ? <span className="spinner" style={{ borderTopColor: 'var(--dark-900)', width: 16, height: 16, borderWidth: 2 }} />
                : 'استعلام'}
            </button>
          </form>

          {lookupError && (
            <p style={{ color: '#E57373', fontSize: '0.85rem', margin: '0 0 0.75rem', textAlign: 'center' }}>{lookupError}</p>
          )}

          {lookupCustomer && (
            <div style={{ marginTop: '0.25rem' }}>
              {/* بيانات العميل */}
              <div style={{
                background: 'rgba(201,164,60,0.07)', border: '1px solid rgba(201,164,60,0.22)',
                borderRadius: '0.85rem', padding: '1rem 1.25rem', marginBottom: '1rem',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <div>
                  {lookupCustomer.name && (
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '0.15rem' }}>
                      {lookupCustomer.name}
                    </span>
                  )}
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', direction: 'ltr', display: 'block' }}>
                    {lookupCustomer.phone}
                  </span>
                </div>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--gold-300)' }}>
                  {lookupCustomer.points} / {REDEEM_GOAL} نقاط
                </span>
              </div>

              {/* زر الاستبدال */}
              {lookupCustomer.points >= REDEEM_GOAL ? (
                <button
                  className="cc-btn-gold"
                  onClick={handleCashierRedeem}
                  disabled={redeeming}
                  style={{ fontSize: '1rem', padding: '0.9rem' }}
                >
                  {redeeming
                    ? <span className="spinner" style={{ borderTopColor: 'var(--dark-900)' }} />
                    : `🎁 استبدال قهوة مجانية (${Math.floor(lookupCustomer.points / REDEEM_GOAL)} استبدال متاح)`}
                </button>
              ) : (
                <p style={{
                  textAlign: 'center', fontSize: '0.85rem',
                  color: 'var(--text-muted)', margin: 0,
                }}>
                  باقي <b style={{ color: 'var(--gold-300)' }}>{REDEEM_GOAL - lookupCustomer.points}</b> نقاط للقهوة المجانية
                </p>
              )}

              {redeemMsg && (
                <div style={{
                  marginTop: '0.75rem', padding: '0.6rem 1rem',
                  background: redeemMsg.startsWith('❌') ? 'rgba(229,115,115,0.1)' : 'rgba(201,164,60,0.1)',
                  border: `1px solid ${redeemMsg.startsWith('❌') ? 'rgba(229,115,115,0.35)' : 'rgba(201,164,60,0.35)'}`,
                  borderRadius: '0.75rem',
                  color: redeemMsg.startsWith('❌') ? '#E57373' : 'var(--gold-300)',
                  fontWeight: 600, fontSize: '0.88rem', textAlign: 'center',
                }}>
                  {redeemMsg}
                </div>
              )}

              {/* سجل الإضافات والاستبدالات */}
              {(() => {
                const additions   = lookupLog.filter(l => l.action === 'add');
                const redemptions = lookupLog.filter(l => l.action === 'redeem');
                const fmt = (iso: string) => new Date(iso).toLocaleString('ar-JO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                const renderRows = (rows: PointsLog[], color: string) => (
                  <div style={{ maxHeight: '180px', overflowY: 'auto' }}>
                    {rows.map((l, i) => (
                      <div key={l.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '0.4rem 0.1rem',
                        borderBottom: i < rows.length - 1 ? '1px solid rgba(201,164,60,0.08)' : 'none',
                      }}>
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>{fmt(l.createdAt)}</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color }}>
                          {l.action === 'add' ? '+' : '-'}{Math.abs(l.points)} نقطة
                        </span>
                      </div>
                    ))}
                  </div>
                );
                return (
                  <div style={{ marginTop: '1.25rem', display: 'grid', gap: '0.9rem' }}>
                    <div>
                      <p style={{ margin: '0 0 0.4rem', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                        📈 سجل الإضافات {additions.length ? `(${additions.length})` : ''}
                      </p>
                      {additions.length
                        ? renderRows(additions, 'var(--gold-300)')
                        : <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-dim)' }}>لا توجد إضافات بعد</p>}
                    </div>
                    <div>
                      <p style={{ margin: '0 0 0.4rem', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                        🎁 سجل الاستبدالات {redemptions.length ? `(${redemptions.length})` : ''}
                      </p>
                      {redemptions.length
                        ? renderRows(redemptions, '#E5A05C')
                        : <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-dim)' }}>لا توجد استبدالات بعد</p>}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
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

      {/* ── قائمة العملاء المسجّلين ──────────────────────── */}
      {state === 'idle' && (
        <div className="cc-card anim-in" style={{ width: '100%', maxWidth: '440px', marginTop: '0.85rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: showList ? '1rem' : 0 }}>
            <div>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.98rem' }}>
                👥 العملاء المسجّلون
              </p>
              {!showList && (
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  جميع الأرقام التي سجّلت في النظام
                </p>
              )}
            </div>
            <button
              className="cc-btn-ghost"
              style={{ padding: '0.35rem 0.9rem', fontSize: '0.82rem', flexShrink: 0 }}
              onClick={() => setShowList(v => !v)}
            >
              {showList ? 'إخفاء ▲' : 'عرض ▼'}
            </button>
          </div>

          {showList && (
            <>
              {/* شريط البحث + زر تحديث */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.85rem' }}>
                <input
                  className="cc-input"
                  type="text"
                  placeholder="بحث بالاسم أو رقم الهاتف..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{ flex: 1, marginBottom: 0 }}
                />
                <button
                  className="cc-btn-ghost"
                  onClick={loadAllCustomers}
                  disabled={listLoading}
                  style={{ flexShrink: 0, padding: '0 0.85rem', fontSize: '0.82rem' }}
                >
                  {listLoading ? <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : '↻'}
                </button>
              </div>

              {listError && (
                <p style={{ color: '#E57373', fontSize: '0.85rem', textAlign: 'center', margin: '0.5rem 0' }}>{listError}</p>
              )}
              {deleteError && (
                <p style={{ color: '#E57373', fontSize: '0.85rem', textAlign: 'center', margin: '0.5rem 0' }}>{deleteError}</p>
              )}

              {listLoading && !allCustomers.length ? (
                <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                  <span className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
                </div>
              ) : (() => {
                const q = search.trim();
                const filtered = allCustomers.filter(c =>
                  !q || c.phone.includes(q) || (c.name ?? '').includes(q)
                );
                return filtered.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.88rem', margin: '0.75rem 0' }}>
                    {search ? 'لا توجد نتائج' : 'لا يوجد عملاء مسجّلون بعد'}
                  </p>
                ) : (
                  <>
                    <p style={{ margin: '0 0 0.6rem', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                      {filtered.length} {filtered.length === 1 ? 'عميل' : 'عملاء'}
                      {search ? ` — نتائج البحث` : ' إجمالاً'}
                    </p>
                    <div style={{ maxHeight: '380px', overflowY: 'auto', marginInline: '-0.25rem' }}>
                      {filtered.map((c, i) => {
                        const inactiveDays = daysSince(c.lastAddAt ?? c.createdAt);
                        const isInactive   = inactiveDays >= INACTIVE_DAYS;
                        const isConfirming = confirmDelete === c.phone;
                        const isDeleting   = deletingPhone === c.phone;
                        return (
                          <div key={c.phone} style={{
                            padding: '0.6rem 0.25rem',
                            borderBottom: i < filtered.length - 1 ? '1px solid rgba(201,164,60,0.1)' : 'none',
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                              {/* الجانب الأيسر — قابل للضغط لفتح التفاصيل */}
                              <div
                                style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
                                onClick={() => openCustomerDetail(c)}
                              >
                                {/* الاسم */}
                                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '0.1rem' }}>
                                  {c.name || <span style={{ color: 'var(--text-dim)', fontWeight: 400, fontStyle: 'italic' }}>بدون اسم</span>}
                                </span>
                                {/* رقم الهاتف */}
                                <span style={{ fontSize: '0.8rem', color: 'var(--gold-400)', direction: 'ltr', display: 'block', marginBottom: '0.1rem', textDecoration: 'underline', textDecorationColor: 'rgba(201,164,60,0.4)' }}>
                                  {c.phone}
                                </span>
                                {isInactive && (
                                  <span style={{ fontSize: '0.7rem', color: '#E5A05C' }}>
                                    غير نشط منذ {inactiveDays} يوم
                                  </span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                {/* النقاط */}
                                <span
                                  style={{
                                    fontWeight: 800, fontSize: '0.95rem',
                                    color: c.points > 0 ? 'var(--gold-300)' : 'var(--text-dim)',
                                    background: 'rgba(201,164,60,0.08)',
                                    border: '1px solid rgba(201,164,60,0.2)',
                                    borderRadius: '0.5rem', padding: '0.25rem 0.7rem',
                                    whiteSpace: 'nowrap', cursor: 'pointer',
                                  }}
                                  onClick={() => openCustomerDetail(c)}
                                >
                                  {c.points} نقطة ›
                                </span>
                                {isInactive && !isConfirming && (
                                  <button
                                    onClick={() => { setConfirmDelete(c.phone); setDeleteError(''); }}
                                    title="حذف العميل (غير نشط منذ أكثر من 30 يوماً)"
                                    style={{
                                      background: 'rgba(229,115,115,0.1)', border: '1px solid rgba(229,115,115,0.3)',
                                      color: '#E57373', borderRadius: '0.5rem', padding: '0.25rem 0.5rem',
                                      fontSize: '0.8rem', cursor: 'pointer', flexShrink: 0,
                                    }}
                                  >
                                    🗑️
                                  </button>
                                )}
                              </div>
                            </div>

                            {isConfirming && (
                              <div style={{
                                marginTop: '0.5rem', padding: '0.6rem 0.75rem',
                                background: 'rgba(229,115,115,0.08)', border: '1px solid rgba(229,115,115,0.3)',
                                borderRadius: '0.6rem', display: 'flex', alignItems: 'center',
                                justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap',
                              }}>
                                <span style={{ fontSize: '0.78rem', color: '#E57373' }}>
                                  حذف هذا العميل نهائياً؟ لا يمكن التراجع
                                </span>
                                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                                  <button
                                    onClick={() => handleDeleteCustomer(c.phone)}
                                    disabled={isDeleting}
                                    style={{
                                      background: '#E57373', border: 'none', color: '#1a0e0e',
                                      borderRadius: '0.45rem', padding: '0.3rem 0.7rem',
                                      fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                                    }}
                                  >
                                    {isDeleting ? '...' : 'تأكيد الحذف'}
                                  </button>
                                  <button
                                    onClick={() => setConfirmDelete(null)}
                                    disabled={isDeleting}
                                    style={{
                                      background: 'transparent', border: '1px solid var(--border)',
                                      color: 'var(--text-muted)', borderRadius: '0.45rem', padding: '0.3rem 0.7rem',
                                      fontSize: '0.78rem', cursor: 'pointer',
                                    }}
                                  >
                                    إلغاء
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
            </>
          )}
        </div>
      )}

      {/* Scanner modal */}
      {state === 'scanning' && (
        <QRScanner onScan={handleScan} onClose={() => setState('idle')} />
      )}

      {/* ── تفاصيل العميل (overlay) ──────────────────────── */}
      {detailCustomer && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          backdropFilter: 'blur(4px)',
        }}
          onClick={() => setDetailCustomer(null)}
        >
          <div
            className="cc-card anim-in"
            style={{
              width: '100%', maxWidth: '480px',
              borderRadius: '1.25rem 1.25rem 0 0',
              padding: '1.5rem 1.5rem 2rem',
              maxHeight: '90dvh', overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* رأس الـ sheet */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <div>
                <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {detailCustomer.name || <span style={{ color: 'var(--text-dim)', fontStyle: 'italic', fontWeight: 400 }}>بدون اسم</span>}
                </p>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--gold-400)', direction: 'ltr' }}>
                  {detailCustomer.phone}
                </p>
              </div>
              <button
                className="cc-btn-ghost"
                style={{ padding: '0.3rem 0.75rem', fontSize: '0.85rem' }}
                onClick={() => setDetailCustomer(null)}
              >
                ✕ إغلاق
              </button>
            </div>

            {/* بطاقة الرصيد والاستبدالات */}
            {(() => {
              const additions   = detailLog.filter(l => l.action === 'add');
              const redemptions = detailLog.filter(l => l.action === 'redeem');
              const totalRedeemed = redemptions.reduce((s, l) => s + Math.abs(l.points), 0);
              const fmt = (iso: string) =>
                new Date(iso).toLocaleString('ar-JO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

              return (
                <>
                  {/* إحصائيات سريعة */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.6rem', marginBottom: '1.25rem' }}>
                    {[
                      { label: 'الرصيد الحالي', value: `${detailCustomer.points} نقطة`, gold: true },
                      { label: 'مرات الاستبدال', value: `${redemptions.length} مرة`, gold: false },
                      { label: 'نقاط مُستبدلة', value: `${totalRedeemed}`, gold: false },
                    ].map(stat => (
                      <div key={stat.label} style={{
                        background: 'rgba(201,164,60,0.07)',
                        border: '1px solid rgba(201,164,60,0.2)',
                        borderRadius: '0.75rem', padding: '0.65rem 0.5rem',
                        textAlign: 'center',
                      }}>
                        <p style={{ margin: 0, fontSize: stat.gold ? '1.1rem' : '1rem', fontWeight: 800, color: stat.gold ? 'var(--gold-300)' : 'var(--text-primary)' }}>
                          {stat.value}
                        </p>
                        <p style={{ margin: '0.2rem 0 0', fontSize: '0.68rem', color: 'var(--text-dim)' }}>{stat.label}</p>
                      </div>
                    ))}
                  </div>

                  {detailLoading ? (
                    <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                      <span className="spinner" style={{ width: 24, height: 24, borderWidth: 2 }} />
                    </div>
                  ) : (
                    <>
                      {/* سجل الإضافات */}
                      <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                        📈 سجل الإضافات {additions.length ? `(${additions.length})` : ''}
                      </p>
                      {additions.length === 0 ? (
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: '1rem' }}>لا توجد إضافات بعد</p>
                      ) : (
                        <div style={{ marginBottom: '1.25rem' }}>
                          {additions.map((l, i) => (
                            <div key={l.id} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '0.5rem 0',
                              borderBottom: i < additions.length - 1 ? '1px solid rgba(201,164,60,0.08)' : 'none',
                            }}>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{fmt(l.createdAt)}</span>
                              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--gold-300)' }}>+{l.points} نقطة</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* سجل الاستبدالات */}
                      <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                        🎁 سجل الاستبدالات {redemptions.length ? `(${redemptions.length})` : ''}
                      </p>
                      {redemptions.length === 0 ? (
                        <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>لا توجد استبدالات بعد</p>
                      ) : (
                        <div>
                          {redemptions.map((l, i) => (
                            <div key={l.id} style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              padding: '0.5rem 0',
                              borderBottom: i < redemptions.length - 1 ? '1px solid rgba(201,164,60,0.08)' : 'none',
                            }}>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>{fmt(l.createdAt)}</span>
                              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#E5A05C' }}>−{Math.abs(l.points)} نقطة ☕</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
