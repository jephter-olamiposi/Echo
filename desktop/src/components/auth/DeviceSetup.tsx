import React, { useState } from 'react';
import { Icons } from '../Icons';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface DeviceSetupProps {
  onScanQR: () => void;
  onImportKey: (key: string) => void;
  onCreateNew: () => void;
  isScanning?: boolean;
}

export const DeviceSetup: React.FC<DeviceSetupProps> = ({
  onScanQR,
  onImportKey,
  onCreateNew,
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
    // Basic validation - key should be base64url ~43 chars for 32 bytes
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
          className="flex items-center gap-2 text-(--color-text-secondary) hover:text-(--color-text-primary) transition-colors self-start"
        >
          <div className="w-4 h-4">{Icons.back}</div>
          <span className="text-[14px]">Back</span>
        </button>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-(--color-text-primary)">Enter encryption key</h1>
          <p className="text-(--color-text-tertiary) text-[14px]">
            Paste the encryption key from your other device. You can find it in Settings → Show Key.
          </p>
        </div>

        <div className="space-y-4">
          <Input
            label="Encryption Key"
            placeholder="Paste your encryption key here..."
            value={manualKey}
            onChange={(e) => setManualKey(e.target.value)}
            error={error}
            autoComplete="off"
          />

          <Button 
            variant="primary" 
            size="lg" 
            fullWidth 
            onClick={handleImport}
            disabled={!manualKey.trim()}
          >
            Link Device
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-10 w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="text-center space-y-3">
        <div className="w-16 h-16 mx-auto bg-linear-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-purple-500/25">
          <div className="w-8 h-8 text-white">{Icons.link}</div>
        </div>
        <h1 className="text-2xl font-semibold text-(--color-text-primary)">Set up this device</h1>
        <p className="text-(--color-text-tertiary) text-[14px] leading-relaxed max-w-sm mx-auto">
          Link to an existing device to sync your encrypted clipboard, or start fresh with a new encryption key.
        </p>
      </div>

      {/* Options */}
      <div className="space-y-3">
        {/* Scan QR - Primary option */}
        <button
          onClick={onScanQR}
          disabled={isScanning}
          className="w-full p-4 bg-(--color-surface-raised) border border-(--color-border) rounded-2xl hover:border-purple-500/30 hover:bg-(--color-surface) transition-all group text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20 transition-colors">
              <div className="w-6 h-6">{Icons.qr}</div>
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-(--color-text-primary) mb-0.5">
                Scan QR Code
              </h3>
              <p className="text-[13px] text-(--color-text-tertiary)">
                Scan from an existing device to link instantly
              </p>
            </div>
            <div className="w-5 h-5 text-(--color-text-tertiary) group-hover:text-purple-400 transition-colors">
              {Icons.chevron}
            </div>
          </div>
        </button>

        {/* Enter Key Manually */}
        <button
          onClick={() => setShowManualEntry(true)}
          className="w-full p-4 bg-(--color-surface-raised) border border-(--color-border) rounded-2xl hover:border-(--color-border-subtle) hover:bg-(--color-surface) transition-all group text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-(--color-surface) border border-(--color-border) flex items-center justify-center text-(--color-text-secondary) group-hover:text-(--color-text-primary) transition-colors">
              <div className="w-6 h-6">{Icons.shield}</div>
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-semibold text-(--color-text-primary) mb-0.5">
                Enter Key Manually
              </h3>
              <p className="text-[13px] text-(--color-text-tertiary)">
                Paste the encryption key from another device
              </p>
            </div>
            <div className="w-5 h-5 text-(--color-text-tertiary) group-hover:text-(--color-text-primary) transition-colors">
              {Icons.chevron}
            </div>
          </div>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-4 py-2">
          <div className="flex-1 h-px bg-(--color-border)" />
          <span className="text-[12px] text-(--color-text-tertiary) uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-(--color-border)" />
        </div>

        {/* Start Fresh */}
        <button
          onClick={onCreateNew}
          className="w-full p-4 bg-transparent border border-dashed border-(--color-border) rounded-2xl hover:border-(--color-text-tertiary) hover:bg-(--color-surface-raised)/50 transition-all group text-left"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-(--color-surface-raised) border border-(--color-border) flex items-center justify-center text-(--color-text-tertiary) group-hover:text-(--color-text-secondary) transition-colors">
              <div className="w-6 h-6">{Icons.plus}</div>
            </div>
            <div className="flex-1">
              <h3 className="text-[15px] font-medium text-(--color-text-secondary) group-hover:text-(--color-text-primary) mb-0.5 transition-colors">
                Start Fresh
              </h3>
              <p className="text-[13px] text-(--color-text-tertiary)">
                Create a new encryption key for this device
              </p>
            </div>
          </div>
        </button>

        {/* Warning for Start Fresh */}
        <p className="text-[12px] text-(--color-text-tertiary) text-center px-4 leading-relaxed">
          <span className="text-amber-400">Note:</span> Starting fresh creates a new key. 
          Previously linked devices won't be able to decrypt new messages.
        </p>
      </div>
    </div>
  );
};
