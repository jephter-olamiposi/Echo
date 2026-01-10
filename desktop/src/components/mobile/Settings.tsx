import React, { useState, useEffect } from 'react';
import { Icons } from '../Icons';
import { MobileHeader } from './Header';
import { haptic } from '../../utils/haptics';
import { Button } from '../ui/Button';
import { SettingsRow } from '../ui/SettingsRow';
import { SettingsGroup } from '../ui/SettingsGroup';
import { useToast } from '../../contexts/ToastContext';
import { ClipboardEntry, LinkedDevice } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { openUrl } from '@tauri-apps/plugin-opener';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { getVersion } from '@tauri-apps/api/app';

interface MobileSettingsProps {
  email: string;
  devices: LinkedDevice[];
  history: ClipboardEntry[];
  historyCount: number;
  onClearHistory: () => void;
  onLogout: () => void;
  onShowDevices: () => void;
  onScanQR: () => void;
  onEnterKey: () => void;
  onShowPairingCode: () => void;
  onViewHistory: () => void;
  onShowLanguage?: () => void;
}

export const Settings: React.FC<MobileSettingsProps> = ({
  email,
  devices,
  history,
  historyCount,
  onClearHistory,
  onLogout,
  onShowDevices,
  onScanQR,
  onEnterKey: _onEnterKey,
  onShowPairingCode: _onShowPairingCode,
  onViewHistory,
  onShowLanguage
}) => {
  const { showToast } = useToast();
  const { theme, setTheme } = useTheme();
  const { language, t } = useLanguage();
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => 
    localStorage.getItem("echo_notifications_enabled") !== "false"
  );
  
  const [appVersion, setAppVersion] = useState("v1.0.0");

  useEffect(() => {
    getVersion().then(v => setAppVersion(`v${v}`)).catch(e => console.error("Failed to get version", e));
  }, []);

  const handleDataExport = async () => {
    haptic.medium();
    try {
        const data = JSON.stringify(history, null, 2);
        const fileName = `echo-export-${new Date().toISOString().split('T')[0]}.json`;
        
        // Native Save Dialog
        const path = await save({
            defaultPath: fileName,
            filters: [{
                name: 'JSON',
                extensions: ['json']
            }]
        });

        if (path) {
            await writeTextFile(path, data);
            showToast("Data exported successfully", "success");
        }
    } catch (e) {
      console.error("Export failed:", e);
      showToast("Failed to export data", "error");
    }
  };

  const cycleTheme = () => {
    haptic.light();
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('system');
    else setTheme('dark');
  };

  const toggleNotifications = () => {
    haptic.light();
    const newState = !notificationsEnabled;
    setNotificationsEnabled(newState);
    localStorage.setItem("echo_notifications_enabled", String(newState));
    showToast(`Notifications ${newState ? 'enabled' : 'disabled'}`, 'info');
  };

  const handleOpenUrl = async (url: string) => {
      haptic.light();
      try {
          await openUrl(url);
      } catch (e) {
          console.warn("Plugin open failed, falling back to window.open", e);
          window.open(url, '_blank');
      }
  };

  // Derived user info
  const initial = email.charAt(0).toUpperCase();
  const username = email.split('@')[0];

  const themeLabel = theme === 'dark' ? 'Dark' : theme === 'light' ? 'Light' : 'System';

  return (
    <div className="flex flex-col h-full w-full bg-transparent text-(--color-text-primary) overflow-hidden transition-colors duration-300">
      <MobileHeader title={t('settings')} className="bg-transparent backdrop-blur-md sticky top-0 z-10" />

      <div className="flex-1 overflow-y-auto pb-32">
        <div className="flex flex-col gap-6">
          
          {/* Profile Card Section */}
          <div className="flex flex-col items-center justify-center pt-8 pb-6 border-b border-(--color-border-subtle)">
            {/* Avatar */}
            <div className="relative mb-4">
              <div className="w-20 h-20 rounded-full bg-linear-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl shadow-purple-500/20 ring-4 ring-(--color-bg)">
                {initial}
              </div>
              <div className="absolute -bottom-1 -right-1 bg-(--color-bg) rounded-full p-1">
                <div className="bg-green-500 w-4 h-4 rounded-full border-2 border-(--color-bg)"></div>
              </div>
            </div>
            
            {/* User Info */}
            <div className="text-center">
              <h2 className="text-xl font-bold text-(--color-text-primary) mb-0.5">{username}</h2>
              <p className="text-sm text-(--color-text-secondary) mb-3">{email}</p>
              
              {/* Plan Badge */}
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-(--color-surface-raised) border border-(--color-border)">
                <div className="w-2 h-2 rounded-full bg-linear-to-r from-amber-400 to-orange-500"></div>
                <span className="text-xs font-medium text-(--color-text-secondary)">Free Plan</span>
              </div>
            </div>
          </div>

          <div className="px-4 flex flex-col gap-8">
            {/* Data & Storage */}
            <SettingsGroup label={t('data_storage')}>
              <SettingsRow
                icon={Icons.history}
                iconBg="bg-purple-500/15 text-purple-400"
                label={t('history')}
                value={`${historyCount} items`}
                onClick={onViewHistory}
              />
              <SettingsRow
                icon={Icons.trash}
                iconBg="bg-red-500/15 text-red-400"
                label={t('clear_cache')}
                onClick={() => { haptic.medium(); onClearHistory(); }}
                destructive
                showChevron={false}
              />
              <SettingsRow
                icon={Icons.download}
                iconBg="bg-(--color-surface-raised) text-(--color-text-secondary)"
                label={t('export_data')}
                onClick={handleDataExport}
              />
            </SettingsGroup>

            {/* Devices */}
            <SettingsGroup label={t('devices')}>
              <SettingsRow
                icon={Icons.devices}
                iconBg="bg-indigo-500/15 text-indigo-400"
                label={t('linked_devices')}
                value={`${devices.length}`}
                onClick={onShowDevices}
              />
              <SettingsRow
                icon={Icons.plus}
                iconBg="bg-emerald-500/15 text-emerald-400"
                label={t('add_new_device')}
                onClick={onScanQR}
              />
            </SettingsGroup>

            {/* Preferences */}
            <SettingsGroup label={t('preferences')}>
              <SettingsRow
                icon={Icons.bell}
                iconBg="bg-orange-500/15 text-orange-400"
                label={t('notifications')}
                value={notificationsEnabled ? "On" : "Off"}
                onClick={toggleNotifications}
              />
              <SettingsRow
                icon={Icons.moon}
                iconBg="bg-(--color-surface-raised) text-(--color-text-secondary)"
                label={t('theme')}
                value={themeLabel}
                onClick={cycleTheme}
              />
              <SettingsRow
                icon={Icons.globe}
                iconBg="bg-(--color-surface-raised) text-(--color-text-secondary)"
                label={t('language')}
                value={language}
                onClick={onShowLanguage}
              />
            </SettingsGroup>

            {/* Support */}
            <SettingsGroup label={t('support')}>
              <SettingsRow
                icon={Icons.help}
                iconBg="bg-(--color-surface-raised) text-(--color-text-secondary)"
                label={t('help_center')}
                onClick={() => handleOpenUrl("https://github.com/jephter-olamiposi/echo/issues")}
              />
              <SettingsRow
                icon={Icons.mail}
                iconBg="bg-(--color-surface-raised) text-(--color-text-secondary)"
                label={t('contact_us')}
                onClick={() => handleOpenUrl("mailto:support@echo.app")}
              />
              <SettingsRow
                icon={Icons.alert}
                iconBg="bg-(--color-surface-raised) text-(--color-text-secondary)"
                label={t('report_problem')}
                onClick={() => handleOpenUrl("https://github.com/jephter-olamiposi/echo/issues/new")}
              />
            </SettingsGroup>

            {/* Sign out */}
            <div className="px-2">
              <Button
                variant="danger"
                size="md"
                fullWidth
                onClick={() => { haptic.medium(); onLogout(); }}
              >
                {t('sign_out')}
              </Button>
            </div>

            {/* Footer */}
            <div className="flex flex-col items-center gap-0.5 pt-4 pb-12">
              <span className="text-[11px] text-(--color-text-tertiary)">Echo {appVersion}</span>
              <span className="text-[11px] text-(--color-text-tertiary)">Encrypted & Open Source</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
