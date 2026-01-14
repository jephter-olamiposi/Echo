import React, { useState } from 'react';
import { Icons } from '../Icons';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface DeviceSetupProps {
  onScanQR: () => void;
  onImportKey: (key: string) => void;
  onCreateNew: () => void;
  onLogout?: () => void;
  isScanning?: boolean;
}

export const DeviceSetup: React.FC<DeviceSetupProps> = ({
  onScanQR,
  onImportKey,
  onCreateNew,
  onLogout,
  isScanning = false,
}) => {
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualKey, setManualKey] = useState('');
  const [error, setError] = useState('');

  const handleImport = () => {
    if (!manualKey.trim()) {
      setError('Please enter an encryption key');
      return;
    }
    if (manualKey.trim().length < 40) {
      setError('Invalid key format. Please check and try again.');
      return;
    }
    setError('');
    onImportKey(manualKey.trim());
  };

  if (showManualEntry) {
    return (
      <div className="flex flex-col gap-8 w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
        <button
          onClick={() => setShowManualEntry(false)}
          className="flex items-center gap-2 text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors self-start group"
        >
          <div className="w-5 h-5 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors">
            <div className="w-3 h-3">{Icons.back || '←'}</div>
          </div>
          <span className="text-[14px] font-medium">Back</span>
        </button>

        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white tracking-tight">Enter key</h1>
          <p className="text-(--color-text-tertiary) text-[15px] leading-relaxed">
            Paste the encryption key from your other device. You can find it in <span className="text-(--color-text-secondary) font-medium">Settings → Show Key</span>.
          </p>
        </div>

        <div className="space-y-5">
          <Input
            label="Encryption Key"
            placeholder="Paste encryption key..."
            value={manualKey}
            onChange={(e) => setManualKey(e.target.value)}
            error={error}
            autoComplete="off"
            className="bg-white/5 border-white/10 focus:bg-white/10"
          />

          <Button
            variant="primary"
            size="lg"
            fullWidth
            onClick={handleImport}
            disabled={!manualKey.trim()}
            className="h-14 bg-white text-black hover:bg-white/90 font-bold rounded-2xl shadow-xl shadow-white/10 active:scale-[0.98] transition-all"
          >
            Link Device
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:gap-10 w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center space-y-3 lg:space-y-4">
        <div className="relative w-16 h-16 lg:w-20 lg:h-20 mx-auto group">
          <div className="absolute inset-0 bg-purple-500 blur-2xl opacity-20 group-hover:opacity-40 transition-opacity duration-500" />
          <div className="relative w-16 h-16 lg:w-20 lg:h-20 bg-linear-to-br from-purple-500 to-purple-600 rounded-2xl lg:rounded-3xl flex items-center justify-center shadow-2xl shadow-purple-500/30 rotate-3 group-hover:rotate-0 transition-transform duration-500">
            <div className="w-8 h-8 lg:w-10 lg:h-10 text-white drop-shadow-lg">{Icons.link}</div>
          </div>
        </div>
        <div className="space-y-1 lg:space-y-2">
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Set up this device</h1>
          <p className="text-(--color-text-tertiary) text-[14px] lg:text-[15px] leading-relaxed max-w-xs lg:max-w-sm mx-auto">
            Link to an existing device to sync your history, or start fresh with a new key.
          </p>
        </div>
      </div>

      {/* Options */}
      <div className="space-y-3 lg:space-y-4">
        {/* Scan QR - Primary option */}
        <button
          onClick={onScanQR}
          disabled={isScanning}
          className="w-full p-4 lg:p-5 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-2xl lg:rounded-[2rem] hover:border-purple-500/40 hover:bg-white/10 transition-all group text-left shadow-[0_8px_32px_rgba(0,0,0,0.1)] active:scale-[0.98]"
        >
          <div className="flex items-center gap-4 lg:gap-5">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20 group-hover:scale-110 transition-all duration-500">
              <div className="w-6 h-6 lg:w-7 lg:h-7">{Icons.qr}</div>
            </div>
            <div className="flex-1">
              <h3 className="text-[16px] lg:text-[17px] font-bold text-white mb-0.5">
                Scan QR Code
              </h3>
              <p className="text-[13px] lg:text-[14px] text-(--color-text-tertiary)">
                Scan from an existing device to link
              </p>
            </div>
            <div className="w-5 h-5 lg:w-6 lg:h-6 text-white/20 group-hover:text-purple-400 group-hover:translate-x-1 transition-all">
              {Icons.chevron || '→'}
            </div>
          </div>
        </button>

        {/* Enter Key Manually */}
        <button
          onClick={() => setShowManualEntry(true)}
          className="w-full p-4 lg:p-5 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-2xl lg:rounded-[2rem] hover:border-white/20 hover:bg-white/10 transition-all group text-left shadow-[0_8px_32px_rgba(0,0,0,0.1)] active:scale-[0.98]"
        >
          <div className="flex items-center gap-4 lg:gap-5">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 group-hover:text-white group-hover:scale-110 transition-all duration-500">
              <div className="w-6 h-6 lg:w-7 lg:h-7">{Icons.shield}</div>
            </div>
            <div className="flex-1">
              <h3 className="text-[16px] lg:text-[17px] font-bold text-white mb-0.5">
                Enter Key Manually
              </h3>
              <p className="text-[13px] lg:text-[14px] text-(--color-text-tertiary)">
                Paste the key from another device
              </p>
            </div>
            <div className="w-5 h-5 lg:w-6 lg:h-6 text-white/20 group-hover:text-white group-hover:translate-x-1 transition-all">
              {Icons.chevron || '→'}
            </div>
          </div>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 lg:gap-5 py-2 lg:py-4 px-2">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[11px] lg:text-[12px] font-bold text-white/20 uppercase tracking-[0.2em]">OR</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Start Fresh */}
        <button
          onClick={onCreateNew}
          className="w-full p-4 lg:p-5 bg-transparent border-2 border-dashed border-white/10 rounded-2xl lg:rounded-[2rem] hover:border-white/30 hover:bg-white/5 transition-all group text-left active:scale-[0.98]"
        >
          <div className="flex items-center gap-4 lg:gap-5">
            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-xl lg:rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/30 group-hover:text-white/60 transition-all duration-500">
              <div className="w-6 h-6 lg:w-7 lg:h-7">{Icons.plus}</div>
            </div>
            <div className="flex-1">
              <h3 className="text-[16px] lg:text-[17px] font-bold text-white/40 group-hover:text-white transition-colors">
                Start Fresh
              </h3>
              <p className="text-[13px] lg:text-[14px] text-(--color-text-tertiary)/60 group-hover:text-(--color-text-tertiary) transition-colors">
                Create a new key for this account
              </p>
            </div>
          </div>
        </button>

        {/* Sign Out - For users who want to switch accounts */}
        {onLogout && (
          <div className="pt-4 flex flex-col items-center gap-6">
            <button
              onClick={onLogout}
              className="text-(--color-text-tertiary) hover:text-red-400 text-[14px] font-medium transition-colors flex items-center gap-2"
            >
              <span>Not your account?</span>
              <span className="underline underline-offset-4 decoration-white/10 hover:decoration-red-400/30">Sign Out</span>
            </button>
            <p className="text-[12px] text-white/20 text-center px-8 leading-relaxed italic">
              Note: Previously linked devices won't be able to decrypt messages sent with a new key.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
