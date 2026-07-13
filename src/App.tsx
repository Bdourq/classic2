/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Coffee,
  Sparkles,
  Phone,
  ArrowRight,
  Lock,
  FileText,
  Check,
  Trophy,
  QrCode,
  Wifi,
  History,
  Copy,
  LogOut,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import confetti from 'canvas-confetti';

// Import Types and Components
import { Customer, LoyaltyTransaction } from './types';
import CoffeeCup from './components/CoffeeCup';
import FallingBeans from './components/FallingBeans';
import CashierPanel from './components/CashierPanel';
import LaunchPostModal from './components/LaunchPostModal';
import QRScannerSimulator from './components/QRScannerSimulator';

// Brand Logo
import logoImg from './assets/images/classic_cafe_logo_1783940167982.jpg';

// Default mock customers for immediate testing
const DEFAULT_CUSTOMERS: Customer[] = [
  {
    phone: '0791234567',
    name: 'قصي البدور',
    points: 7,
    createdAt: new Date(2026, 6, 1).toISOString(),
    history: [
      { id: '1', amount: 3, timestamp: new Date(2026, 6, 2).toISOString(), type: 'add', notes: 'شراء 3 أكواب كولد برو كلاسيك' },
      { id: '2', amount: 4, timestamp: new Date(2026, 6, 8).toISOString(), type: 'add', notes: 'شراء 4 أكواب لاتيه محمص' }
    ]
  },
  {
    phone: '0789876543',
    name: 'سارة الطراونة',
    points: 9,
    createdAt: new Date(2026, 6, 5).toISOString(),
    history: [
      { id: '3', amount: 5, timestamp: new Date(2026, 6, 6).toISOString(), type: 'add', notes: 'شراء 5 أكواب فلات وايت' },
      { id: '4', amount: 4, timestamp: new Date(2026, 6, 10).toISOString(), type: 'add', notes: 'شراء 4 أكواب كابتشينو' }
    ]
  },
  {
    phone: '0771112223',
    name: 'يزن القضاة',
    points: 2,
    createdAt: new Date(2026, 6, 11).toISOString(),
    history: [
      { id: '5', amount: 2, timestamp: new Date(2026, 6, 12).toISOString(), type: 'add', notes: 'شراء كوبين أمريكانو بارد' }
    ]
  }
];

