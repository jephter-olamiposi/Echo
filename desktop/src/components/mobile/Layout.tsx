import React from 'react';
import { Nav } from './Nav';
import { Dashboard } from './Dashboard';
import { History } from './History';
import { Settings } from './Settings';
import { DetailModal } from './DetailModal';
import { MobileView, ClipboardEntry, ContentType, LinkedDevice } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTheme } from '../../contexts/ThemeContext';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
import { isPermissionGranted, requestPermission, sendNotification } from '@tauri-apps/plugin-notification';

interface MobileLayoutProps {
  // State props - passed directly
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
  
  // Action handlers - passed directly
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
  // State
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
  // Actions
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
  // Calculate horizontal offset for sliding effect - use vw units for accuracy
  const viewIndex = mobileView === 'dashboard' ? 0 : mobileView === 'history' ? 1 : 2;
  const slideOffset = `-${viewIndex * 100}vw`;

  // Language state from Context
  const { language, setLanguage, t } = useLanguage();
  const [showLanguage, setShowLanguage] = React.useState(false);

  // Theme state from Context
  const { theme, setTheme } = useTheme();
  const [showTheme, setShowTheme] = React.useState(false);

  const handleLanguageSelect = (lang: string) => {
    // Cast string to Language type if valid, otherwise ignore or handle error
    if (['English', 'Spanish', 'French', 'German', 'Chinese'].includes(lang)) {
       setLanguage(lang as any);
    }
    setShowLanguage(false);
  };

  const handleThemeSelect = (selectedTheme: 'dark' | 'light' | 'system') => {
    setTheme(selectedTheme);
    setShowTheme(false);
  };

  // Notification state
  const [showNotifications, setShowNotifications] = React.useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(false);

