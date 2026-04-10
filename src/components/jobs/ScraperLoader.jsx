import React, { useEffect, useState } from "react";

const STAGES = [
  { icon: "🔍", text: "Connecting to job boards…",          sub: "LinkedIn · Drushim · TechMap" },
  { icon: "📡", text: "Scanning fresh listings…",            sub: "Filtering by your role & location" },
  { icon: "🧠", text: "Running AI match scoring…",           sub: "Comparing your skills to each job" },
  { icon: "📊", text: "Ranking top matches…",                sub: "Sorting by relevance & fit" },
  { icon: "🎯", text: "Personalizing your feed…",            sub: "Based on your profile & preferences" },
  { icon: "✨", text: "Almost ready…",                       sub: "Applying final filters" },
  { icon: "💼", text: "Pulling in Israeli market data…",     sub: "Tel Aviv · Herzliya · Remote IL" },
  { icon: "🔗", text: "Fetching job descriptions…",          sub: "Getting the full details for each role" },
];

export default function ScraperLoader({ message }) {
  const [stageIdx, setStageIdx] = useState(0);
  const [tick, setTick] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => {
    const msgTimer = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setStageIdx((i) => (i + 1) % STAGES.length);
        setFadeIn(true);
      }, 300);
    }, 2800);
    const tickTimer = setInterval(() => setTick((t) => t + 1), 80);
    return () => { clearInterval(msgTimer); clearInterval(tickTimer); };
  }, []);

  const stage = STAGES[stageIdx];

  return (
    <div className="flex flex-col items-center justify-center py-16 select-none w-full">
      {/* Scene */}
      <div className="relative mx-auto w-72 h-44">

        {/* Ground line */}
        <div className="absolute bottom-8 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-200 to-transparent rounded-full" />

        {/* Floating nodes (sites being scraped) */}
        <FloatingNode x={18} y={10} delay={0}   color="bg-blue-400"   icon="💼" />
        <FloatingNode x={70} y={4}  delay={600}  color="bg-purple-400" icon="🔗" />
        <FloatingNode x={48} y={14} delay={300}  color="bg-green-400"  icon="📄" />
        <FloatingNode x={82} y={22} delay={900}  color="bg-amber-400"  icon="🌐" />
        <FloatingNode x={8}  y={28} delay={450}  color="bg-pink-400"   icon="📊" />

        {/* Connecting laser beams */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
          <LaserBeam x1="50%" y1="65%" x2="24%" y2="18%" delay={0} />
          <LaserBeam x1="50%" y1="65%" x2="73%" y2="10%" delay={200} />
          <LaserBeam x1="50%" y1="65%" x2="51%" y2="22%" delay={400} />
          <LaserBeam x1="50%" y1="65%" x2="84%" y2="32%" delay={600} />
          <LaserBeam x1="50%" y1="65%" x2="11%" y2="38%" delay={800} />
        </svg>

        {/* The bot */}
        <BotFigure tick={tick} />

        {/* Data packets flying to bot */}
        <Packet delay={0}   fromX={20} fromY={15} />
        <Packet delay={700} fromX={72} fromY={8}  />
        <Packet delay={1400} fromX={50} fromY={18} />
      </div>

      {/* Status text */}
      <div className="mt-2 text-center space-y-1 min-h-[56px]" style={{ transition: 'opacity 0.3s', opacity: fadeIn ? 1 : 0 }}>
        {message ? (
          <p className="text-sm font-medium text-blue-600 animate-pulse">{message}</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-blue-700">
              <span className="mr-1.5">{stage.icon}</span>{stage.text}
            </p>
            <p className="text-xs text-blue-400/80">{stage.sub}</p>
          </>
        )}
        <div className="flex items-center justify-center gap-1 mt-2">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-blue-400"
              style={{ animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite` }}
            />
          ))}
        </div>
      </div>

      {/* Stage progress dots */}
      <div className="flex items-center gap-1.5 mt-3">
        {STAGES.map((_, i) => (
          <div
            key={i}
            className="rounded-full transition-all duration-500"
            style={{
              width: i === stageIdx ? 16 : 5,
              height: 5,
              backgroundColor: i === stageIdx ? '#3b82f6' : i < stageIdx ? '#93c5fd' : '#e2e8f0',
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes botBounce {
          0%, 100% { transform: translateY(0px) rotate(-2deg); }
          30%       { transform: translateY(-22px) rotate(4deg); }
          60%       { transform: translateY(-8px) rotate(-1deg); }
        }
        @keyframes floatNode {
          0%, 100% { transform: translateY(0px) scale(1); }
          50%       { transform: translateY(-7px) scale(1.08); }
        }
        @keyframes packetFly {
          0%   { opacity: 0; transform: translate(0, 0) scale(0.5); }
          20%  { opacity: 1; }
          100% { opacity: 0; transform: translate(calc(50vw - 100%), 80px) scale(0.2); }
        }
        @keyframes laserPulse {
          0%, 100% { opacity: 0.15; }
          50%       { opacity: 0.6; }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40%            { transform: translateY(-6px); }
        }
        @keyframes eyeBlink {
          0%, 90%, 100% { transform: scaleY(1); }
          95%            { transform: scaleY(0.1); }
        }
        @keyframes armSwing {
          0%, 100% { transform: rotate(-20deg); }
          50%       { transform: rotate(20deg); }
        }
        @keyframes scan {
          0%, 100% { transform: translateX(-3px); }
          50%       { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────────────────── */

function BotFigure() {
  return (
    /* Centering wrapper — no animation so transform is stable */
    <div className="absolute" style={{ left: '50%', bottom: '8px', transform: 'translateX(-50%)', width: 54 }}>
    {/* Animated inner wrapper */}
    <div style={{ animation: 'botBounce 1.1s ease-in-out infinite' }}>
      {/* Head */}
      <div className="relative mx-auto w-11 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg shadow-blue-400/40 flex items-center justify-center">
        {/* Antenna */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className="w-0.5 h-3 bg-blue-300 rounded-full" />
          <div className="w-2 h-2 rounded-full bg-blue-300 shadow-sm shadow-blue-300 animate-ping" style={{ animationDuration: '1.2s' }} />
        </div>
        {/* Eyes */}
        <div className="flex gap-2 mt-1">
          <div className="w-2.5 h-2.5 rounded-sm bg-cyan-300 shadow-sm shadow-cyan-200"
            style={{ animation: 'eyeBlink 3s ease-in-out infinite', transformOrigin: 'center' }} />
          <div className="w-2.5 h-2.5 rounded-sm bg-cyan-300 shadow-sm shadow-cyan-200"
            style={{ animation: 'eyeBlink 3s ease-in-out 0.15s infinite', transformOrigin: 'center' }} />
        </div>
        {/* Scan line */}
        <div className="absolute bottom-1.5 w-7 h-0.5 rounded-full bg-cyan-400/60"
          style={{ animation: 'scan 0.8s ease-in-out infinite' }} />
      </div>

      {/* Body */}
      <div className="relative mx-auto mt-0.5 w-12 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 shadow-md flex items-center justify-center overflow-hidden">
        {/* Chest LED grid */}
        <div className="grid grid-cols-3 gap-0.5">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 rounded-full"
              style={{
                backgroundColor: ['#67e8f9','#a78bfa','#34d399','#fbbf24','#f472b6','#60a5fa'][i],
                opacity: 0.8,
                animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Arms */}
      <div className="absolute top-10 -left-3 w-3 h-6 rounded-full bg-blue-500 origin-top"
        style={{ animation: 'armSwing 1.1s ease-in-out infinite' }} />
      <div className="absolute top-10 -right-3 w-3 h-6 rounded-full bg-blue-500 origin-top"
        style={{ animation: 'armSwing 1.1s ease-in-out 0.55s infinite' }} />

      {/* Legs */}
      <div className="flex justify-center gap-2 mt-0.5">
        <div className="w-3 h-4 rounded-b-lg bg-indigo-600"
          style={{ animation: 'botBounce 1.1s ease-in-out 0.1s infinite', transformOrigin: 'top' }} />
        <div className="w-3 h-4 rounded-b-lg bg-indigo-600"
          style={{ animation: 'botBounce 1.1s ease-in-out 0.6s infinite', transformOrigin: 'top' }} />
      </div>
    </div>
    </div>
  );
}

function FloatingNode({ x, y, delay, color, icon }) {
  return (
    <div
      className={`absolute w-9 h-9 rounded-xl ${color}/20 border border-current flex items-center justify-center text-base shadow-sm`}
      style={{
        left: `${x}%`, top: `${y}%`,
        animation: `floatNode 2.4s ease-in-out ${delay}ms infinite`,
        borderColor: `var(--tw-bg-opacity, 1)`,
      }}
    >
      <span className={`w-8 h-8 rounded-xl ${color}/30 flex items-center justify-center text-sm`}>
        {icon}
      </span>
    </div>
  );
}

function LaserBeam({ x1, y1, x2, y2, delay }) {
  return (
    <line
      x1={x1} y1={y1} x2={x2} y2={y2}
      stroke="url(#laserGrad)"
      strokeWidth="1.5"
      strokeDasharray="4 6"
      style={{ animation: `laserPulse 1.8s ease-in-out ${delay}ms infinite` }}
    >
      <defs>
        <linearGradient id="laserGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#818cf8" />
        </linearGradient>
      </defs>
    </line>
  );
}

function Packet({ delay, fromX, fromY }) {
  return (
    <div
      className="absolute w-3 h-3 rounded-full bg-cyan-400 shadow-md shadow-cyan-300 text-[8px] flex items-center justify-center"
      style={{
        left: `${fromX}%`,
        top: `${fromY}%`,
        animation: `packetFly 2.1s ease-in ${delay}ms infinite`,
      }}
    >
      ✦
    </div>
  );
}
