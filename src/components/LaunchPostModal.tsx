/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Copy, Check, FileText, Share2, Sparkles, X } from 'lucide-react';

interface LaunchPostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LaunchPostModal({ isOpen, onClose }: LaunchPostModalProps) {
  const [copied, setCopied] = useState(false);

  const postText = `🚀 وداعاً للبطاقات الورقية التقليدية.. ومرحباً بمستقبل ولاء العملاء في الأردن! 🇯🇴

سعيد جداً بالإعلان عن إطلاق مشروعي الجديد: "نظام ولاء كلاسيك كافيه (Classic Cafe) الذكي" ☕️✨

تخيل هذا السيناريو:
تشتري كوب قهوتك المفضّل من Classic Cafe، تمسح الـ QR Code المطبوع على الكوب بكاميرا جوالك.. وبوم! 💥
تفتح لك صفحة فورية وسريعة جداً بدون ما تحمل أي تطبيق وتستهلك باقتك في ثانية واحدة.

تظهر لك تجربة بصرية ساحرة: حبوب القهوة تتساقط وتتجمع لتملأ كوباً ذهبياً يعبر عن نقاطك، ومع كل زيادة، يتحرك العداد بحماس حتى تصل لـ 10 نقاط (10 أكواب) لتحتفل معك الشاشة بالـ Confetti والمكافأة المجانية! 🎉🤩

💡 ما الذي يجعل هذا النظام استثنائياً؟
1️⃣ تجربة مسح سحرية (Magic Scan Experience) تتساقط فيها حبوب القهوة وتتراكم بشكل تفاعلي مذهل.
2️⃣ تسجيل دخول فوري برقم الجوال الأردني فقط (بدون كلمات مرور معقدة أو تعبئة استمارات مملة).
3️⃣ لوحة كاشير فائقة السرعة بـ PIN كود تضيف النقاط للزبون في أقل من ثانية!
4️⃣ تصميم عربي (RTL) بهوية بصرية دافئة مستوحاة من ألوان القهوة: البني الداكن الفاخر، الكريمي الهادئ، والذهبي البراق.
5️⃣ يعمل كـ PWA متكامل، سريع، وخفيف، وحتى بدون اتصال بالإنترنت!

نحن لا نبني مجرد نظام نقاط.. نحن نصنع تجربة رقمية تزيد من ارتباط العميل بقهوته اليومية في الأردن الحبيب 🇯🇴☕️

👇 جربوها الآن وأخبروني برأيكم!
"تجربة المسح تغيّر ولاء الزبون"

#ClassicCafe #كلاسيك_كافيه #ولاء_العملاء #الأردن #تجربة_رقمية`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(postText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div dir="rtl" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-[#2B1B12] text-[#EDE0D4] rounded-3xl border border-[#D4AF37]/30 shadow-2xl w-full max-w-xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            {/* Header */}
            <div className="flex justify-between items-center px-6 py-4 border-b border-[#D4AF37]/20 bg-[#1A0F0A]">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#d4af37]/10 text-[#d4af37] rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-[#EDE0D4]">منشور الإطلاق الاحترافي</h3>
                  <p className="text-[10px] text-[#EDE0D4]/60">جاهز للنسخ والنشر على LinkedIn أو منصات التواصل</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full hover:bg-[#2B1B12] transition-colors"
              >
                <X className="w-5 h-5 text-stone-400" />
              </button>
            </div>

            {/* Text Area Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="bg-[#1A0F0A] rounded-2xl p-3 border border-[#D4AF37]/20 flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-[#d4af37] shrink-0" />
                <p className="text-xs text-[#EDE0D4]/90 leading-relaxed">
                  تمت صياغة هذا المنشور بنبرة فخر وإبداع تليق بمنتجك التقني الجديد لجذب انتباه أصحاب المقاهي والمستثمرين والزبائن.
                </p>
              </div>

              <div className="relative">
                <pre className="bg-[#1A0F0A] border border-[#D4AF37]/30 rounded-2xl p-4 text-xs font-sans text-[#EDE0D4]/90 whitespace-pre-wrap leading-relaxed max-h-[350px] overflow-y-auto select-all selection:bg-[#d4af37]/20 select-text">
                  {postText}
                </pre>
                
                {/* Micro shadow bottom gradient */}
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#1A0F0A] to-transparent rounded-b-2xl pointer-events-none" />
              </div>
            </div>

            {/* Actions Footer */}
            <div className="px-6 py-4 border-t border-[#D4AF37]/20 bg-[#1A0F0A] flex flex-col sm:flex-row justify-between items-center gap-3">
              <span className="text-xs text-stone-500">انشر إبداعك والفت انتباه عملائك الآن ✨</span>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={handleCopy}
                  className="flex-1 sm:flex-initial bg-[#D4AF37] hover:bg-[#dfb841] text-[#1A0F0A] rounded-xl py-2.5 px-6 font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-[#1A0F0A]" />
                      <span className="text-[#1A0F0A]">تم نسخ المنشور!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>نسخ المنشور بالكامل</span>
                    </>
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="bg-[#2B1B12] hover:bg-[#1A0F0A] text-stone-300 border border-[#D4AF37]/20 rounded-xl py-2.5 px-4 font-bold text-xs transition-colors"
                >
                  إغلاق
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
