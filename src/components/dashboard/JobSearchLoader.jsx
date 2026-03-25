import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const MESSAGES = [
  "Scanning LinkedIn for matches…",
  "Checking Drushim listings…",
  "Analyzing your skills…",
  "Ranking best opportunities…",
  "Almost there…",
];

const floatingIcons = ["💼", "🔍", "📄", "⭐", "🚀", "💡"];

export default function JobSearchLoader() {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIdx(i => (i + 1) % MESSAGES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 select-none">

      {/* Avatar + magnifying glass */}
      <div className="relative mb-8">

        {/* Floating icons around the avatar */}
        {floatingIcons.map((icon, i) => (
          <motion.span
            key={i}
            className="absolute text-lg pointer-events-none"
            style={{
              top: `${50 + 52 * Math.sin((i / floatingIcons.length) * 2 * Math.PI)}%`,
              left: `${50 + 52 * Math.cos((i / floatingIcons.length) * 2 * Math.PI)}%`,
              transform: "translate(-50%, -50%)",
            }}
            animate={{
              y: [0, -8, 0],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 2.4,
              repeat: Infinity,
              delay: i * 0.4,
              ease: "easeInOut",
            }}
          >
            {icon}
          </motion.span>
        ))}

        {/* Avatar circle */}
        <motion.div
          className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-xl relative z-10"
          animate={{ scale: [1, 1.04, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          {/* Face */}
          <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none">
            {/* Head */}
            <circle cx="32" cy="22" r="12" fill="white" fillOpacity="0.95" />
            {/* Eyes */}
            <motion.circle
              cx="27" cy="20" r="2"
              fill="#3B82F6"
              animate={{ scaleY: [1, 0.1, 1] }}
              transition={{ duration: 3, repeat: Infinity, delay: 1 }}
            />
            <motion.circle
              cx="37" cy="20" r="2"
              fill="#3B82F6"
              animate={{ scaleY: [1, 0.1, 1] }}
              transition={{ duration: 3, repeat: Infinity, delay: 1 }}
            />
            {/* Smile */}
            <path d="M27 26 Q32 30 37 26" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            {/* Body */}
            <path d="M20 44 Q20 36 32 36 Q44 36 44 44" fill="white" fillOpacity="0.9" />
          </svg>

          {/* Magnifying glass badge */}
          <motion.div
            className="absolute -bottom-1 -right-1 w-9 h-9 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-blue-100 z-20"
            animate={{ rotate: [-10, 10, -10] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="10" cy="10" r="6" />
              <line x1="15" y1="15" x2="20" y2="20" />
            </svg>
          </motion.div>
        </motion.div>
      </div>

      {/* Animated message */}
      <div className="h-6 overflow-hidden mb-3">
        <AnimatePresence mode="wait">
          <motion.p
            key={msgIdx}
            className="text-sm font-medium text-gray-700 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35 }}
          >
            {MESSAGES[msgIdx]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-blue-500"
            animate={{ scale: [1, 1.6, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.25, ease: "easeInOut" }}
          />
        ))}
      </div>
    </div>
  );
}
