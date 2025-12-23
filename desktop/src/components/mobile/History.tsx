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
import { haptic } from '../../utils/haptics';



interface MobileHistoryProps {
  history: ClipboardEntry[];
  isLoading?: boolean;
  isRefreshing: boolean;
  searchQuery: string;
  filterType: "all" | "text" | "code" | "url" | "other";
  onSearchChange: (query: string) => void;
  onFilterChange: (type: any) => void;
  onClearHistory: () => void;
  onBack: () => void;
  onItemClick: (entry: ClipboardEntry) => void;
  onCopy: (text: string) => void; 
  deviceCount: number;
  onRefresh: () => Promise<void>;
}

export const History: React.FC<MobileHistoryProps> = ({
  history,
  isLoading,
  isRefreshing,
  searchQuery,
  filterType,
  onSearchChange,
  onFilterChange,
  onClearHistory,
  onBack,
  onItemClick,
  onRefresh
}) => {
  const { containerRef, pullHeight, isLoading: isHookLoading } = usePullToRefresh(onRefresh);
  const activeRefreshing = isRefreshing || isHookLoading;

  const filteredHistory = history.filter(item => {
    const matchesSearch = item.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || item.contentType === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex flex-col h-full bg-black w-full pb-20 md:pb-0">
      {/* Fixed Sticky Header Area */}
      <div className="shrink-0 z-30 bg-black/80 backdrop-blur-xl border-b border-white/5 sticky top-0">
        <MobileHeader 
          title="History"
          showBack={true}
          onBack={onBack}
          className="bg-transparent! border-none!" 
          rightAction={
            history.length > 0 && (
              <button
                className="p-2 rounded-full text-red-500/80 hover:bg-red-500/10 active:scale-90 transition-all"
                onClick={onClearHistory}
                title="Clear history"
              >
                <div className="w-5 h-5">{Icons.trash}</div>
              </button>
            )
          }
        />
        
        {/* Search & Filter Controls Container */}
        <div className="px-4 space-y-4 pb-4">
          {/* Search Bar */}
          <div className="relative flex items-center bg-zinc-900/50 backdrop-blur-md rounded-2xl h-11 border border-white/10 overflow-hidden focus-within:ring-2 focus-within:ring-purple-500/30 transition-all group">
            <div className="absolute left-4 text-zinc-500 w-4 h-4 flex items-center justify-center group-focus-within:text-purple-400 transition-colors">
              {Icons.search}
            </div>
            <input 
              type="text" 
              className="w-full h-full bg-transparent pl-11 pr-11 text-[15px] text-white placeholder-zinc-500 focus:outline-none"
              placeholder="Search items..." 
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
            {searchQuery && (
              <button 
                className="absolute right-3 p-1.5 text-zinc-500 hover:text-white rounded-full bg-white/5 active:scale-90 transition-all"
                onClick={() => onSearchChange("")}
              >
                <div className="w-3.5 h-3.5">{Icons.close}</div>
              </button>
            )}
          </div>

          {/* Filter Row */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar scroll-smooth -mx-4 px-4">
            {(["all", "text", "code", "url"] as const).map((type) => {
              const isActive = filterType === type;
              return (
                <button
                  key={type}
                  onClick={() => {
                    haptic.selection();
                    onFilterChange(type);
                  }}
                  className={`px-5 py-2 rounded-xl text-[12px] font-bold uppercase tracking-wider whitespace-nowrap transition-all active:scale-95 border ${
                    isActive 
                      ? "bg-purple-600 border-purple-400 text-white shadow-lg shadow-purple-600/20" 
                      : "bg-zinc-900/50 border-white/5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                  }`}
                >
                  {type === "all" ? "All Items" : type === "url" ? "Links" : type}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scrollable List Section */}
      <div ref={containerRef} className="flex-1 overflow-y-auto custom-scrollbar relative bg-black">
        
        {/* Pull to Refresh Indicator */}
        <div 
          className="absolute top-0 left-0 right-0 flex justify-center overflow-hidden pointer-events-none z-10" 
          style={{ height: `${pullHeight}px` }}
        >
          <div 
            className={`flex items-center justify-center w-9 h-9 rounded-full bg-zinc-800 border border-white/10 shadow-2xl mt-8 transition-all duration-300 ${activeRefreshing ? 'animate-pulse ring-4 ring-purple-500/20' : ''}`}
            style={{ 
              opacity: Math.min(pullHeight / 50, 1),
              transform: activeRefreshing 
                ? 'scale(1.1)' 
                : `translateY(${Math.min(pullHeight * 0.2, 20)}px) rotate(${pullHeight * 3}deg) scale(${Math.min(pullHeight / 60, 1)})`,
            }}
          >
            <div className={`w-5 h-5 text-purple-500 ${activeRefreshing ? 'animate-spin' : ''}`}>
              {Icons.sync}
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4 min-h-[calc(100%+1px)]">
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
            <div className="flex flex-col gap-3">
              {filteredHistory.map((entry) => (
                <button 
                  key={entry.id}
                  className="flex items-center gap-4 p-4 w-full bg-zinc-900/30 rounded-2xl border border-white/5 text-left active:bg-white/10 active:scale-[0.98] transition-all group"
                  onClick={() => onItemClick(entry)}
                >
                  <div className="w-11 h-11 rounded-full bg-zinc-800/80 flex items-center justify-center text-zinc-400 shrink-0 relative group-hover:text-purple-400 transition-colors">
                    <div className="w-5 h-5">{getContentTypeIcon(entry.contentType)}</div>
                    {entry.pinned && (
                      <div className="absolute -top-0.5 -right-0.5 w-4.5 h-4.5 bg-purple-500 rounded-full flex items-center justify-center text-[8px] text-white border-2 border-zinc-900 shadow-sm">
                        <div className="w-2 h-2">{Icons.pin}</div>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[14px] font-semibold text-white/90 truncate group-active:text-purple-400 transition-colors">
                        {truncate(entry.content, 60)}
                      </span>
                      <span className="text-[10px] font-medium text-zinc-500 shrink-0 ml-2">
                        {formatTime(entry.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className={`w-1 h-1 rounded-full ${entry.source === 'local' ? 'bg-zinc-600' : 'bg-purple-500'}`} />
                      <span className="text-[11px] font-medium text-zinc-500 truncate">
                        {entry.source === 'local' ? 'This Device' : (entry.deviceName || 'Remote Device')}
                      </span>
                    </div>
                  </div>
                  <div className="text-zinc-700 group-active:text-zinc-400 transition-colors">
                    <div className="w-4 h-4">{Icons.chevron}</div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="pt-10">
              <EmptyState 
                title={searchQuery ? "No matches found" : "No History Yet"}
                description={searchQuery ? "Try adjusting your search terms or filters." : "Copy something on your other devices to see it appear here instantly."}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