export default function App() {
  // Persistence state
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem('classic_cafe_customers_v2');
    return saved ? JSON.parse(saved) : DEFAULT_CUSTOMERS;
  });

  const [activePhone, setActivePhone] = useState<string>(() => {
    return localStorage.getItem('classic_cafe_active_phone_v2') || '';
  });

  const [loginPhone, setLoginPhone] = useState('');
  const [loginName, setLoginName] = useState('');
  const [showSignup, setShowSignup] = useState(false);

  // Modal & Animation States
  const [isCashierOpen, setIsCashierOpen] = useState(false);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [beansTriggered, setBeansTriggered] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Sync to localstorage
  useEffect(() => {
    localStorage.setItem('classic_cafe_customers_v2', JSON.stringify(customers));
  }, [customers]);

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
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone.trim()) return;

    // Clean phone input
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

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginPhone.trim() || !loginName.trim()) return;

    const cleanPhone = loginPhone.replace(/\s+/g, '');
    const newCustomer: Customer = {
      phone: cleanPhone,
      name: loginName.trim(),
      points: 0,
      createdAt: new Date().toISOString(),
      history: []
    };

    setCustomers((prev) => [...prev, newCustomer]);
    setActivePhone(cleanPhone);
    setLoginName('');
    setLoginPhone('');
    setShowSignup(false);
  };

  // Add Points Trigger (from scanner or cashier)
  const handleAddPoints = (phone: string, amount: number) => {
    setCustomers((prev) => {
      return prev.map((cust) => {
        if (cust.phone === phone) {
          const updatedPoints = Math.max(0, cust.points + amount);
          
          // Trigger Confetti if points reach 10
          if (updatedPoints >= 10 && cust.points < 10) {
            triggerConfetti();
          }

          const absAmt = Math.abs(amount);
          const suffix = absAmt === 1 ? 'كوب واحد' : absAmt === 2 ? 'كوبين' : 'أكواب';
          const newTx: LoyaltyTransaction = {
            id: Math.random().toString(),
            amount: absAmt,
            timestamp: new Date().toISOString(),
            type: amount > 0 ? 'add' : 'redeem',
            notes: amount > 0 
              ? `إضافة ${absAmt} ${suffix} (مسح QR)` 
              : `استرداد كوب مجاني (-${absAmt} نقاط)`
          };

          return {
            ...cust,
            points: updatedPoints,
            history: [newTx, ...cust.history]
          };
        }
        return cust;
      });
    });

    // If it's the active customer, trigger the falling beans animation!
    if (phone === activePhone) {
      setBeansTriggered(true);
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
      className="min-h-screen bg-[#1A0F0A] text-[#EDE0D4] font-sans relative overflow-x-hidden flex flex-col justify-between"
    >
      {/* Falling Coffee Beans Overlay */}
      <FallingBeans
        isTriggered={beansTriggered}
        onAnimationComplete={() => setBeansTriggered(false)}
      />

      {/* --- FLOATING HEADER / CONTROLS --- */}
      <header className="bg-[#2B1B12]/80 backdrop-blur-md border-b border-[#D4AF37]/20 sticky top-0 z-30 transition-all">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-[#1A0F0A] rounded-full overflow-hidden shadow-inner border border-[#d4af37]/40 shrink-0">
              <img src={logoImg} alt="Classic Cafe Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
            <div>
              <h1 className="font-bold text-base md:text-lg tracking-tight text-[#EDE0D4]">كلاسيك كافيه | Classic Cafe</h1>
              <p className="text-[10px] md:text-xs text-[#EDE0D4]/60 font-semibold">نظام الولاء الرقمي في الأردن 🇯🇴☕️</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 md:gap-3">
            {/* PWA offline badge */}
            <div
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold shadow-2xs border ${
                isOnline
                  ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/30'
                  : 'bg-amber-950/40 text-amber-400 border-amber-800/30'
              }`}
            >
              <Wifi className="w-3.5 h-3.5" />
              <span>{isOnline ? 'يعمل دون إنترنت (PWA)' : 'وضع عدم الاتصال متصل'}</span>
            </div>

            {/* Launch Post Copy Shortcut */}
            <button
              onClick={() => setIsPostModalOpen(true)}
              className="bg-[#d4af37]/10 hover:bg-[#d4af37]/20 text-[#d4af37] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 border border-[#d4af37]/20"
            >
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">منشور الإطلاق</span>
            </button>

            {/* Active Customer log out */}
            {activeCustomer && (
              <button
                onClick={() => setActivePhone('')}
                className="p-2 rounded-xl text-stone-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
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
        
        {/* Dynamic Dual simulation notice */}
        <div className="w-full max-w-4xl bg-[#2B1B12] border border-[#D4AF37]/30 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-right shadow-md">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#d4af37] shrink-0" />
            <p className="text-xs text-[#EDE0D4]/90 leading-relaxed font-semibold">
              <span className="font-bold text-[#EDE0D4]">بيئة تجريبية تفاعلية:</span> يمكنك لعب دور <span className="text-[#d4af37]">الزبون</span> (مسح الأكواب ورؤية العداد الذهبي) ودور <span className="text-[#D4AF37]">الكاشير</span> (إضافة النقاط برمز الـ PIN) في نفس الوقت!
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setIsCashierOpen(true)}
              className="bg-[#1A0F0A] hover:bg-[#2B1B12] text-[#EDE0D4] border border-[#D4AF37]/30 text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-colors shadow-sm cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>دخول الكاشير</span>
            </button>
            <button
              onClick={() => setIsPostModalOpen(true)}
              className="bg-[#1A0F0A] hover:bg-[#2B1B12] border border-[#D4AF37]/20 text-[#EDE0D4] text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-[#d4af37]" />
              <span>المنشور العربي</span>
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {!activePhone ? (
            /* ================= WELCOME / REGISTER SCREEN ================= */
            <motion.div
              key="login"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="w-full max-w-md bg-[#2B1B12] border border-[#D4AF37]/30 rounded-3xl shadow-xl p-6 md:p-8 space-y-6"
            >
              <div className="text-center space-y-2">
                <div className="w-20 h-20 bg-[#1A0F0A] rounded-full overflow-hidden mx-auto shadow-inner border border-[#D4AF37]/30 shrink-0">
                  <img src={logoImg} alt="Classic Cafe Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-[#EDE0D4]">أهلاً بك في كلاسيك كافيه</h2>
                <p className="text-xs text-stone-400">سجل دخولك برقم جوالك الأردني فقط، بدون باسوورد، لتبدأ بجمع أكوابك المجانية!</p>
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
                        className="w-full bg-[#1A0F0A] border border-[#D4AF37]/30 rounded-2xl py-3.5 px-4 pr-11 text-sm font-mono text-left focus:outline-hidden focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all text-[#EDE0D4]"
                      />
                      <Phone className="absolute right-4 top-4 w-4.5 h-4.5 text-stone-500" />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-[#D4AF37] hover:bg-[#dfb841] text-[#1A0F0A] py-3.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md active:scale-95 group cursor-pointer"
                  >
                    <span>دخول فوري</span>
                    <ArrowRight className="w-4 h-4 text-[#1A0F0A] group-hover:translate-x-[-4px] transition-transform" />
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
                      className="w-full bg-[#1A0F0A]/50 border border-[#D4AF37]/10 rounded-xl py-2 px-3 text-sm font-mono text-left text-stone-400"
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
                      className="w-full bg-[#1A0F0A] border border-[#D4AF37]/30 rounded-xl py-3 px-4 text-sm text-[#EDE0D4] focus:outline-hidden focus:border-[#d4af37]"
                    />
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="flex-1 bg-[#D4AF37] hover:bg-[#dfb841] text-[#1A0F0A] py-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
                    >
                      تسجيل فوري
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSignup(false)}
                      className="bg-[#2B1B12] hover:bg-[#1A0F0A] text-stone-300 border border-[#D4AF37]/20 px-4 py-3 rounded-xl text-xs transition-colors cursor-pointer"
                    >
                      تراجع
                    </button>
                  </div>
                </form>
              )}

              {/* Demo users list for convenience */}
              <div className="pt-4 border-t border-[#D4AF37]/20 space-y-2">
                <p className="text-[10px] font-bold text-stone-400">حسابات تجريبية معدّة مسبقاً للدخول الفوري:</p>
                <div className="flex flex-wrap gap-1.5">
                  {DEFAULT_CUSTOMERS.map((cust) => (
                    <button
                      key={cust.phone}
                      onClick={() => {
                        setActivePhone(cust.phone);
                        setLoginPhone('');
                        setShowSignup(false);
                      }}
                      className="bg-[#1A0F0A] hover:bg-[#2B1B12] text-[#EDE0D4] border border-[#D4AF37]/20 rounded-lg px-2.5 py-1 text-[10px] font-mono transition-colors cursor-pointer"
                    >
                      {cust.name} ({cust.phone})
                    </button>
                  ))}
                </div>
              </div>
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
              <div className="lg:col-span-7 bg-[#2B1B12] border border-[#D4AF37]/20 rounded-3xl shadow-xl p-6 flex flex-col items-center relative overflow-hidden min-h-[460px] justify-between">
                
                {/* Welcome Back card */}
                <div className="w-full flex justify-between items-center border-b border-[#D4AF37]/15 pb-4 mb-2">
                  <div>
                    <span className="text-[10px] bg-[#d4af37]/10 text-[#d4af37] px-2 py-0.5 rounded-full font-bold">زبون كلاسيك المميز ✨</span>
                    <h3 className="text-lg font-bold text-[#EDE0D4] mt-1">{activeCustomer?.name}</h3>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-stone-400">رقم العضوية</p>
                    <p className="text-xs font-mono font-bold text-[#EDE0D4]">{activeCustomer?.phone}</p>
                  </div>
                </div>

                {/* The Interactive Coffee Cup */}
                <CoffeeCup points={activeCustomer?.points || 0} maxPoints={10} />

                {/* Action buttons inside customer dashboard */}
                <div className="w-full mt-4 pt-4 border-t border-[#D4AF37]/20 flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setIsScannerOpen(true)}
                    className="flex-1 bg-gradient-to-r from-[#d4af37] to-[#dfb841] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] text-stone-950 font-black py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md cursor-pointer"
                  >
                    <QrCode className="w-4.5 h-4.5 stroke-[2.5]" />
                    <span>مسح رمز QR على كوبك ☕️</span>
                  </button>
                  <button
                    onClick={() => setIsCashierOpen(true)}
                    className="bg-[#1A0F0A] hover:bg-[#2B1B12] text-[#D4AF37] border border-[#D4AF37]/30 font-bold py-3.5 rounded-2xl text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span>لوحة الكاشير لإضافة نقاط</span>
                  </button>
                </div>
              </div>

              {/* Transactions History & Brand Perks (Right Side Panels) */}
              <div className="lg:col-span-5 space-y-6">
                {/* Visual promotion badge */}
                <div className="bg-gradient-to-b from-[#2B1B12] to-[#1A0F0A] text-[#EDE0D4] rounded-3xl p-5 border border-[#D4AF37]/30 shadow-lg relative overflow-hidden">
                  <div className="absolute right-0 bottom-0 translate-y-4 translate-x-4 opacity-10">
                    <Coffee className="w-40 h-40" />
                  </div>
                  
                  <div className="relative space-y-3">
                    <div className="flex items-center gap-2 text-[#d4af37]">
                      <Trophy className="w-5 h-5" />
                      <span className="text-xs font-bold">العرض الذهبي المستمر</span>
                    </div>
                    <h4 className="text-base font-bold leading-relaxed">كل 10 أكواب (نقاط).. تحصل على الكوب القادم مجاناً بالكامل! 🎁</h4>
                    <p className="text-xs text-[#EDE0D4]/70 leading-relaxed">
                      لا حاجة للبطاقات الورقية بعد اليوم. فقط امسح كود الكوب واحصل على نقطتك فوراً لجمع 10 نقاط واستبدالها بكوبك المجاني من كلاسيك كافيه.
                    </p>
                  </div>
                </div>

                {/* History list */}
                <div className="bg-[#2B1B12] border border-[#D4AF37]/20 rounded-3xl shadow-xl p-5 space-y-4">
                  <div className="flex justify-between items-center border-b border-[#D4AF37]/10 pb-3">
                    <div className="flex items-center gap-2 text-[#EDE0D4]">
                      <History className="w-4 h-4 text-[#D4AF37]/70" />
                      <h4 className="text-xs font-bold">سجل نقاطك الأخير</h4>
                    </div>
                    <span className="text-[10px] text-stone-500 font-semibold">تحديث فوري تلقائي</span>
                  </div>

                  <div className="space-y-2.5 max-h-56 overflow-y-auto">
                    {activeCustomer?.history.length === 0 ? (
                      <div className="py-8 text-center text-xs text-stone-500">
                        لا يوجد حركات بعد. قم بمسح أول كوب قهوة لك!
                      </div>
                    ) : (
                      activeCustomer?.history.map((tx) => (
                        <div
                          key={tx.id}
                          className="flex justify-between items-center p-2.5 bg-[#1A0F0A]/60 rounded-xl border border-[#D4AF37]/10 text-xs"
                        >
                          <div>
                            <p className="font-semibold text-[#EDE0D4]">{tx.notes || 'إضافة نقاط ولاء'}</p>
                            <p className="text-[10px] text-stone-500 mt-0.5">
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
      </main>

      {/* --- EXTRA INFORMATION AND FEATURES WALKTHROUGH --- */}
      <section className="bg-[#2B1B12]/40 border-t border-[#D4AF37]/10 py-8 mt-12">
        <div className="max-w-4xl mx-auto px-4 space-y-6 text-center">
          <h3 className="font-bold text-base text-[#EDE0D4]">كيف تعمل تجربة كلاسيك كافيه (Classic Cafe) السحرية؟</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-right">
            <div className="bg-[#2B1B12] p-4 rounded-2xl border border-[#D4AF37]/20 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#d4af37]/10 text-[#d4af37] flex items-center justify-center font-bold font-mono">1</div>
              <h4 className="font-bold text-xs text-[#EDE0D4]">مسح QR الكوب</h4>
              <p className="text-[11px] text-[#EDE0D4]/70 leading-relaxed">
                يمسح الزبون الرمز المطبوع على كوب القهوة الساخن أو البارد، لتفتح له الصفحة فورياً دون الحاجة لتطبيق أو حساب معقد.
              </p>
            </div>

            <div className="bg-[#2B1B12] p-4 rounded-2xl border border-[#D4AF37]/20 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#d4af37]/10 text-[#d4af37] flex items-center justify-center font-bold font-mono">2</div>
              <h4 className="font-bold text-xs text-[#EDE0D4]">تساقط حبوب القهوة التفاعلي</h4>
              <p className="text-[11px] text-[#EDE0D4]/70 leading-relaxed">
                في تجربة بصرية ساحرة وممتعة، تتساقط حبات القهوة وتتجمع في الكوب لتتحول لنقاط ترفع من حماسه وشوقه لزيارته القادمة.
              </p>
            </div>

            <div className="bg-[#2B1B12] p-4 rounded-2xl border border-[#D4AF37]/20 space-y-2">
              <div className="w-8 h-8 rounded-lg bg-[#d4af37]/10 text-[#d4af37] flex items-center justify-center font-bold font-mono">3</div>
              <h4 className="font-bold text-xs text-[#EDE0D4]">سرعة واحترافية الكاشير</h4>
              <p className="text-[11px] text-[#EDE0D4]/70 leading-relaxed">
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
