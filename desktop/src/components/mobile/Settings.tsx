import React from 'react';
import { Icons } from '../Icons';
import { MobileHeader } from './Header';
import { LinkedDevice, ClipboardEntry } from '../../types';
import { haptic } from '../../utils/haptics';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { openUrl } from '@tauri-apps/plugin-opener';

interface MobileSettingsProps {
  email: string;
  devices: LinkedDevice[];
  history?: ClipboardEntry[]; // Optional for compatibility
  historyCount: number;
  onClearHistory: () => void;
  onLogout: () => void;
  onShowDevices: () => void;
  onScanQR: () => void;
  onEnterKey: () => void;
  onShowPairingCode: () => void;
  onViewHistory: () => void;
  onShowThemePicker?: () => void;
  onShowLanguagePicker?: () => void;
  onShowNotifications?: () => void;
  onExportData?: () => void;
}

interface SettingsRowProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  value?: string;
  onClick: () => void;
  destructive?: boolean;
}

const SettingsRow: React.FC<SettingsRowProps> = ({
  icon,
  iconBg,
  label,
  value,
  onClick,
  destructive = false,
}) => (
  <button
    className="flex items-center gap-3 px-4 min-h-[60px] w-full text-left active:bg-(--color-highlight) transition-all active:scale-[0.98]"
    onClick={() => { haptic.light(); onClick(); }}
  >
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg} bg-(--color-glass-surface) border border-(--color-glass-border) shadow-sm`}>
      <div className="w-5 h-5">{icon}</div>
    </div>
    <span className={`flex-1 text-[16px] font-semibold tracking-tight ${destructive ? 'text-red-400' : 'text-(--color-text-primary)'}`}>
      {label}
    </span>
    {value && (
      <span className="text-[14px] font-medium text-(--color-text-tertiary)">{value}</span>
    )}
    {!destructive && (
      <div className="w-4 h-4 text-(--color-text-muted) ml-1">{Icons.chevron}</div>
    )}
  </button>
);

interface SettingsGroupProps {
  label: string;
  children: React.ReactNode;
}

const SettingsGroup: React.FC<SettingsGroupProps> = ({ label, children }) => (
  <div className="flex flex-col">
    <h3 className="text-[12px] font-bold text-(--color-text-muted) px-5 pb-3 uppercase tracking-widest">
      {label}
    </h3>
    <div className="bg-(--color-glass-surface) backdrop-blur-xl rounded-[2rem] border border-(--color-glass-border) overflow-hidden divide-y divide-(--color-border) shadow-xl shadow-(--color-glass-shadow)">
      {children}
    </div>
  </div>
);

export const Settings: React.FC<MobileSettingsProps> = ({
  email,
  devices,
  historyCount,
  onClearHistory,
  onLogout,
  onShowDevices,
  onScanQR,
  onEnterKey,
  onShowPairingCode,
  onViewHistory,
  onShowThemePicker,
  onShowLanguagePicker,
  onShowNotifications,
  onExportData
}) => {
  const { theme } = useTheme();
  const { language } = useLanguage();

  const themeLabel = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System';

  // Support link handlers
  const handleHelpCenter = async () => {
    haptic.light();
    await openUrl('https://echo.app/help');
  };

  const handleContactUs = async () => {
    haptic.light();
    await openUrl('mailto:support@echo.app');
  };

  const handleReportProblem = async () => {
    haptic.light();
    await openUrl('https://echo.app/report');
  };

  return (
    <div className="flex flex-col h-full w-full bg-transparent text-(--color-text-primary) overflow-hidden transition-colors duration-300">
      <MobileHeader title="Settings" className="bg-transparent backdrop-blur-md sticky top-0 z-10" />

      <div className="flex-1 overflow-y-auto pb-32">
        <div className="px-4 py-6 flex flex-col gap-8">

          {/* Account Header */}
          <div className="flex flex-col items-center py-4">
            {/* Avatar with first letter */}
            <div className="w-20 h-20 rounded-full bg-linear-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-3 shadow-lg">
              <span className="text-3xl font-semibold text-white uppercase">
                {email.charAt(0)}
              </span>
            </div>
            {/* Email */}
            <span className="text-[15px] text-(--color-text-secondary) mb-1">{email}</span>
            {/* Subscription badge */}
            <div className="px-3 py-1 rounded-full bg-(--color-bg-tertiary) border border-(--color-border)">
              <span className="text-[12px] font-medium text-(--color-text-secondary)">Free Plan</span>
            </div>
          </div>

          {/* Data & Storage */}
          <SettingsGroup label="Data & storage">
            <SettingsRow
              icon={Icons.history}
              iconBg="bg-purple-500/15 text-purple-400"
              label="History"
              value={`${historyCount}`}
              onClick={onViewHistory}
            />
            <SettingsRow
              icon={Icons.trash}
              iconBg="bg-(--color-bg-tertiary) text-(--color-text-tertiary)"
              label="Clear cache"
              onClick={() => { haptic.medium(); onClearHistory(); }}
              destructive
            />
            <SettingsRow
              icon={Icons.download}
              iconBg="bg-(--color-bg-tertiary) text-(--color-text-tertiary)"
              label="Export data"
              onClick={() => { haptic.light(); onExportData?.(); }}
            />
          </SettingsGroup>

          {/* Devices */}
          <SettingsGroup label="Devices">
            <SettingsRow
              icon={Icons.devices}
              iconBg="bg-indigo-500/15 text-indigo-400"
              label="Linked devices"
              value={`${devices.length}`}
              onClick={onShowDevices}
            />
            <SettingsRow
              icon={Icons.plus}
              iconBg="bg-emerald-500/15 text-emerald-400"
              label="Add new device"
              onClick={onScanQR}
            />
            <SettingsRow
              icon={Icons.qr}
              iconBg="bg-cyan-500/15 text-cyan-400"
              label="Show pairing code"
              onClick={onShowPairingCode}
            />
            <SettingsRow
              icon={Icons.shield}
              iconBg="bg-amber-500/15 text-amber-400"
              label="Enter sync key"
              onClick={onEnterKey}
            />
          </SettingsGroup>

          {/* Preferences */}
          <SettingsGroup label="Preferences">
            <SettingsRow
              icon={Icons.bell}
              iconBg="bg-orange-500/15 text-orange-400"
              label="Notifications"
              onClick={() => onShowNotifications?.()}
            />
            <SettingsRow
              icon={Icons.moon}
              iconBg="bg-(--color-bg-tertiary) text-(--color-text-tertiary)"
              label="Theme"
              value={themeLabel}
              onClick={() => onShowThemePicker?.()}
            />
            <SettingsRow
              icon={Icons.globe}
              iconBg="bg-(--color-bg-tertiary) text-(--color-text-tertiary)"
              label="Language"
              value={language}
              onClick={() => onShowLanguagePicker?.()}
            />
          </SettingsGroup>

          {/* Support */}
          <SettingsGroup label="Support">
            <SettingsRow
              icon={Icons.help}
              iconBg="bg-(--color-bg-tertiary) text-(--color-text-tertiary)"
              label="Help center"
              onClick={handleHelpCenter}
            />
            <SettingsRow
              icon={Icons.mail}
              iconBg="bg-(--color-bg-tertiary) text-(--color-text-tertiary)"
              label="Contact us"
              onClick={handleContactUs}
            />
            <SettingsRow
              icon={Icons.alert}
              iconBg="bg-(--color-bg-tertiary) text-(--color-text-tertiary)"
              label="Report a problem"
              onClick={handleReportProblem}
            />
          </SettingsGroup>

          {/* Sign out */}
          <div className="px-6">
            <button
              className="w-full h-11 rounded-xl bg-(--color-bg-secondary) border border-(--color-border) text-red-500/80 text-[14px] font-medium active:scale-[0.98] transition-all"
              onClick={() => { haptic.medium(); onLogout(); }}
            >
              Sign out
            </button>
          </div>

          {/* Footer */}
          <div className="flex flex-col items-center gap-0.5 pt-4 pb-12">
            <span className="text-[11px] text-(--color-text-tertiary)">Echo v1.0.0</span>
            <span className="text-[11px] text-(--color-text-tertiary)">Encrypted & Open Source</span>
          </div>
        </div>
      </div>
    </div>
  );
};
