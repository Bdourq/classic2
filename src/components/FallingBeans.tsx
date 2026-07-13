/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Bean {
  id: number;
  startX: number; // percentage
  delay: number; // seconds
  size: number; // pixels
  rotateStart: number;
  rotateEnd: number;
  duration: number;
}

interface FallingBeansProps {
  isTriggered: boolean;
  onAnimationComplete?: () => void;
}

export default function FallingBeans({ isTriggered, onAnimationComplete }: FallingBeansProps) {
  const [beans, setBeans] = useState<Bean[]>([]);

  useEffect(() => {
    if (isTriggered) {
      // Generate a batch of random coffee beans
      const newBeans = Array.from({ length: 35 }).map((_, i) => ({
        id: i + Math.random(),
        startX: Math.random() * 90 + 5, // 5% to 95%
        delay: Math.random() * 1.5, // staggered delays up to 1.5s
        size: Math.random() * 16 + 14, // size from 14px to 30px
        rotateStart: Math.random() * 360,
        rotateEnd: Math.random() * 720 + 360,
        duration: Math.random() * 1.2 + 1.2, // duration from 1.2s to 2.4s
      }));
      setBeans(newBeans);

      // Trigger the completion callback after the animation finishes
      const timer = setTimeout(() => {
        setBeans([]);
        if (onAnimationComplete) {
          onAnimationComplete();
        }
      }, 3500); // 1.5s delay + 2s max duration

      return () => clearTimeout(timer);
    }
  }, [isTriggered]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      <AnimatePresence>
        {beans.map((bean) => (
          <motion.div
            key={bean.id}
            initial={{
              y: -50,
              x: `${bean.startX}%`,
              rotate: bean.rotateStart,
              opacity: 0,
            }}
            animate={{
              y: '110vh', // fall all the way below viewport
              rotate: bean.rotateEnd,
              opacity: [0, 1, 1, 0.7, 0], // fade out at the bottom
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: bean.duration,
              delay: bean.delay,
              ease: 'easeIn',
            }}
            className="absolute"
            style={{ width: bean.size, height: bean.size }}
          >
            {/* Beautiful SVG Coffee Bean */}
            <svg
              viewBox="0 0 24 24"
              className="w-full h-full drop-shadow-[0_4px_6px_rgba(0,0,0,0.15)]"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Outer bean shell */}
              <path
                d="M12 2C16.97 2 20 6.03 20 11C20 15.97 16.97 20 12 20C7.03 20 4 15.97 4 11C4 6.03 7.03 2 12 2Z"
                fill="#3d2519"
              />
              {/* Shading/depth */}
              <path
                d="M12 2C16.97 2 20 6.03 20 11C20 15.97 16.97 20 12 20C9.5 20 7.2 18 5.7 15C4.2 12 4 9.5 4 11C4 6.03 7.03 2 12 2Z"
                fill="#2c1a11"
              />
              {/* S-curve crease line in the middle */}
              <path
                d="M12 2C11 6 15 11 11 15C10 16.5 11.5 19 12 20"
                stroke="#1a0f0a"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M12.5 2.5C11.5 6.2 15.5 10.8 11.5 14.8C10.5 16.3 12 18.8 12.5 19.5"
                stroke="#eaddcd"
                strokeWidth="0.75"
                strokeLinecap="round"
                fill="none"
                opacity="0.3"
              />
            </svg>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Visual heap simulation at the very bottom of the cup view */}
      {isTriggered && (
        <motion.div
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{
            opacity: [0, 0.4, 0.8, 0.4, 0],
            scaleY: [0, 1, 1.2, 0.8, 0],
          }}
          transition={{ duration: 3, times: [0, 0.1, 0.5, 0.8, 1] }}
          className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-[#2c1a11] to-transparent origin-bottom blur-xs"
        />
      )}
    </div>
  );
}
