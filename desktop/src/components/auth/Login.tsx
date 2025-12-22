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
    <div className="flex flex-col gap-8 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight text-white">Welcome back</h1>
        <p className="text-zinc-500 text-sm">Sign in to your secure clipboard</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Email</label>
          <input
            type="email"
            required
            className="w-full p-4 bg-zinc-900/80 rounded-xl border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all autofill:bg-zinc-900 autofill:text-white [&:-webkit-autofill]:bg-zinc-900 [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_rgb(24_24_27)_inset]"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Password</label>
            <button type="button" className="text-xs font-semibold text-purple-400 hover:text-purple-300 transition-colors">
              Forgot password?
            </button>
          </div>
          <input
            type="password"
            required
            className="w-full p-4 bg-zinc-900/80 rounded-xl border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all autofill:bg-zinc-900 [&:-webkit-autofill]:bg-zinc-900 [&:-webkit-autofill]:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_rgb(24_24_27)_inset]"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium text-center">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-white text-black rounded-xl font-bold text-sm hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-lg shadow-white/10 disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div className="text-center pt-4 border-t border-white/5">
        <button
          onClick={onSwitchToRegister}
          className="text-sm text-zinc-500 hover:text-white transition-colors"
        >
          New here? <span className="font-semibold text-purple-400 hover:text-purple-300">Create account</span>
        </button>
      </div>
    </div>
  );
};