  // Check notification permission on mount
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
    // Note: Can't programmatically disable - user must do it in system settings
    setShowNotifications(false);
  };

  // Export data handler
  const handleExportData = async () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      email,
      historyCount: history.length,
      history: history.map(entry => ({
        id: entry.id,
        content: entry.content,
        type: entry.contentType,
        source: entry.source,
        createdAt: entry.timestamp,
        pinned: entry.pinned
      }))
    };
    
    const filePath = await save({
      title: 'Export Echo Data',
      defaultPath: `echo-export-${new Date().toISOString().split('T')[0]}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    });
    
    if (filePath) {
      await writeTextFile(filePath, JSON.stringify(exportData, null, 2));
    }
  };

  return (
    <div className="relative h-dvh w-full bg-(--color-bg) overflow-hidden font-sans transition-colors duration-300">
      {/* Stylish Background - Matching Onboarding */}
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
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-5" 
          style={{
            backgroundImage: 'linear-gradient(var(--color-border) 1px, transparent 1px), linear-gradient(90deg, var(--color-border) 1px, transparent 1px)',
            backgroundSize: '50px 50px'
          }} 
        />
      </div>
 
       {/* View Slider Container */}
       <div 
         className="absolute inset-0 flex transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
         style={{ transform: `translateX(${slideOffset})`, width: '300vw' }}
       >
         {/* Dashboard */}
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
             />
         </div>

         {/* History */}
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

         {/* Settings */}
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
               onExportData={handleExportData}
             />
         </div>
       </div>
 
       {/* Bottom Nav */}
       <div className="fixed bottom-0 left-0 right-0 z-80 flex justify-center pointer-events-none pb-safe">
         <div className="w-full pointer-events-auto">
           <Nav 
             currentView={mobileView} 
             onChange={onViewChange}
             badgeCount={history.length}
           />
         </div>
       </div>

      {/* Mobile Detail Modal */}
      {selectedEntry && (
        <DetailModal 
          entry={selectedEntry}
          onClose={() => onSelectEntry(null)}
          onCopy={onCopy}
          onPin={onPin}
          onDelete={onDelete}
        />
      )}

      {/* Language Modal */}
      {showLanguage && (
        <div className="fixed inset-0 z-150 flex items-end justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowLanguage(false)} />
            <div className="relative w-full max-w-md bg-(--color-surface-raised) rounded-t-3xl border-t border-(--color-border) p-6 animate-in slide-in-from-bottom duration-300">
                <h3 className="text-xl font-semibold mb-4 text-(--color-text-primary)">{t('language')}</h3>
                <div className="flex flex-col gap-2 mb-6">
                    {["English", "Spanish", "French", "German", "Chinese"].map(lang => (
                    <button
                        key={lang}
                        onClick={() => handleLanguageSelect(lang)}
                        className={`w-full p-4 rounded-xl text-left flex items-center justify-between border transition-all ${
                        language === lang 
                            ? "bg-purple-500/10 border-purple-500/20 text-purple-500" 
                            : "bg-(--color-surface) border-(--color-border) text-(--color-text-primary)"
                        }`}
                    >
                        <span className="font-medium">{lang}</span>
                        {language === lang && <div className="w-2 h-2 rounded-full bg-purple-500" />}
                    </button>
                    ))}
                </div>
                <button 
                    onClick={() => setShowLanguage(false)}
                    className="w-full py-4 rounded-xl bg-(--color-surface) border border-(--color-border) text-(--color-text-secondary) font-medium"
                >
                    Cancel
                </button>
            </div>
        </div>
      )}

      {/* Theme Modal */}
      {showTheme && (
        <div className="fixed inset-0 z-150 flex items-end justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowTheme(false)} />
            <div className="relative w-full max-w-md bg-(--color-surface-raised) rounded-t-3xl border-t border-(--color-border) p-6 animate-in slide-in-from-bottom duration-300">
                <h3 className="text-xl font-semibold mb-4 text-(--color-text-primary)">{t('theme')}</h3>
                <div className="flex flex-col gap-2 mb-6">
                    {([
                      { value: 'dark', label: 'Dark', icon: '🌙' },
                      { value: 'light', label: 'Light', icon: '☀️' },
                      { value: 'system', label: 'System', icon: '💻' }
                    ] as const).map(option => (
                    <button
                        key={option.value}
                        onClick={() => handleThemeSelect(option.value)}
                        className={`w-full p-4 rounded-xl text-left flex items-center justify-between border transition-all ${
                        theme === option.value 
                            ? "bg-purple-500/10 border-purple-500/20 text-purple-500" 
                            : "bg-(--color-surface) border-(--color-border) text-(--color-text-primary)"
                        }`}
                    >
                        <span className="font-medium flex items-center gap-3">
                          <span>{option.icon}</span>
                          <span>{option.label}</span>
                        </span>
                        {theme === option.value && <div className="w-2 h-2 rounded-full bg-purple-500" />}
                    </button>
                    ))}
                </div>
                <button 
                    onClick={() => setShowTheme(false)}
                    className="w-full py-4 rounded-xl bg-(--color-surface) border border-(--color-border) text-(--color-text-secondary) font-medium"
                >
                    Cancel
                </button>
            </div>
        </div>
      )}

      {/* Notifications Modal */}
      {showNotifications && (
        <div className="fixed inset-0 z-150 flex items-end justify-center">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowNotifications(false)} />
            <div className="relative w-full max-w-md bg-(--color-surface-raised) rounded-t-3xl border-t border-(--color-border) p-6 animate-in slide-in-from-bottom duration-300">
                <h3 className="text-xl font-semibold mb-2 text-(--color-text-primary)">Notifications</h3>
                <p className="text-sm text-(--color-text-secondary) mb-6">
                  Get notified when clipboard syncs from other devices.
                </p>
                <div className="flex flex-col gap-4 mb-6">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-(--color-surface) border border-(--color-border)">
                        <div>
                            <span className="font-medium text-(--color-text-primary)">Push Notifications</span>
                            <p className="text-sm text-(--color-text-tertiary)">
                              {notificationsEnabled ? 'Enabled' : 'Disabled'}
                            </p>
                        </div>
                        <button
                            onClick={handleToggleNotifications}
                            className={`w-12 h-7 rounded-full transition-colors relative ${
                              notificationsEnabled ? 'bg-purple-500' : 'bg-(--color-bg-tertiary)'
                            }`}
                        >
                            <div className={`absolute top-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                              notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`} />
                        </button>
                    </div>
                    {notificationsEnabled && (
                      <p className="text-xs text-(--color-text-tertiary) text-center">
                        To disable, go to your device's notification settings.
                      </p>
                    )}
                </div>
                <button 
                    onClick={() => setShowNotifications(false)}
                    className="w-full py-4 rounded-xl bg-(--color-surface) border border-(--color-border) text-(--color-text-secondary) font-medium"
                >
                    Done
                </button>
            </div>
        </div>
      )}
    </div>
  );
};
