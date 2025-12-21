import React, { useState } from 'react';
import { Icons } from '../Icons';
import { apiFetch } from '../../api';

interface RegisterProps {
  onSuccess: (token: string, email: string) => void;
  onSwitchToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ onSuccess, onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/register', {
        method: 'POST',
        body: JSON.stringify({ 
          email, 
          password, 
          first_name: firstName, 
          last_name: lastName 
        }),
      });
      onSuccess(data.token, email);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-[var(--spring-easing)]">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-black tracking-tight text-white">Join Echo</h1>
        <p className="text-zinc-500 font-medium">Start your real-time sync journey</p>
      </div>

      <div className="glass rounded-4xl p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">First Name</label>
              <input
                type="text"
                required
                className="w-full p-4 bg-white/5 rounded-2xl border border-white/5 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all spring-transition"
                placeholder="John"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="space-y-2.5">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Last Name</label>
              <input
                type="text"
                required
                className="w-full p-4 bg-white/5 rounded-2xl border border-white/5 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all spring-transition"
                placeholder="Doe"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Email</label>
            <input
              type="email"
              required
              className="w-full p-4 bg-white/5 rounded-2xl border border-white/5 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all spring-transition"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-2.5">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Password</label>
            <input
              type="password"
              required
              className="w-full p-4 bg-white/5 rounded-2xl border border-white/5 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40 transition-all spring-transition"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold animate-shake text-center">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-white text-black rounded-2xl font-black text-sm hover:bg-zinc-200 active:scale-95 spring-transition shadow-2xl shadow-white/10 disabled:opacity-50 mt-2"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
      </div>

      <div className="text-center">
        <button
          onClick={onSwitchToLogin}
          className="group text-sm font-bold text-zinc-500 hover:text-white transition-all spring-transition"
        >
          Already a member? <span className="text-white group-hover:underline decoration-purple-500 underline-offset-4">Sign in here</span>
        </button>
      </div>
    </div>
  );
};
