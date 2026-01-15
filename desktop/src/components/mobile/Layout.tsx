import React from 'react';
import { Nav } from './Nav';
import { Icons } from '../Icons';
import { Dashboard } from './Dashboard';
import { History } from './History';
import { Settings } from './Settings';
import { DetailModal } from './DetailModal';
import { MobileView, ClipboardEntry, ContentType, LinkedDevice } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

interface MobileLayoutProps {
  history: ClipboardEntry[];
  devices: LinkedDevice[];
  mobileView: MobileView;
  filterType: ContentType | "all";
  searchQuery: string;
  selectedEntry: ClipboardEntry | null;
  connected: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  email: string;
  syncing?: boolean;
  queuedCount?: number;

  onCopy: (text: string) => void;
  onDelete: (id: string) => void;
  onClearHistory: () => void;
  onLogout: () => void;
  onScanQR: () => void;
  onEnterKey: () => void;
  onShowPairingCode: () => void;
  onShowDevices: () => void;
  onViewChange: (view: MobileView) => void;
  onSearchChange: (query: string) => void;
  onFilterChange: (type: ContentType | "all") => void;
  onSelectEntry: (entry: ClipboardEntry | null) => void;
  onPin: (id: string) => void;
  onRefresh: () => Promise<void>;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
  history,
  devices,
  mobileView,
  filterType,
  searchQuery,
  selectedEntry,
  connected,
  isLoading,
  isRefreshing,
  email,
  syncing,
  queuedCount,
  onCopy,
  onDelete,
  onClearHistory,
  onLogout,
  onScanQR,
  onEnterKey,
  onShowPairingCode,
  onShowDevices,
  onViewChange,
  onSearchChange,
  onFilterChange,
  onSelectEntry,
  onPin,
  onRefresh,
}) => {
  const viewIndex = mobileView === 'dashboard' ? 0 : mobileView === 'history' ? 1 : 2;
  const slideOffset = `-${viewIndex * 100}vw`;

  const { language, setLanguage } = useLanguage();
  const [showLanguage, setShowLanguage] = React.useState(false);

  const { theme, setTheme } = useTheme();
  const [showTheme, setShowTheme] = React.useState(false);

  const handleLanguageSelect = (lang: string) => {
    if (['English', 'Spanish', 'French', 'German', 'Chinese'].includes(lang)) {
      setLanguage(lang as any);
    }
    setShowLanguage(false);
  };

  const handleThemeSelect = (selectedTheme: 'dark' | 'light' | 'system') => {
    setTheme(selectedTheme);
    setShowTheme(false);
  };

  const [showNotifications, setShowNotifications] = React.useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(false);

  React.useEffect(() => {
    isPermissionGranted().then(granted => setNotificationsEnabled(granted));
  }, []);

  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
      const permission = await requestPermission();
      if (permission === 'granted') {
        setNotificationsEnabled(true);
        sendNotification({ title: 'Echo', body: 'Notifications enabled!' });
      }
    }
    setShowNotifications(false);
  };


  return (
    <div className="relative h-dvh w-full bg-(--color-bg) overflow-hidden font-sans transition-colors duration-300">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute inset-0 transition-colors duration-300"
          style={{
            background: 'linear-gradient(to bottom right, var(--mobile-gradient-from), var(--color-bg), var(--mobile-gradient-to))'
          }}
        />
        <div
          className="absolute top-0 left-0 w-[25rem] h-[25rem] rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2 transition-colors duration-300"
          style={{ backgroundColor: 'var(--mobile-glow-primary)' }}
        />
        <div
          className="absolute bottom-0 right-0 w-[18.75rem] h-[18.75rem] rounded-full blur-[120px] translate-x-1/3 translate-y-1/3 transition-colors duration-300"
          style={{ backgroundColor: 'var(--mobile-glow-secondary)' }}
        />

        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      <div
        className="absolute inset-0 flex transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ transform: `translateX(${slideOffset})`, width: '300vw' }}
      >
        <div className="w-screen h-full shrink-0 overflow-y-auto">
          <Dashboard
            isLoading={isLoading}
            connected={connected}
            syncing={syncing}
            queuedCount={queuedCount}
            history={history}
            devices={devices}
            onCopy={onCopy}
            onViewAllHistory={() => onViewChange('history')}
            onShowDevices={onShowDevices}
            onScanQR={onScanQR}
            onEnterKey={onEnterKey}
            onShowPairingCode={onShowPairingCode}
            onDelete={onDelete}
            onRefresh={onRefresh}
            isRefreshing={isRefreshing}
            onSelectEntry={(entry) => entry && onSelectEntry(entry)}
          />
        </div>

        <div className="w-screen h-full shrink-0 overflow-y-auto">
          <History
            isLoading={isLoading}
            history={history}
            isRefreshing={isRefreshing}
            searchQuery={searchQuery}
            filterType={filterType}
            onSearchChange={onSearchChange}
            onFilterChange={onFilterChange}
            onClearHistory={onClearHistory}
            onBack={() => onViewChange('dashboard')}
            onItemClick={onSelectEntry}
            deviceCount={devices.length}
            onRefresh={onRefresh}
          />
        </div>

        <div className="w-screen h-full shrink-0 overflow-y-auto">
          <Settings
            email={email}
            devices={devices}
            history={history}
            historyCount={history.length}
            onClearHistory={onClearHistory}
            onLogout={onLogout}
            onShowDevices={onShowDevices}
            onScanQR={onScanQR}
            onEnterKey={onEnterKey}
            onShowPairingCode={onShowPairingCode}
            onViewHistory={() => onViewChange('history')}
            onShowLanguagePicker={() => setShowLanguage(true)}
            onShowThemePicker={() => setShowTheme(true)}
            onShowNotifications={() => setShowNotifications(true)}
          />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-80 flex justify-center pointer-events-none pb-safe">
        <div className="w-full pointer-events-auto">
          <Nav
            currentView={mobileView}
            onChange={onViewChange}
            badgeCount={history.length}
          />
        </div>
      </div>

      {selectedEntry && (
        <DetailModal
          entry={selectedEntry}
          onClose={() => onSelectEntry(null)}
          onCopy={onCopy}
          onPin={onPin}
          onDelete={onDelete}
        />
      )}

      {showLanguage && (
        <div className="fixed inset-0 z-(--z-modal) flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-(--color-glass-surface) backdrop-blur-3xl rounded-3xl border border-(--color-glass-border) p-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-center font-bold text-(--color-glass-text) mb-4 pt-2">Language</h3>
            <div className="flex flex-col gap-1">
              {['English', 'Spanish', 'French', 'German', 'Chinese'].map((lang) => (
                <button
                  key={lang}
                  className={`px-6 py-4 rounded-2xl text-left transition-all active:scale-[0.98] ${language === lang ? 'bg-purple-500 text-white shadow-lg' : 'text-(--color-glass-text) active:bg-(--color-highlight)'
                    }`}
                  onClick={() => handleLanguageSelect(lang)}
                >
                  <span className="font-semibold">{lang}</span>
                </button>
              ))}
            </div>
            <button
              className="w-full mt-4 py-4 text-(--color-glass-text-muted) font-bold active:opacity-60 transition-opacity"
              onClick={() => setShowLanguage(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showTheme && (
        <div className="fixed inset-0 z-(--z-modal) flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-(--color-glass-surface) backdrop-blur-3xl rounded-3xl border border-(--color-glass-border) p-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-center font-bold text-(--color-glass-text) mb-4 pt-2">Appearance</h3>
            <div className="flex flex-col gap-2">
              {[
                { id: 'light', label: 'Light', icon: Icons.sun },
                { id: 'dark', label: 'Dark', icon: Icons.moon },
                { id: 'system', label: 'System', icon: Icons.settings }
              ].map((t) => (
                <button
                  key={t.id}
                  className={`flex items-center gap-3 px-6 py-4 rounded-2xl transition-all active:scale-[0.98] ${theme === t.id ? 'bg-purple-500 text-white shadow-lg' : 'text-(--color-glass-text) bg-(--color-highlight) active:bg-(--color-glass-surface)'
                    }`}
                  onClick={() => handleThemeSelect(t.id as any)}
                >
                  <div className="w-5 h-5">{t.icon}</div>
                  <span className="font-semibold">{t.label}</span>
                </button>
              ))}
            </div>
            <button
              className="w-full mt-4 py-4 text-(--color-glass-text-muted) font-bold active:opacity-60 transition-opacity"
              onClick={() => setShowTheme(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {showNotifications && (
        <div className="fixed inset-0 z-(--z-modal) flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-(--color-glass-surface) backdrop-blur-3xl rounded-3xl border border-(--color-glass-border) p-6 shadow-2xl animate-in zoom-in-95 duration-200 text-center">
            <div className="w-16 h-16 bg-purple-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 text-purple-400">
              <div className="w-8 h-8">{Icons.bell}</div>
            </div>
            <h3 className="font-bold text-(--color-glass-text) text-lg mb-2">Push Notifications</h3>
            <p className="text-(--color-glass-text-muted) text-sm mb-6 leading-relaxed">
              Stay updated with instant clipboard alerts and sync status.
            </p>
            <div className="flex flex-col gap-3">
              <button
                className="w-full py-4 bg-purple-500 text-white rounded-2xl font-bold shadow-lg active:scale-[0.98] transition-all"
                onClick={handleToggleNotifications}
              >
                {notificationsEnabled ? 'Already Enabled' : 'Enable Now'}
              </button>
              <button
                className="w-full py-4 text-(--color-glass-text-muted) font-bold active:opacity-60 transition-opacity"
                onClick={() => setShowNotifications(false)}
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
