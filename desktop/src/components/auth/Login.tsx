import React, { useState } from 'react';
import { apiFetch } from '../../api';

interface LoginProps {
  onSuccess: (token: string, email: string) => void;
  onSwitchToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      onSuccess(data.token, email);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-8 w-full max-w-sm mx-auto animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-(--spring-easing)">
      <div className="text-center space-y-3">
        <h1 className="text-4xl font-black tracking-tight text-white">Welcome back</h1>
        <p className="text-zinc-500 font-medium">Access your secure clipboard ecosystem</p>
      </div>

      <div className="glass rounded-4xl p-8 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-5">
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
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Passworde</label>
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
            {loading ? 'Authenticating...' : 'Sign In To Echo'}
          </button>
        </form>
      </div>

      <div className="text-center">
        <button
          onClick={onSwitchToRegister}
          className="group text-sm font-bold text-zinc-500 hover:text-white transition-all spring-transition"
        >
          New here? <span className="text-white group-hover:underline decoration-purple-500 underline-offset-4">Create your account</span>
        </button>
      </div>
    </div>
  );
};
