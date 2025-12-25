import React from 'react';
import { Nav } from './Nav';
import { Dashboard } from './Dashboard';
import { History } from './History';
import { Settings } from './Settings';
import { DetailModal } from './DetailModal';
import { AppState, MobileView, ClipboardEntry, ContentType } from '../../types';

interface MobileActions {
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

interface MobileLayoutProps {
  state: AppState;
  actions: MobileActions;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({ state, actions }) => {
  // Calculate horizontal offset for sliding effect
  const viewIndex = state.mobileView === 'dashboard' ? 0 : state.mobileView === 'history' ? 1 : 2;
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
         {/* View Containers - each takes full width and height with its own scroll */}
         <div className="w-full h-full shrink-0 pt-0 pb-0 max-w-2xl mx-auto">
           <Dashboard 
             isLoading={state.isLoading}
             connected={state.connected}
             history={state.history}
             devices={state.devices}
             onCopy={actions.onCopy}
             onViewAllHistory={() => actions.onViewChange('history')}
             onShowDevices={actions.onShowDevices}
             onScanQR={actions.onScanQR}
             onEnterKey={actions.onEnterKey}
             onShowPairingCode={actions.onShowPairingCode}
             onDelete={actions.onDelete}
             onRefresh={actions.onRefresh}
             isRefreshing={state.isRefreshing}
           />
         </div>

         <div className="w-full h-full shrink-0 pt-0 pb-0 max-w-2xl mx-auto">
           <History 
             isLoading={state.isLoading}
             history={state.history}
             isRefreshing={state.isRefreshing}
             searchQuery={state.searchQuery}
             filterType={state.filterType}
             onSearchChange={actions.onSearchChange}
             onFilterChange={actions.onFilterChange}
             onClearHistory={actions.onClearHistory}
             onBack={() => actions.onViewChange('dashboard')}
             onItemClick={actions.onSelectEntry}
             deviceCount={state.devices.length}
             onRefresh={actions.onRefresh}
           />
         </div>

         <div className="w-full h-full shrink-0 pt-0 pb-0 max-w-2xl mx-auto">
           <Settings 
             email={state.email || ""}
             devices={state.devices}
             historyCount={state.history.length}
             onClearHistory={actions.onClearHistory}
             onLogout={actions.onLogout}
             onShowDevices={actions.onShowDevices}
             onScanQR={actions.onScanQR}
             onEnterKey={actions.onEnterKey}
             onShowPairingCode={actions.onShowPairingCode}
           />
         </div>
       </div>
 
       <div className="fixed bottom-0 left-0 right-0 z-80 flex justify-center pointer-events-none pb-safe">
         <div className="w-full max-w-2xl pointer-events-auto">
           <Nav 
             currentView={state.mobileView} 
             onChange={actions.onViewChange}
             badgeCount={state.history.length}
           />
         </div>
       </div>

      {/* Mobile Detail Modal */}
      {state.selectedEntry && (
        <DetailModal 
          entry={state.selectedEntry}
          onClose={() => actions.onSelectEntry(null)}
          onCopy={actions.onCopy}
          onPin={actions.onPin}
          onDelete={actions.onDelete}
        />
      )}
    </div>
  );
};
