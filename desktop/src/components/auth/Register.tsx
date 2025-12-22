import React, { useState } from 'react';
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
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight text-white">Create account</h1>
        <p className="text-zinc-500 text-sm">Start syncing across all your devices</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">First Name</label>
            <input
              type="text"
              required
              className="w-full p-3.5 bg-zinc-900/80 rounded-xl border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_rgb(24_24_27)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:white]"
              placeholder="John"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Last Name</label>
            <input
              type="text"
              required
              className="w-full p-3.5 bg-zinc-900/80 rounded-xl border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_rgb(24_24_27)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:white]"
              placeholder="Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Email</label>
          <input
            type="email"
            required
            className="w-full p-3.5 bg-zinc-900/80 rounded-xl border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_rgb(24_24_27)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:white]"
            placeholder="name@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Password</label>
          <input
            type="password"
            required
            minLength={8}
            className="w-full p-3.5 bg-zinc-900/80 rounded-xl border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all [&:-webkit-autofill]:[box-shadow:0_0_0_1000px_rgb(24_24_27)_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:white]"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {/* Password strength indicator */}
          {password && (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 flex gap-1">
                {[1, 2, 3, 4].map((level) => {
                  const strength = password.length >= 12 ? 4 : 
                                   password.length >= 10 ? 3 :
                                   password.length >= 8 ? 2 : 1;
                  return (
                    <div 
                      key={level} 
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        level <= strength 
                          ? strength === 4 ? 'bg-green-500' 
                          : strength === 3 ? 'bg-yellow-500'
                          : strength === 2 ? 'bg-orange-500'
                          : 'bg-red-500'
                          : 'bg-zinc-800'
                      }`} 
                    />
                  );
                })}
              </div>
              <span className={`text-[10px] font-bold uppercase ${
                password.length >= 12 ? 'text-green-500' :
                password.length >= 10 ? 'text-yellow-500' :
                password.length >= 8 ? 'text-orange-500' : 'text-red-500'
              }`}>
                {password.length >= 12 ? 'Strong' :
                 password.length >= 10 ? 'Good' :
                 password.length >= 8 ? 'Fair' : 'Weak'}
              </span>
            </div>
          )}
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm font-medium text-center">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 bg-white text-black rounded-xl font-bold text-sm hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-lg shadow-white/10 disabled:opacity-50 mt-2"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div className="text-center pt-4 border-t border-white/5">
        <button
          onClick={onSwitchToLogin}
          className="text-sm text-zinc-500 hover:text-white transition-colors"
        >
          Already have an account? <span className="font-semibold text-purple-400 hover:text-purple-300">Sign in</span>
        </button>
      </div>
    </div>
  );
};
