import React from 'react';
import { Nav } from './Nav';
import { Dashboard } from './Dashboard';
import { History } from './History';
import { Settings } from './Settings';
import { DetailModal } from './DetailModal';
import { MobileView, ClipboardEntry, ContentType, LinkedDevice } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

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
  // Calculate horizontal offset for sliding effect
  const viewIndex = mobileView === 'dashboard' ? 0 : mobileView === 'history' ? 1 : 2;
  const slideOffset = `-${viewIndex * 100}%`;

  // Language state from Context
  const { language, setLanguage, t } = useLanguage();
  const [showLanguage, setShowLanguage] = React.useState(false);

  const handleLanguageSelect = (lang: string) => {
    // Cast string to Language type if valid, otherwise ignore or handle error
    if (['English', 'Spanish', 'French', 'German', 'Chinese'].includes(lang)) {
       setLanguage(lang as any);
    }
    setShowLanguage(false);
  };

  return (
    <div className="relative h-dvh w-full bg-(--color-bg) overflow-hidden font-sans transition-colors duration-300">
      {/* Stylish Background - Matching Onboarding */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-linear-to-br from-purple-900/20 via-(--color-bg) to-blue-900/20" />
        <div className="absolute top-0 left-0 w-100 h-100 bg-purple-500/20 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-75 h-75 bg-blue-500/15 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3" />
        
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
         className="relative w-full h-full flex transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
         style={{ transform: `translateX(${slideOffset})` }}
       >
         {/* Dashboard */}
         <div className="w-full h-full shrink-0 pt-0 pb-0 max-w-2xl mx-auto">
           <Dashboard 
             isLoading={isLoading}
             connected={connected}
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
         <div className="w-full h-full shrink-0 pt-0 pb-0 max-w-2xl mx-auto">
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
         <div className="w-full h-full shrink-0 pt-0 pb-0 max-w-2xl mx-auto">
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
             onShowLanguage={() => setShowLanguage(true)}
           />
         </div>
       </div>
 
       {/* Bottom Nav */}
       <div className="fixed bottom-0 left-0 right-0 z-80 flex justify-center pointer-events-none pb-safe">
         <div className="w-full max-w-2xl pointer-events-auto">
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
    </div>
  );
};
