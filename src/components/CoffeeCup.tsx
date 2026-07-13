/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { Sparkles, Trophy } from 'lucide-react';

interface CoffeeCupProps {
  points: number;
  maxPoints?: number;
}

export default function CoffeeCup({ points, maxPoints = 100 }: CoffeeCupProps) {
  const percentage = Math.min(100, Math.max(0, (points / maxPoints) * 100));

  return (
    <div className="relative flex flex-col items-center justify-center p-4">
      {/* Floating Sparkles when high points */}
      {percentage >= 80 && (
        <div className="absolute -top-6 flex gap-8 text-[#d4af37]">
          <motion.div
            animate={{ y: [-5, 5, -5], scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <Sparkles className="w-5 h-5" />
          </motion.div>
          <motion.div
            animate={{ y: [5, -5, 5], scale: [1.2, 1, 1.2], opacity: [1, 0.5, 1] }}
            transition={{ repeat: Infinity, duration: 2.5, delay: 0.5 }}
          >
            <Sparkles className="w-4 h-4" />
          </motion.div>
        </div>
      )}

      {/* SVG Coffee Cup */}
      <div className="relative w-64 h-64 flex items-center justify-center">
        {/* Steam rising */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 justify-center h-12 w-20 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="w-1 bg-gradient-to-t from-[#d4af37]/40 to-transparent rounded-full"
              animate={{
                y: [20, -20],
                x: [0, i % 2 === 0 ? 5 : -5, 0],
                opacity: [0, 0.8, 0],
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: i * 0.7,
                ease: "linear"
              }}
              style={{ height: '30px' }}
            />
          ))}
        </div>

        {/* Outer Cup Container */}
        <svg
          viewBox="0 0 200 200"
          className="w-full h-full drop-shadow-[0_10px_20px_rgba(44,26,17,0.15)]"
        >
          <defs>
            {/* Golden Gradient for outer cup */}
            <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#dfb841" />
              <stop offset="50%" stopColor="#d4af37" />
              <stop offset="100%" stopColor="#aa8322" />
            </linearGradient>

            {/* Rich Coffee gradient for liquid */}
            <linearGradient id="coffeeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f3ebd9" /> {/* Golden Creamy Foam */}
              <stop offset="15%" stopColor="#dfb841" /> {/* Gold ring */}
              <stop offset="40%" stopColor="#4a2c1d" /> {/* Creamy Espresso */}
              <stop offset="100%" stopColor="#2c1a11" /> {/* Deep Espresso */}
            </linearGradient>

            {/* Inner cup clip path to mask the liquid */}
            <clipPath id="innerCupClip">
              <path d="M 45 65 L 58 165 C 59 173, 67 180, 75 180 L 125 180 C 133 180, 141 173, 142 165 L 155 65 Z" />
            </clipPath>
          </defs>

          {/* Cup Handle (Sleek Golden Ring) */}
          <path
            d="M 148 90 C 180 90, 180 145, 140 145"
            fill="none"
            stroke="url(#goldGrad)"
            strokeWidth="10"
            strokeLinecap="round"
          />

          {/* Inner Cup Background (Dark shadow inside empty cup) */}
          <path
            d="M 45 65 L 58 165 C 59 173, 67 180, 75 180 L 125 180 C 133 180, 141 173, 142 165 L 155 65 Z"
            fill="#0A0A0A"
            stroke="#121212"
            strokeWidth="1"
          />

          {/* Liquid Fill masked by Clip Path */}
          <g clipPath="url(#innerCupClip)">
            {/* Animated Coffee waves */}
            <motion.g
              animate={{
                y: [180 - (percentage * 1.15), 180 - (percentage * 1.15)],
              }}
              transition={{ type: "spring", stiffness: 50, damping: 15 }}
            >
              {/* Dynamic liquid path with simple SVG wave */}
              <motion.path
                d="M -20 20 Q 30 10, 80 20 T 180 20 T 280 20 L 280 200 L -20 200 Z"
                fill="url(#coffeeGrad)"
                animate={{
                  x: [-50, 0],
                }}
                transition={{
                  repeat: Infinity,
                  duration: 4,
                  ease: "linear"
                }}
              />
              {/* Foam layer line */}
              <path
                d="M -20 20 Q 30 10, 80 20 T 180 20 T 280 20"
                fill="none"
                stroke="#EDE0D4"
                strokeWidth="2"
                opacity="0.3"
              />
            </motion.g>
          </g>

          {/* Golden Cup Rim & Body Outline */}
          <path
            d="M 40 65 L 160 65"
            stroke="url(#goldGrad)"
            strokeWidth="8"
            strokeLinecap="round"
          />

          {/* Main Golden Cup Shell Outlines */}
          <path
            d="M 45 65 L 58 165 C 59 173, 67 180, 75 180 L 125 180 C 133 180, 141 173, 142 165 L 155 65"
            fill="none"
            stroke="url(#goldGrad)"
            strokeWidth="8"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Elegantly styled brand details on the cup */}
          <g transform="translate(100, 120)">
            {/* Classic Star/Crown logo on the cup */}
            <path
              d="M -10 -15 L -2 -2 L 10 -15 L 5 5 L -5 5 Z"
              fill={percentage > 50 ? "#EDE0D4" : "#d4af37"}
              opacity="0.85"
            />
            <text
              x="0"
              y="22"
              fill={percentage > 60 ? "#1A0F0A" : "#EDE0D4"}
              fontSize="11"
              fontWeight="bold"
              fontFamily="system-ui"
              textAnchor="middle"
              letterSpacing="1"
              opacity="0.9"
            >
              CLASSIC
            </text>
          </g>
        </svg>

        {/* Floating circular points tag in center of cup */}
        <div className="absolute bottom-4 bg-[#0A0A0A] text-[#EDE0D4] border-2 border-[#d4af37] px-4 py-1.5 rounded-full flex items-center gap-1.5 shadow-[0_4px_20px_rgba(212,175,55,0.25)] select-none font-bold">
          <span className="text-[#d4af37] text-lg font-mono">{points}</span>
          <span className="text-xs font-sans">نقطة</span>
        </div>
      </div>

      {/* Target marker & Progress indicator */}
      <div className="w-full max-w-xs mt-3 bg-black/60 backdrop-blur-md border border-[#d4af37]/35 rounded-2xl p-3.5 shadow-xl flex flex-col gap-1.5 text-center">
        <div className="flex justify-between items-center text-xs font-bold text-[#EDE0D4]">
          <span>الهدف: {maxPoints} نقاط (أكواب)</span>
          <span className="flex items-center gap-1 text-[#d4af37]">
            <Trophy className="w-3.5 h-3.5" />
            <span>كوب مجاني!</span>
          </span>
        </div>
        <div className="w-full bg-[#121212] rounded-full h-2.5 overflow-hidden border border-[#d4af37]/15">
          <motion.div
            className="bg-gradient-to-r from-[#B89742] via-[#F5E2A8] to-[#B89742] h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{ type: "spring", stiffness: 60, damping: 15 }}
          />
        </div>
        <div className="text-xs text-stone-300 font-medium">
          {percentage === 100 ? (
            <span className="text-[#d4af37] font-black animate-pulse">🎉 مبروك! لقد حصلت على كوب مجاني</span>
          ) : (
            <span>متبقي {maxPoints - points} أكواب للحصول على مكافأتك</span>
          )}
        </div>
      </div>
    </div>
  );
}
