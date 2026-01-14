import React, { useState } from 'react';
import { apiFetch } from '../../api';

interface RegisterProps {
  initialEmail?: string;
  onSuccess: (token: string, email: string) => void;
  onSwitchToLogin: () => void;
}

export const Register: React.FC<RegisterProps> = ({ initialEmail = '', onSuccess, onSwitchToLogin }) => {
  const [email, setEmail] = useState(initialEmail);
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
    <div className="flex flex-col gap-8 w-full animate-in fade-in slide-in-from-bottom-6 duration-1000">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-(--color-text-primary)">Create account</h1>
        <p className="text-(--color-text-tertiary) text-[14px]">Join Echo to sync your clipboard</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label htmlFor="register-firstname" className="text-[13px] font-medium text-(--color-text-secondary) pl-1">First name</label>
            <input
              id="register-firstname"
              type="text"
              required
              autoComplete="given-name"
              className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/40 focus:bg-white/10 transition-all shadow-inner"
              placeholder="John"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="register-lastname" className="text-[13px] font-medium text-(--color-text-secondary) pl-1">Last name</label>
            <input
              id="register-lastname"
              type="text"
              required
              autoComplete="family-name"
              className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/40 focus:bg-white/10 transition-all shadow-inner"
              placeholder="Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="register-email" className="text-[13px] font-medium text-(--color-text-secondary) pl-1">Email</label>
          <input
            id="register-email"
            type="email"
            required
            autoComplete="email"
            className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/40 focus:bg-white/10 transition-all shadow-inner"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="register-password" className="text-[13px] font-medium text-(--color-text-secondary) pl-1">Password</label>
          <input
            id="register-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-xl text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/40 focus:bg-white/10 transition-all shadow-inner"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {/* Strength Indicator */}
          {password && (
            <div className="flex items-center justify-between mt-2 px-1">
              <div className="flex gap-1.5 w-1/2">
                {[1, 2, 3, 4].map((level) => {
                  const strength = password.length >= 12 ? 4 :
                    password.length >= 10 ? 3 :
                      password.length >= 8 ? 2 : 1;
                  return (
                    <div
                      key={level}
                      className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${level <= strength
                          ? strength === 4 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'
                            : strength === 3 ? 'bg-sky-500 shadow-[0_0_8px_rgba(14,165,233,0.4)]'
                              : strength === 2 ? 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'
                                : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]'
                          : 'bg-white/5'
                        }`}
                    />
                  );
                })}
              </div>
              <span className={`text-[11px] font-bold tracking-wider uppercase ${password.length >= 12 ? 'text-emerald-500' :
                  password.length >= 10 ? 'text-sky-500' :
                    password.length >= 8 ? 'text-amber-500' : 'text-rose-500'
                }`}>
                {password.length >= 12 ? 'Strong' :
                  password.length >= 10 ? 'Good' :
                    password.length >= 8 ? 'Weak' : 'Too short'}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[13px] font-medium text-center animate-shake">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-(--color-text-primary) text-(--color-bg) rounded-xl font-bold text-[15px] hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 mt-2 shadow-lg shadow-purple-500/10"
        >
          {loading ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <div className="text-center">
        <button
          onClick={onSwitchToLogin}
          className="text-[14px] text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors"
        >
          Already have an account? <span className="font-medium text-purple-400 ml-1">Sign in</span>
        </button>
      </div>
    </div>
  );
};
