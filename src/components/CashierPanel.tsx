/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, Unlock, Phone, Sparkles, Check, X, ArrowLeft, ArrowRight, Plus, RefreshCw } from 'lucide-react';
import { Customer } from '../types';

interface CashierPanelProps {
  customers: Customer[];
  onAddPoints: (phone: string, amount: number) => void;
  onClose: () => void;
}

export default function CashierPanel({ customers, onAddPoints, onClose }: CashierPanelProps) {
  const [pin, setPin] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinError, setPinError] = useState<boolean>(false);
  
  // Quick Customer selection
  const [searchPhone, setSearchPhone] = useState<string>('');
  const [selectedPhone, setSelectedPhone] = useState<string>('');
  const [customAmount, setCustomAmount] = useState<string>('1');
  const [successMsg, setSuccessMsg] = useState<string>('');

  const CORRECT_PIN = '1234';

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setPinError(false);
      
      if (newPin === CORRECT_PIN) {
        setTimeout(() => {
          setIsAuthenticated(true);
        }, 300);
      } else if (newPin.length === 4) {
        // Wrong PIN
        setTimeout(() => {
          setPinError(true);
          setPin('');
        }, 200);
      }
    }
  };

  const handleBackspace = () => {
    setPin(pin.slice(0, -1));
    setPinError(false);
  };

  const handleClear = () => {
    setPin('');
    setPinError(false);
  };

  const filteredCustomers = customers.filter(c => 
    c.phone.includes(searchPhone) || c.name.includes(searchPhone)
  );

  const triggerAddPoints = (phone: string, amount: number) => {
    onAddPoints(phone, amount);
    const customerName = customers.find(c => c.phone === phone)?.name || phone;
    const absAmt = Math.abs(amount);
    const suffix = absAmt === 1 ? 'كوب' : absAmt === 2 ? 'كوبين' : 'أكواب';
    
    if (amount > 0) {
      setSuccessMsg(`تمت إضافة ${absAmt} ${suffix} بنجاح إلى ${customerName}!`);
    } else {
      setSuccessMsg(`تم استبدال المكافأة المجانية بنجاح للزبون ${customerName}!`);
    }
    setTimeout(() => {
      setSuccessMsg('');
    }, 3000);
  };

  return (
    <div dir="rtl" className="bg-[#2B1B12] text-[#EDE0D4] rounded-3xl border border-[#D4AF37]/30 shadow-2xl p-6 w-full max-w-md mx-auto overflow-hidden relative min-h-[500px] flex flex-col justify-between">
      {/* Top bar */}
      <div className="flex justify-between items-center pb-4 border-b border-[#D4AF37]/20 mb-4">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${isAuthenticated ? 'bg-emerald-500/10 text-emerald-400' : 'bg-[#D4AF37]/10 text-[#D4AF37]'}`}>
            {isAuthenticated ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-bold text-lg text-[#EDE0D4]">لوحة كاشير Classic Cafe</h3>
            <p className="text-xs text-[#EDE0D4]/60">لإضافة واسترداد نقاط زبائن كلاسيك كافيه 🇯🇴</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-full hover:bg-[#1A0F0A] transition-colors"
          title="رجوع"
        >
          <X className="w-5 h-5 text-stone-400" />
        </button>
      </div>

      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          /* --- PIN ENTER SCREEN --- */
          <motion.div
            key="pin-screen"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex flex-col items-center justify-center py-4"
          >
            <p className="text-sm font-semibold text-[#EDE0D4] mb-6 text-center">
              الرجاء إدخال رمز الكاشير PIN للمتابعة
              <br />
              <span className="text-xs font-normal text-stone-400">(الرمز الافتراضي للتجربة: <span className="font-mono font-bold text-[#D4AF37]">1234</span>)</span>
            </p>

            {/* PIN Dots indicators */}
            <div className="flex gap-4 mb-8">
              {[0, 1, 2, 3].map((index) => (
                <motion.div
                  key={index}
                  animate={pinError ? { x: [-10, 10, -10, 10, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  className={`w-4 h-4 rounded-full border-2 ${
                    pinError 
                      ? 'bg-rose-500 border-rose-500' 
                      : pin.length > index 
                      ? 'bg-[#d4af37] border-[#d4af37]' 
                      : 'bg-transparent border-stone-600'
                  }`}
                />
              ))}
            </div>

            {/* Keypad Grid */}
            <div className="grid grid-cols-3 gap-3 w-full max-w-xs mb-4">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
                <button
                  key={num}
                  onClick={() => handleKeyPress(num)}
                  className="h-14 bg-[#1A0F0A] hover:bg-[#D4AF37] hover:text-[#1A0F0A] border border-[#D4AF37]/20 rounded-2xl text-xl font-bold font-mono transition-all active:scale-95 shadow-xs flex items-center justify-center text-[#EDE0D4]"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={handleClear}
                className="h-14 bg-[#1A0F0A]/50 hover:bg-[#1A0F0A] border border-[#D4AF37]/10 rounded-2xl text-xs font-semibold transition-all active:scale-95 flex items-center justify-center text-stone-300"
              >
                مسح
              </button>
              <button
                onClick={() => handleKeyPress('0')}
                className="h-14 bg-[#1A0F0A] hover:bg-[#D4AF37] hover:text-[#1A0F0A] border border-[#D4AF37]/20 rounded-2xl text-xl font-bold font-mono transition-all active:scale-95 shadow-xs flex items-center justify-center text-[#EDE0D4]"
              >
                0
              </button>
              <button
                onClick={handleBackspace}
                className="h-14 bg-[#1A0F0A]/50 hover:bg-[#1A0F0A] border border-[#D4AF37]/10 rounded-2xl text-xs font-semibold transition-all active:scale-95 flex items-center justify-center text-stone-300"
              >
                تراجع
              </button>
            </div>

            {pinError && (
              <p className="text-xs text-rose-400 font-semibold animate-pulse">
                الرمز خاطئ، يرجى المحاولة مجدداً.
              </p>
            )}
          </motion.div>
        ) : (
          /* --- CASHIER DASHBOARD SCREEN --- */
          <motion.div
            key="dashboard-screen"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col justify-between"
          >
            <div className="space-y-4">
              {/* Search Customer Input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="ابحث برقم جوال الزبون أو اسمه..."
                  value={searchPhone}
                  onChange={(e) => {
                    setSearchPhone(e.target.value);
                    setSelectedPhone(''); // reset selected
                  }}
                  className="w-full bg-[#1A0F0A] border border-[#D4AF37]/30 rounded-2xl py-3 px-10 text-sm font-sans text-[#EDE0D4] placeholder-stone-500 focus:outline-hidden focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37] transition-all"
                />
                <Phone className="absolute right-3.5 top-3.5 w-4.5 h-4.5 text-[#D4AF37]/50" />
                {searchPhone && (
                  <button 
                    onClick={() => { setSearchPhone(''); setSelectedPhone(''); }} 
                    className="absolute left-3.5 top-3.5 text-stone-400 hover:text-stone-300 text-xs"
                  >
                    إلغاء
                  </button>
                )}
              </div>

              {/* Customer List Selection */}
              <div className="bg-[#1A0F0A] border border-[#D4AF37]/20 rounded-2xl p-2 max-h-40 overflow-y-auto space-y-1">
                {filteredCustomers.length === 0 ? (
                  <div className="py-6 text-center text-xs text-stone-400">
                    لا يوجد زبائن مطابقين للبحث. يمكنك تسجيل زبون جديد في الواجهة الرئيسية.
                  </div>
                ) : (
                  filteredCustomers.map((c) => (
                    <button
                      key={c.phone}
                      onClick={() => {
                        setSelectedPhone(c.phone);
                        setSearchPhone(c.phone);
                      }}
                      className={`w-full text-right p-2.5 rounded-xl text-xs flex justify-between items-center transition-all ${
                        selectedPhone === c.phone 
                          ? 'bg-[#D4AF37] text-[#1A0F0A]' 
                          : 'hover:bg-[#2B1B12] text-[#EDE0D4]'
                      }`}
                    >
                      <div>
                        <p className="font-bold">{c.name}</p>
                        <p className="font-mono text-[10px] opacity-75">{c.phone}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          selectedPhone === c.phone 
                            ? 'bg-[#1A0F0A] text-[#D4AF37]' 
                            : 'bg-[#2B1B12] border border-[#D4AF37]/20 text-[#EDE0D4]'
                        }`}>
                          {c.points} نقطة
                        </span>
                        {selectedPhone === c.phone && <Check className="w-3.5 h-3.5 text-[#1A0F0A]" />}
                      </div>
                    </button>
                  ))
                )}
              </div>

              {selectedPhone ? (
                /* Add Points Controls */
                <div className="space-y-4 pt-2">
                  <div className="bg-[#1A0F0A] rounded-2xl p-3 border border-[#D4AF37]/20">
                    <p className="text-xs text-[#D4AF37]/70 mb-1 font-semibold">الزبون المختار:</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-bold text-[#EDE0D4]">
                        {customers.find(c => c.phone === selectedPhone)?.name}
                      </span>
                      <span className="text-xs font-mono bg-[#2B1B12] text-[#D4AF37] px-2 py-0.5 rounded-md border border-[#D4AF37]/20">
                        {selectedPhone}
                      </span>
                    </div>
                  </div>

                  {/* Quick Add Buttons */}
                  <div>
                    <label className="text-xs font-bold text-[#EDE0D4]/80 block mb-2">إضافة أكواب سريعة:</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 5, 10].map((amt) => (
                        <button
                          key={amt}
                          onClick={() => triggerAddPoints(selectedPhone, amt)}
                          className="bg-[#1A0F0A] hover:bg-[#D4AF37] hover:text-[#1A0F0A] border border-[#D4AF37]/20 rounded-xl py-2.5 text-xs font-bold font-mono transition-all active:scale-95 shadow-xs text-[#EDE0D4] flex flex-col items-center justify-center"
                        >
                          <span className="text-sm font-black">+{amt}</span>
                          <span className="text-[9px] font-normal opacity-85">{amt === 1 ? 'كوب' : amt === 2 ? 'كوبين' : 'أكواب'}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Add Amount & Redeem */}
                  <div className="space-y-4">
                    {/* Custom Add Amount */}
                    <div>
                      <label className="text-xs font-bold text-[#EDE0D4]/80 block mb-1.5">إضافة كمية مخصصة:</label>
                      <div className="flex gap-2 max-w-[200px]">
                        <input
                          type="number"
                          value={customAmount}
                          onChange={(e) => setCustomAmount(e.target.value)}
                          className="w-full bg-[#1A0F0A] border border-[#D4AF37]/20 rounded-xl px-3 py-2 text-center text-xs font-bold font-mono text-[#EDE0D4] focus:outline-hidden focus:border-[#D4AF37]"
                          min="1"
                        />
                        <button
                          onClick={() => {
                            const amt = parseInt(customAmount) || 1;
                            triggerAddPoints(selectedPhone, amt);
                          }}
                          className="bg-[#D4AF37] hover:bg-[#dfb841] text-[#1A0F0A] rounded-xl px-4 py-2 text-xs font-bold flex items-center justify-center gap-1 shrink-0"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>إضافة</span>
                        </button>
                      </div>
                    </div>

                    {/* Redeem Rewards Options */}
                    <div className="pt-3 border-t border-[#D4AF37]/10">
                      <label className="text-xs font-bold text-[#EDE0D4]/80 block mb-2">استبدال المكافآت (أكواب مجانية):</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { pts: 10, label: 'كوب واحد مجاناً', desc: '10 نقاط' },
                          { pts: 20, label: 'كوبين مجاناً', desc: '20 نقطة' },
                          { pts: 30, label: '3 أكواب مجانية', desc: '30 نقطة' },
                          { pts: 40, label: '4 أكواب مجانية', desc: '40 نقطة' }
                        ].map((reward) => {
                          const currentPts = customers.find(c => c.phone === selectedPhone)?.points || 0;
                          const canRedeem = currentPts >= reward.pts;
                          return (
                            <button
                              key={reward.pts}
                              disabled={!canRedeem}
                              onClick={() => {
                                if (canRedeem) {
                                  triggerAddPoints(selectedPhone, -reward.pts);
                                } else {
                                  alert(`عذراً، الزبون لا يملك ${reward.pts} نقاط لاستبدال هذه المكافأة.`);
                                }
                              }}
                              className="bg-[#1A0F0A] border border-[#D4AF37]/20 disabled:border-stone-800 disabled:opacity-40 hover:bg-gradient-to-r hover:from-[#d4af37] hover:to-[#dfb841] hover:text-stone-950 text-[#EDE0D4] rounded-xl p-2 text-right flex flex-col justify-between h-[56px] transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
                            >
                              <span className="text-[10px] font-bold block">{reward.label}</span>
                              <span className="text-[9px] font-mono opacity-70 block">-{reward.desc}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center border-2 border-dashed border-[#D4AF37]/20 rounded-2xl flex flex-col items-center justify-center gap-2">
                  <Phone className="w-8 h-8 text-stone-600" />
                  <p className="text-xs font-semibold text-stone-400">الرجاء تحديد زبون من القائمة أعلاه لإضافة النقاط له.</p>
                </div>
              )}
            </div>

            {/* Status alerts */}
            <div className="pt-4 mt-auto">
              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl p-2.5 text-xs text-center font-bold flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>{successMsg}</span>
                </motion.div>
              )}
            </div>

            {/* Quick exit */}
            <div className="mt-4 pt-3 border-t border-[#D4AF37]/20 flex justify-between items-center text-xs text-stone-500">
              <span>الكاشير نشط</span>
              <button
                onClick={() => setIsAuthenticated(false)}
                className="text-[#D4AF37] hover:underline font-bold"
              >
                قفل اللوحة
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
