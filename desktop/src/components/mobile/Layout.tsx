import React from 'react';
import { Nav } from './Nav';
import { Dashboard } from './Dashboard';
import { History } from './History';
import { Settings } from './Settings';
import { DetailModal } from './DetailModal';
import { MobileView, ClipboardEntry, ContentType, LinkedDevice } from '../../types';

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

  return (
    <div className="relative h-dvh w-full bg-black overflow-hidden font-sans">
       {/* Background decoration */}
       <div className="absolute -top-25 -left-25 w-125 h-125 rounded-full bg-purple-600/20 blur-[100px] pointer-events-none" />
       <div className="absolute -bottom-25 -right-25 w-125 h-125 rounded-full bg-blue-600/20 blur-[100px] pointer-events-none" />
 
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
             historyCount={history.length}
             onClearHistory={onClearHistory}
             onLogout={onLogout}
             onShowDevices={onShowDevices}
             onScanQR={onScanQR}
             onEnterKey={onEnterKey}
             onShowPairingCode={onShowPairingCode}
             onViewHistory={() => onViewChange('history')}
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
    </div>
  );
};
