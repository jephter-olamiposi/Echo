import React, { useState } from 'react';
import { apiFetch } from '../../api';
import { Icons } from '../Icons';

interface LoginProps {
  initialEmail?: string;
  onSuccess: (token: string, email: string) => void;
  onSwitchToRegister: () => void;
}

export const Login: React.FC<LoginProps> = ({ initialEmail = '', onSuccess, onSwitchToRegister }) => {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      if (err.message === "Network error") {
        setError("Network error. Open Settings → Server Config and set the server to your machine IP (e.g. http://10.0.2.2:3000 for Android emulator, or http://192.168.x.x:3000 for a physical device).");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-10 w-full animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-(--color-text-primary)">Welcome back</h1>
        <p className="text-(--color-text-tertiary) text-[14px]">Sign in to continue</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="login-email" className="text-[13px] font-medium text-(--color-text-secondary) pl-1">Email</label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            className="w-full h-12 px-4 bg-(--color-surface-raised) border border-(--color-border) rounded-xl text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/30 transition-all"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center px-1">
            <label htmlFor="login-password" className="text-[13px] font-medium text-(--color-text-secondary)">Password</label>
            <button type="button" className="text-[13px] text-purple-400 hover:text-purple-300 transition-colors">
              Forgot?
            </button>
          </div>
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? "text" : "password"}
              required
              autoComplete="current-password"
              className="w-full h-12 px-4 pr-12 bg-(--color-surface-raised) border border-(--color-border) rounded-xl text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/30 transition-all"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 text-(--color-text-tertiary) hover:text-(--color-text-primary) transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? Icons.eyeOff : Icons.eye}
            </button>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-2xl text-red-400 text-[13px] font-bold text-center animate-shake">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-(--color-text-primary) text-(--color-bg) rounded-xl font-semibold text-[15px] hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-50"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <div className="text-center pt-2">
        <button
          onClick={onSwitchToRegister}
          className="text-[14px] text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
        >
          Don't have an account? <span className="font-medium text-purple-400 ml-1">Sign up</span>
        </button>
      </div>
    </div>
  );
};
