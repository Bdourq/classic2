/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Coffee,
  Sparkles,
  Phone,
  ArrowRight,
  Lock,
  FileText,
  Trophy,
  QrCode,
  Wifi,
  History,
  Copy,
  LogOut,
  Loader2,
  AlertTriangle
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Import Types and Components
import { Customer } from './types';
import CoffeeCup from './components/CoffeeCup';
import FallingBeans from './components/FallingBeans';
import CashierPanel from './components/CashierPanel';
import LaunchPostModal from './components/LaunchPostModal';
import QRScannerSimulator from './components/QRScannerSimulator';
import {
  fetchCustomers,
  createCustomer,
  addLoyaltyPoints,
  subscribeToLoyaltyChanges
} from './lib/db';
import { isSupabaseConfigured } from './lib/supabase';

// Brand Logo
import logoImg from './assets/images/classic_cafe_logo_1783940167982.jpg';

export default function App() {
  // Data state — يأتي الآن من Supabase (قاعدة بيانات حقيقية) بدل التخزين المحلي
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);

  const [activePhone, setActivePhone] = useState<string>(() => {
    // نحتفظ فقط برقم جوال آخر جلسة نشطة محلياً (تسجيل دخول سريع على نفس الجهاز)،
    // أما بيانات النقاط نفسها فتُقرأ دوماً من قاعدة البيانات المركزية.
    return localStorage.getItem('classic_cafe_active_phone_v2') || '';
  });

  const [loginPhone, setLoginPhone] = useState('');
  const [loginName, setLoginName] = useState('');
  const [showSignup, setShowSignup] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState('');

  // Modal & Animation States
  const [isCashierOpen, setIsCashierOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [beansTriggered, setBeansTriggered] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  const loadCustomers = useCallback(async () => {
    try {
      setIsSyncing(true);
      const data = await fetchCustomers();
      setCustomers(data);
      setLoadError('');
    } catch (err) {
      console.error(err);
      setLoadError('تعذّر الاتصال بقاعدة البيانات. تحقق من إعدادات Supabase في ملف .env.local');
    } finally {
      setIsLoading(false);
      setIsSyncing(false);
    }
  }, []);

  // التحميل الأولي + الاشتراك بالتحديثات اللحظية (Realtime)
  useEffect(() => {
    loadCustomers();
    const unsubscribe = subscribeToLoyaltyChanges(() => {
      loadCustomers();
    });
    return unsubscribe;
  }, [loadCustomers]);

  useEffect(() => {
    localStorage.setItem('classic_cafe_active_phone_v2', activePhone);
  }, [activePhone]);

  // Monitor online status to show PWA capabilities
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const activeCustomer = customers.find((c) => c.phone === activePhone);

  // Handle Login / Registration
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone.trim()) return;

    const cleanPhone = loginPhone.replace(/\s+/g, '');
    const found = customers.find((c) => c.phone === cleanPhone);

    if (found) {
      setActivePhone(cleanPhone);
      setLoginPhone('');
    } else {
      // Prompt for name to register
      setShowSignup(true);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone.trim() || !loginName.trim()) return;

    const cleanPhone = loginPhone.replace(/\s+/g, '');
    setAuthBusy(true);
    setAuthError('');
    try {
      const newCustomer = await createCustomer(cleanPhone, loginName.trim());
      setCustomers((prev) => [newCustomer, ...prev]);
      setActivePhone(cleanPhone);
      setLoginName('');
      setLoginPhone('');
      setShowSignup(false);
    } catch (err) {
      console.error(err);
      setAuthError('تعذّر إنشاء الحساب. حاول مجدداً.');
    } finally {
      setAuthBusy(false);
    }
  };

  // Add Points Trigger (from scanner or cashier)
  const handleAddPoints = async (phone: string, amount: number) => {
    const cust = customers.find((c) => c.phone === phone);
    const currentPoints = cust?.points ?? 0;
    const updatedPoints = Math.max(0, currentPoints + amount);
    const absAmt = Math.abs(amount);
    const suffix = absAmt === 1 ? 'كوب واحد' : absAmt === 2 ? 'كوبين' : 'أكواب';
    const notes =
      amount > 0
        ? `إضافة ${absAmt} ${suffix} (مسح QR)`
        : `استرداد مكافأة مجانية (-${absAmt} نقاط)`;

    try {
      await addLoyaltyPoints(phone, amount, notes);

      // Trigger Confetti if points reach 10
      if (updatedPoints >= 10 && currentPoints < 10) {
        triggerConfetti();
      }
      // If it's the active customer, trigger the falling beans animation!
      if (phone === activePhone) {
        setBeansTriggered(true);
      }

      // التحديث الفعلي للواجهة سيصل تلقائياً عبر الاشتراك اللحظي (Realtime)،
      // لكن نعيد الجلب فوراً أيضاً لضمان استجابة سريعة على نفس الجهاز.
      await loadCustomers();
    } catch (err) {
      console.error(err);
    }
  };

  // Confetti celebration
  const triggerConfetti = () => {
    const duration = 3 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 5,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ['#d4af37', '#2c1a11', '#dfb841']
      });
      confetti({
        particleCount: 5,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ['#d4af37', '#2c1a11', '#dfb841']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();
  };

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gradient-to-b from-[#080808] via-[#121212] to-[#050505] text-[#F3EFE0] font-sans relative overflow-x-hidden flex flex-col justify-between"
    >
      {/* Falling Coffee Beans Overlay */}
      <FallingBeans
        isTriggered={beansTriggered}
        onAnimationComplete={() => setBeansTriggered(false)}
      />

      {/* --- FLOATING HEADER / CONTROLS --- */}
      <header className="bg-black/80 backdrop-blur-md border-b border-[#D4AF37]/30 sticky top-0 z-30 transition-all shadow-[0_4px_25px_rgba(0,0,0,0.8)]">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-black rounded-full overflow-hidden shadow-inner border-2 border-[#d4af37] shrink-0">
              <img src={logoImg} alt="Classic Cafe Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div>
              <h1 className="font-serif font-bold text-base md:text-lg tracking-tight text-gold-gradient">كلاسيك كافيه | Classic Cafe</h1>
              <p className="text-[10px] md:text-xs text-[#EDE0D4]/70 font-bold">نظام الولاء الرقمي الفاخر بالأردن 🇯🇴☕️</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3">
            {/* PWA offline badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] md:text-xs font-bold shadow-md border ${
                isOnline
                  ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500/30'
                  : 'bg-amber-950/60 text-amber-400 border-amber-500/30'
              }`}
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>{isOnline ? 'جاهز دون إنترنت (PWA)' : 'وضع عدم الاتصال متصل'}</span>
            </div>

            {/* Launch Post Copy Shortcut */}
            <button
              onClick={() => setIsPostModalOpen(true)}
              className="bg-[#d4af37]/10 hover:bg-[#d4af37]/20 text-[#d4af37] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 border border-[#d4af37]/30 shadow-sm cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">منشور الإطلاق</span>
            </button>

            {/* Active Customer log out */}
            {activeCustomer && (
              <button
                onClick={() => setActivePhone('')}
                className="p-2 rounded-xl text-stone-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors border border-transparent hover:border-rose-950"
                title="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* --- MAIN HERO BODY --- */}
      <main className="max-w-6xl mx-auto px-4 py-8 flex-1 w-full flex flex-col justify-center items-center">
        
        {/* Connection & sync status + quick access */}
        <div className="w-full max-w-4xl bg-[#111111]/90 border border-[#D4AF37]/30 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-right shadow-xl luxury-gold-border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#D4AF37]/10 rounded-xl text-[#d4af37]">
              {isSupabaseConfigured ? (
                <Sparkles className="w-5 h-5 shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
              )}
            </div>
            {isSupabaseConfigured ? (
              <p className="text-xs text-[#EDE0D4]/90 leading-relaxed font-semibold">
                <span className="font-bold text-gold-gradient">متصل بقاعدة البيانات المركزية:</span> بيانات الزبائن والكاشير متزامنة الآن مباشرة {isSyncing && <span className="text-[#d4af37]">(جاري التحديث...)</span>}
              </p>
            ) : (
              <p className="text-xs text-amber-300 leading-relaxed font-semibold">
                لم يتم ربط قاعدة بيانات Supabase بعد — راجع ملف .env.example لتفعيل التزامن الحقيقي بين الأجهزة.
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setIsCashierOpen(true)}
              className="bg-black hover:bg-[#161616] text-[#EDE0D4] border border-[#D4AF37]/35 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-md cursor-pointer active:scale-95"
            >
              <Lock className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>دخول الكاشير</span>
            </button>
            <button
              onClick={() => setIsPostModalOpen(true)}
              className="bg-black hover:bg-[#161616] border border-[#D4AF37]/20 text-[#EDE0D4] text-xs font-bold px-3 py-2.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <Copy className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>المنشور العربي</span>
            </button>
          </div>
        </div>

        {loadError && (
          <div className="w-full max-w-4xl bg-rose-950/40 border border-rose-500/30 text-rose-300 rounded-2xl p-4 mb-6 text-xs font-semibold text-center">
            {loadError}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center gap-3 py-20 text-[#D4AF37]">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-xs font-semibold text-stone-400">جاري تحميل بيانات الولاء...</p>
          </div>
        ) : (
        <AnimatePresence mode="wait">
          {!activePhone ? (
            /* ================= WELCOME / REGISTER SCREEN ================= */
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md bg-[#0D0D0D]/90 border border-[#D4AF37]/30 rounded-3xl shadow-2xl p-6 md:p-8 space-y-6 luxury-gold-border backdrop-blur-md"
            >
              <div className="text-center space-y-3.5">
                <div className="w-24 h-24 bg-black rounded-full overflow-hidden mx-auto shadow-[0_0_20px_rgba(212,175,55,0.2)] border-2 border-[#D4AF37] shrink-0 p-0.5">
                  <img src={logoImg} alt="Classic Cafe Logo" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-xl md:text-2xl font-serif font-black text-gold-gradient">أهلاً بك في كلاسيك كافيه</h2>
                  <p className="text-[11px] text-stone-300 font-medium">سجل دخولك برقم جوالك الأردني فقط، بدون باسوورد، لتبدأ بجمع أكوابك المجانية!</p>
                </div>
              </div>

              {!showSignup ? (
                /* Phone entry */
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#EDE0D4]/80">رقم الجوال الخاص بك (الأردن):</label>
                    <div className="relative">
                      <input
                        type="tel"
                        required
                        placeholder="مثال: 0791234567"
                        value={loginPhone}
                        onChange={(e) => setLoginPhone(e.target.value)}
                        className="w-full bg-black border border-[#D4AF37]/30 rounded-2xl py-3.5 px-4 pr-11 text-sm font-mono text-left focus:outline-hidden focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-[#EDE0D4]"
                      />
                      <Phone className="absolute right-4 top-4 w-4.5 h-4.5 text-[#D4AF37]/60" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-[#B89742] via-[#F5E2A8] to-[#B89742] hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] text-stone-950 py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 group cursor-pointer"
                  >
                    <span>دخول فوري للبطاقة الرقمية</span>
                    <ArrowRight className="w-4 h-4 text-stone-950 group-hover:translate-x-[-4px] transition-transform" />
                  </button>
                </form>
              ) : (
                /* Registration entry (New number) */
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="bg-[#1A0F0A] rounded-2xl p-3 border border-[#D4AF37]/20 text-xs text-[#EDE0D4]/90 flex gap-2">
                    <Sparkles className="w-4 h-4 text-[#d4af37] shrink-0" />
                    <span>رقم الجوال هذا غير مسجل لدينا بعد! يرجى إدخال اسمك لتأسيس حساب ولاء فوري في ثانية.</span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#EDE0D4]/80">رقم الجوال:</label>
                    <input
                      type="tel"
                      disabled
                      value={loginPhone}
                      className="w-full bg-black/50 border border-[#D4AF37]/10 rounded-xl py-2.5 px-3 text-sm font-mono text-left text-stone-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#EDE0D4]/80">اسمك الكريم:</label>
                    <input
                      type="text"
                      required
                      placeholder="مثال: أحمد العبادي"
                      value={loginName}
                      onChange={(e) => setLoginName(e.target.value)}
                      className="w-full bg-black border border-[#D4AF37]/30 rounded-xl py-3 px-4 text-sm text-[#EDE0D4] focus:outline-hidden focus:border-[#d4af37]"
                    />
                  </div>

                  {authError && (
                    <p className="text-xs text-rose-400 font-semibold text-center">{authError}</p>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={authBusy}
                      className="flex-1 bg-gradient-to-r from-[#B89742] via-[#F5E2A8] to-[#B89742] text-[#1A0F0A] py-3 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {authBusy ? 'جاري التسجيل...' : 'تسجيل فوري'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSignup(false)}
                      className="bg-black hover:bg-[#121212] text-stone-300 border border-[#D4AF37]/20 px-4 py-3 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      تراجع
                    </button>
                  </div>
                </form>
              )}
            </motion.div>
          ) : (
            /* ================= CUSTOMER LOYALTY DASHBOARD ================= */
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start"
            >
              {/* Cup Visualizer Panel (Main Left Panel) */}
              <div className="lg:col-span-7 bg-[#0D0D0D]/90 border border-[#D4AF37]/30 rounded-3xl shadow-2xl p-6 flex flex-col items-center relative overflow-hidden min-h-[460px] justify-between luxury-gold-border backdrop-blur-md">
                
                {/* Welcome Back card */}
                <div className="w-full flex justify-between items-center border-b border-[#D4AF37]/15 pb-4 mb-2">
                  <div>
                    <span className="text-[10px] bg-[#d4af37]/15 text-[#d4af37] px-3 py-1 rounded-full font-bold border border-[#d4af37]/20">زبون كلاسيك المميز ✨</span>
                    <h3 className="text-lg font-serif font-black text-gold-gradient mt-1.5">{activeCustomer?.name}</h3>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-stone-400 font-medium">رقم العضوية</p>
                    <p className="text-xs font-mono font-bold text-[#EDE0D4]">{activeCustomer?.phone}</p>
                  </div>
                </div>

                {/* The Interactive Coffee Cup */}
                <CoffeeCup points={activeCustomer?.points || 0} maxPoints={10} />

                {/* Action buttons inside customer dashboard */}
                <div className="w-full mt-4 pt-4 border-t border-[#D4AF37]/20 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="flex-1 bg-gradient-to-r from-[#B89742] via-[#F5E2A8] to-[#B89742] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] text-stone-950 font-black py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer"
                  >
                    <QrCode className="w-4.5 h-4.5 stroke-[2.5]" />
                    <span>مسح رمز QR على كوبك ☕️</span>
                  </button>
                  <button
                    onClick={() => setIsCashierOpen(true)}
                    className="bg-black hover:bg-[#121212] text-[#D4AF37] border border-[#D4AF37]/35 font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer active:scale-95"
                  >
                    <Lock className="w-4 h-4" />
                    <span>لوحة الكاشير لإضافة نقاط</span>
                  </button>
                </div>
              </div>

              {/* Transactions History & Brand Perks (Right Side Panels) */}
              <div className="lg:col-span-5 space-y-6">
                {/* Visual promotion badge */}
                <div className="bg-gradient-to-b from-[#0D0D0D] to-black text-[#EDE0D4] rounded-3xl p-5 border border-[#D4AF37]/25 shadow-xl relative overflow-hidden luxury-gold-border">
                  <div className="absolute right-0 bottom-0 translate-y-4 translate-x-4 opacity-[0.03]">
                    <Coffee className="w-40 h-40" />
                  </div>
                  
                  <div className="relative space-y-3">
                    <div className="flex items-center gap-2 text-[#d4af37]">
                      <Trophy className="w-5 h-5" />
                      <span className="text-xs font-black font-serif tracking-wider">CLASSIC PERKS</span>
                    </div>
                    <h4 className="text-base font-bold leading-relaxed text-gold-gradient">كل 10 أكواب (نقاط).. تحصل على الكوب القادم مجاناً بالكامل! 🎁</h4>
                    <p className="text-xs text-stone-300 leading-relaxed font-medium">
                      لا حاجة للبطاقات الورقية بعد اليوم. فقط امسح كود الكوب واحصل على نقطتك فوراً لجمع 10 نقاط واستبدالها بكوبك المجاني من كلاسيك كافيه.
                    </p>
                  </div>
                </div>

                {/* History list */}
                <div className="bg-[#0D0D0D]/90 border border-[#D4AF37]/25 rounded-3xl shadow-xl p-5 space-y-4 luxury-gold-border">
                  <div className="flex justify-between items-center border-b border-[#D4AF37]/10 pb-3">
                    <div className="flex items-center gap-2 text-[#EDE0D4]">
                      <History className="w-4 h-4 text-[#D4AF37]/70" />
                      <h4 className="text-xs font-bold font-serif">سجل نقاطك الأخير</h4>
                    </div>
                    <span className="text-[10px] text-stone-400 font-semibold bg-[#D4AF37]/10 px-2 py-0.5 rounded-full">تحديث فوري تلقائي</span>
                  </div>

                  <div className="space-y-2.5 max-h-56 overflow-y-auto no-scrollbar">
                    {activeCustomer?.history.length === 0 ? (
                      <div className="py-8 text-center text-xs text-stone-500">
                        لا يوجد حركات بعد. قم بمسح أول كوب قهوة لك!
                      </div>
                    ) : (
                      activeCustomer?.history.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex justify-between items-center p-3 bg-black/60 rounded-xl border border-[#D4AF37]/10 text-xs hover:border-[#D4AF37]/35 transition-colors"
                        >
                          <div>
                            <p className="font-semibold text-[#EDE0D4]">{tx.notes || 'إضافة نقاط ولاء'}</p>
                            <p className="text-[10px] text-stone-500 mt-0.5 font-mono">
                              {new Date(tx.timestamp).toLocaleString('ar-SA', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: 'numeric',
                                month: 'short'
                              })}
                            </p>
                          </div>
                          <span className={`font-mono font-bold text-sm ${
                            tx.type === 'add' ? 'text-emerald-400' : 'text-rose-400'
                          }`}>
                            {tx.type === 'add' ? `+${tx.amount}` : `-${tx.amount}`}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        )}
      </main>

      {/* --- EXTRA INFORMATION AND FEATURES WALKTHROUGH --- */}
      <section className="bg-black/40 border-t border-[#D4AF37]/15 py-10 mt-12">
        <div className="max-w-4xl mx-auto px-4 space-y-8 text-center">
          <div className="space-y-2">
            <span className="text-xs text-[#d4af37] tracking-widest font-black font-serif uppercase">The Experience</span>
            <h3 className="font-serif font-black text-xl md:text-2xl text-gold-gradient">كيف تعمل تجربة كلاسيك كافيه (Classic Cafe) السحرية؟</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right">
            <div className="bg-[#0D0D0D]/90 p-5 rounded-2xl border border-[#D4AF37]/15 hover:border-[#D4AF37]/40 transition-all shadow-md luxury-gold-border space-y-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#B89742] to-[#F5E2A8] text-stone-950 flex items-center justify-center font-black font-serif">1</div>
              <h4 className="font-bold text-sm text-[#EDE0D4]">مسح QR الكوب</h4>
              <p className="text-xs text-stone-300 leading-relaxed font-medium">
                يمسح الزبون الرمز المطبوع على كوب القهوة الساخن أو البارد، لتفتح له الصفحة فورياً دون الحاجة لتطبيق أو حساب معقد.
              </p>
            </div>

            <div className="bg-[#0D0D0D]/90 p-5 rounded-2xl border border-[#D4AF37]/15 hover:border-[#D4AF37]/40 transition-all shadow-md luxury-gold-border space-y-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#B89742] to-[#F5E2A8] text-stone-950 flex items-center justify-center font-black font-serif">2</div>
              <h4 className="font-bold text-sm text-[#EDE0D4]">تساقط حبوب القهوة التفاعلي</h4>
              <p className="text-xs text-stone-300 leading-relaxed font-medium">
                في تجربة بصرية ساحرة وممتعة، تتساقط حبات القهوة وتتجمع في الكوب لتتحول لنقاط ترفع من حماسه وشوقه لزيارته القادمة.
              </p>
            </div>

            <div className="bg-[#0D0D0D]/90 p-5 rounded-2xl border border-[#D4AF37]/15 hover:border-[#D4AF37]/40 transition-all shadow-md luxury-gold-border space-y-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-[#B89742] to-[#F5E2A8] text-stone-950 flex items-center justify-center font-black font-serif">3</div>
              <h4 className="font-bold text-sm text-[#EDE0D4]">سرعة واحترافية الكاشير</h4>
              <p className="text-xs text-stone-300 leading-relaxed font-medium">
                يملك الكاشير لوحة إضافة نقاط سريعة وآمنة بـ PIN لخدمة الزبائن في ثانية، مع بقاء كافة الميزات تعمل بكفاءة حتى أوفلاين.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER CREDIT & SOCMED --- */}
      <footer className="bg-black text-[#EDE0D4]/80 py-6 text-center border-t border-[#D4AF37]/10">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full overflow-hidden border border-[#D4AF37]/30 shrink-0">
              <img src={logoImg} alt="Classic Cafe Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <span className="font-semibold text-[#EDE0D4]/60">نظام ولاء كلاسيك كافيه (Classic Cafe) الرقمي © 2026</span>
          </div>
          <div className="text-stone-400 font-semibold">
            صنع بفخر وإبداع لإثراء تجربة العملاء في الأردن 🇯🇴
          </div>
        </div>
      </footer>

      {/* --- MODALS & SLIDE-INS --- */}
      <LaunchPostModal
        isOpen={isPostModalOpen}
        onClose={() => setIsPostModalOpen(false)}
      />

      <QRScannerSimulator
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={(pts) => {
          if (activePhone) {
            handleAddPoints(activePhone, pts);
          }
        }}
      />

      {/* Cashier slide-over / overlay */}
      <AnimatePresence>
        {isCashierOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md"
            >
              <CashierPanel
                customers={customers}
                onAddPoints={handleAddPoints}
                onClose={() => setIsCashierOpen(false)}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
