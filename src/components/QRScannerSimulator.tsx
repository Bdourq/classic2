/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { QrCode, Camera, Scan, Sparkles, Check, Coffee, X } from 'lucide-react';

interface QRScannerSimulatorProps {
  onScanSuccess: (points: number) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function QRScannerSimulator({ onScanSuccess, isOpen, onClose }: QRScannerSimulatorProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanComplete, setScanComplete] = useState(false);
  const [scannedPoints, setScannedPoints] = useState(10); // Default points to award on scan

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isScanning) {
      interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            setScanComplete(true);
            setTimeout(() => {
              onScanSuccess(scannedPoints);
              setIsScanning(false);
              setScanComplete(false);
              setScanProgress(0);
              onClose();
            }, 1000);
            return 100;
          }
          return prev + 4; // Scan speed
        });
      }, 80);
    }
    return () => clearInterval(interval);
  }, [isScanning]);

  const startSimulatedScan = (pointsToAward: number) => {
    setScannedPoints(pointsToAward);
    setIsScanning(true);
    setScanComplete(false);
    setScanProgress(0);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div dir="rtl" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-[#0D0D0D]/95 text-[#EDE0D4] rounded-3xl border border-[#D4AF37]/30 shadow-2xl w-full max-w-sm overflow-hidden flex flex-col relative luxury-gold-border backdrop-blur-md"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-5 py-4 border-b border-[#D4AF37]/20 bg-black">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#d4af37]/10 text-[#d4af37] rounded-xl border border-[#d4af37]/25">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif font-black text-sm text-gold-gradient">محاكي مسح الـ QR Code السحري</h3>
                  <p className="text-[10px] text-stone-400 font-semibold">تجربة سريعة ومباشرة بدون تحميل أي تطبيق</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-black text-stone-400 hover:text-[#D4AF37] border border-transparent hover:border-[#D4AF37]/20 transition-all active:scale-95"
                disabled={isScanning}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="p-6 flex flex-col items-center justify-center space-y-5">
              {!isScanning ? (
                <>
                  {/* Informative Step */}
                  <div className="text-center space-y-2">
                    <div className="relative w-44 h-44 bg-black border-2 border-dashed border-[#d4af37]/30 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                      {/* Interactive Simulated QR */}
                      <div className="p-3 bg-black rounded-lg border border-[#D4AF37]/20 shadow-sm relative group cursor-pointer hover:border-[#d4af37] transition-all">
                        {/* Custom QR representation */}
                        <div className="w-28 h-28 grid grid-cols-5 gap-0.5 opacity-80">
                          {Array.from({ length: 25 }).map((_, i) => {
                            // Let's make it look like a QR code with corner markers
                            const isCorner = 
                              (i < 2 || i === 4) || 
                                (i === 5 || i === 9) ||
                                (i === 20 || i === 24);
                            return (
                              <div
                                key={i}
                                className={`rounded-xs ${
                                  isCorner 
                                    ? 'bg-[#EDE0D4]' 
                                    : Math.random() > 0.4 
                                    ? 'bg-[#EDE0D4]' 
                                    : 'bg-transparent'
                                }`}
                              />
                            );
                          })}
                        </div>
                        {/* Coffee bean in middle of QR */}
                        <div className="absolute inset-0 m-auto w-8 h-8 bg-[#0D0D0D] border border-[#D4AF37]/20 rounded-full flex items-center justify-center">
                          <Coffee className="w-4 h-4 text-[#d4af37]" />
                        </div>
                      </div>
                      
                      {/* Scanning icon indicator */}
                      <Scan className="absolute -top-3.5 -right-3.5 w-7 h-7 text-[#d4af37] animate-pulse" />
                    </div>
                    <p className="text-xs font-semibold text-[#EDE0D4]/90 pt-2">
                      اختر كمية النقاط لمحاكاتها واضغط مسح:
                    </p>
                  </div>

                  {/* QR Scan Options */}
                  <div className="w-full grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((pts) => (
                      <button
                        key={pts}
                        onClick={() => startSimulatedScan(pts)}
                        className="bg-black hover:bg-gradient-to-r hover:from-[#B89742] hover:to-[#F5E2A8] hover:text-stone-950 border border-[#D4AF37]/20 hover:border-transparent rounded-xl py-3 text-xs font-bold font-mono transition-all active:scale-95 shadow-sm text-[#EDE0D4] flex flex-col items-center justify-center gap-1 cursor-pointer"
                      >
                        <span className="text-sm font-black text-[#d4af37]">+{pts}</span>
                        <span className="text-[10px] text-[#EDE0D4]/60 font-normal">
                          {pts === 1 ? 'كوب واحد' : pts === 2 ? 'كوبان' : 'أكواب'}
                        </span>
                      </button>
                    ))}
                  </div>

                  <p className="text-[10px] text-[#D4AF37] text-center leading-relaxed max-w-[280px] font-medium">
                    ⚠️ الإدارة هي التي تحدد القيمة في الـ QR المطبوع على الكوب (مثال: كل كوب = نقطة واحدة).
                  </p>
                </>
              ) : (
                /* --- ACTIVE SCANNING ANIMATION --- */
                <div className="w-full flex flex-col items-center justify-center py-6 space-y-6">
                  <div className="relative w-56 h-56 bg-black rounded-2xl overflow-hidden border-2 border-[#d4af37] shadow-inner flex items-center justify-center">
                    {/* Simulated Camera Viewfinder Grid */}
                    <div className="absolute inset-4 border border-white/20 rounded-lg pointer-events-none" />
                    <div className="absolute top-2 left-2 text-[10px] font-mono text-[#d4af37] bg-black/40 px-1.5 py-0.5 rounded-sm flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                      <span>LIVE CAM_SIM</span>
                    </div>

                    {/* QR Code in Viewfinder */}
                    <motion.div
                      animate={{ scale: [0.95, 1.05, 0.95] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="opacity-40 p-4 bg-white/10 rounded-xl"
                    >
                      <QrCode className="w-24 h-24 text-white" />
                    </motion.div>

                    {/* Animated Scanning Laser Line */}
                    <motion.div
                      animate={{
                        top: ['5%', '95%', '5%'],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: 'easeInOut',
                      }}
                      className="absolute left-0 right-0 h-1 bg-[#d4af37] shadow-[0_0_15px_#dfb841] pointer-events-none"
                    />

                    {/* Scanner completion overlay */}
                    <AnimatePresence>
                      {scanComplete && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-emerald-950/90 flex flex-col items-center justify-center gap-3"
                        >
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 100, damping: 10 }}
                            className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center text-white"
                          >
                            <Check className="w-8 h-8 stroke-[3]" />
                          </motion.div>
                          <p className="text-sm font-bold text-white">تم المسح بنجاح!</p>
                          <p className="text-xs text-emerald-300 font-mono">+{scannedPoints} {scannedPoints === 1 ? 'كوب جديد' : 'أكواب جديدة'}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full space-y-1">
                    <div className="flex justify-between items-center text-xs font-semibold text-stone-400">
                      <span>جاري معالجة الكوب...</span>
                      <span>{scanProgress}%</span>
                    </div>
                    <div className="w-full bg-black rounded-full h-1.5 overflow-hidden border border-[#D4AF37]/20">
                      <div
                        className="bg-[#d4af37] h-full transition-all duration-75"
                        style={{ width: `${scanProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
