import React from 'react';
import { Icons } from '../Icons';
import { MobileHeader } from './Header';
import { 
  formatTime, 
  truncate, 
  getContentTypeIcon
} from '../../utils';
import { ClipboardEntry } from '../../types';
import { EmptyState } from '../shared/EmptyState';
import { Skeleton } from '../shared/Skeleton';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';



interface MobileHistoryProps {
  history: ClipboardEntry[];
  isLoading?: boolean;
  isRefreshing: boolean;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearHistory: () => void;
  onBack: () => void;
  onItemClick: (entry: ClipboardEntry) => void;
  onCopy: (text: string) => void; // Optional if item click handles copy
  deviceCount: number;
}

export const History: React.FC<MobileHistoryProps> = ({
  history,
  isLoading,
  isRefreshing,
  searchQuery,
  onSearchChange,
  onClearHistory,
  onBack,
  onItemClick,
  deviceCount
}) => {
  // Pull to refresh integration
  const refreshHistory = async () => {
    // Add artificial delay for feel if needed, or just let the refresh prop handle it
    // In this props structure, we might need a callback to trigger reload
    // For now we simulate
    await new Promise(resolve => setTimeout(resolve, 1500));
  };

  const { containerRef, pullHeight, isLoading: isPullLoading } = usePullToRefresh(refreshHistory);

  const filteredHistory = history.filter(item => 
    item.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div ref={containerRef} className="h-full overflow-y-auto custom-scrollbar w-full bg-black pt-14 pb-24">
      <MobileHeader 
        title="History"
        showBack={true}
        onBack={onBack}
        rightAction={
          history.length > 0 && (
            <button
              className="p-2 rounded-full text-red-500/80 hover:bg-red-500/10 active:scale-95 transition-all"
              onClick={onClearHistory}
              title="Clear history"
            >
              <span className="w-5 h-5">{Icons.trash}</span>
            </button>
          )
        }
      />

      {/* Pull to Refresh Indicator - Dynamic */}
      <div 
        className="fixed top-14 left-0 right-0 flex justify-center overflow-hidden pointer-events-none z-30" 
        style={{ height: `${pullHeight}px` }}
      >
        <div 
          className="flex items-center justify-center w-8 h-8 rounded-full bg-zinc-800 border border-white/10 shadow-xl mt-4 transition-transform duration-200"
          style={{ 
            opacity: Math.min(pullHeight / 40, 1),
            transform: `rotate(${pullHeight * 5}deg) scale(${Math.min(pullHeight / 60, 1)})`
          }}
        >
          {isPullLoading || isRefreshing ? (
             <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          ) : (
             <div className="w-4 h-4 text-purple-500">{Icons.sync}</div>
          )}
        </div>
      </div>

      <div className="px-4 py-3 sticky top-14 z-50 bg-black/95 backdrop-blur-3xl border-b border-white/5 shadow-lg shadow-black/50">
        <div className="relative flex items-center bg-zinc-900/80 rounded-xl h-10 border border-white/5 overflow-hidden focus-within:ring-1 focus-within:ring-purple-500/50 transition-all">
          <div className="absolute left-3 text-zinc-500 w-4 h-4 flex items-center justify-center">
            {Icons.search}
          </div>
          <input 
            type="text" 
            className="w-full h-full bg-transparent pl-10 pr-10 text-sm text-white placeholder-zinc-500 focus:outline-none"
            placeholder="Search filtered items..." 
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button 
              className="absolute right-2 p-1 text-zinc-500 hover:text-white rounded-full bg-white/5"
              onClick={() => onSearchChange("")}
            >
              <div className="w-3 h-3">{Icons.close}</div>
            </button>
          )}
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          <div className="flex flex-col gap-3">
             {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-3 p-4 bg-zinc-900/40 rounded-2xl border border-white/5">
                  <Skeleton variant="circular" className="w-10 h-10 shrink-0" />
                  <div className="flex-1 min-w-0 flex flex-col gap-2">
                    <Skeleton variant="text" className="w-3/4 h-4" />
                    <Skeleton variant="text" className="w-1/2 h-3" />
                  </div>
                </div>
             ))}
          </div>
        ) : filteredHistory.length > 0 ? (
          <div className="flex flex-col bg-zinc-900/40 rounded-2xl overflow-hidden border border-white/5 divide-y divide-white/5">
            {filteredHistory.map((entry) => (
              <button 
                key={entry.id}
                className="flex items-center gap-3 p-4 w-full text-left active:bg-white/5 transition-colors group"
                onClick={() => onItemClick(entry)}
              >
                <div className="w-10 h-10 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-400 shrink-0 relative group-hover:text-white transition-colors">
                  <div className="w-5 h-5">{getContentTypeIcon(entry.contentType)}</div>
                  {entry.pinned && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-purple-500 rounded-full flex items-center justify-center text-[8px] text-white border-2 border-zinc-900 shadow-sm">
                      <div className="w-2 h-2">{Icons.pin}</div>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="block text-sm font-medium text-white/90 truncate mb-0.5 group-hover:text-purple-400 transition-colors">
                    {truncate(entry.content, 60)}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500">
                    <span className="font-medium text-zinc-400">{formatTime(entry.timestamp)}</span>
                    {deviceCount > 1 && (
                      <>
                        <span className="text-zinc-700">•</span>
                        <span className="truncate max-w-30">
                          {entry.source === 'local' ? 'This Device' : (entry.deviceName || 'Remote Device')}
                        </span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-zinc-700 group-hover:text-zinc-500 transition-colors">
                  <div className="w-4 h-4">{Icons.chevron}</div>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <EmptyState 
            title={searchQuery ? "No matches found" : "No History Yet"}
            description={searchQuery ? "Try adjusting your search terms." : "Copy something on your other devices to see it appear here instantly."}
          />
        )}
      </div>
    </div>
  );
};
