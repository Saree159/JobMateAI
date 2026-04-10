import { useState } from 'react';
import logo from '@/assets/logo.png';

const API_BASE = import.meta.env.VITE_API_URL || 'https://hirematrix-backend.grayglacier-5d8fe2aa.eastus2.azurecontainerapps.io';

export default function ComingSoon() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_BASE}/api/users/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, full_name: name }),
      });
      if (res.ok || res.status === 409) {
        setSubmitted(true);
      } else {
        setError('Something went wrong. Please try again.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center px-4 text-white">
      {/* Logo / Brand */}
      <div className="mb-10 text-center">
        <div className="inline-flex items-center gap-3 mb-4">
          <img src={logo} alt="HireMatrix" className="h-10 w-auto" />
          <span className="text-2xl font-bold tracking-tight">HireMatrix</span>
        </div>
        <p className="text-slate-400 text-sm uppercase tracking-widest font-medium">Your AI Job Search Assistant</p>
      </div>

      {/* Main headline */}
      <div className="max-w-xl text-center mb-10">
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight mb-4">
          We're launching <span className="text-blue-400">soon</span>
        </h1>
        <p className="text-slate-400 text-lg leading-relaxed">
          HireMateAI helps you find, track, and apply to jobs smarter — with AI-powered matching, cover letters, and salary insights built for the Israeli market.
        </p>
      </div>

      {/* Feature pills */}
      <div className="flex flex-wrap justify-center gap-2 mb-12">
        {['AI Match Scoring', 'Cover Letters', 'Salary Insights', 'LinkedIn Integration', 'Interview Prep'].map((f) => (
          <span key={f} className="px-3 py-1 rounded-full bg-slate-700/60 border border-slate-600 text-slate-300 text-sm">
            {f}
          </span>
        ))}
      </div>

      {/* Email capture */}
      <div className="w-full max-w-md">
        {submitted ? (
          <div className="text-center bg-blue-500/10 border border-blue-500/30 rounded-2xl p-6">
            <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="font-semibold text-white text-lg">You're on the list!</p>
            <p className="text-slate-400 text-sm mt-1">We'll notify you the moment we launch.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="text"
              placeholder="Your name (optional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
            <input
              type="email"
              placeholder="Your email address"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-60 text-white font-semibold transition"
            >
              {loading ? 'Submitting...' : 'Notify me when we launch'}
            </button>
          </form>
        )}
      </div>

      <p className="text-slate-600 text-xs mt-10">© 2026 HireMatrix · Built for the Israeli job market</p>
    </div>
  );
}
