import React, { useMemo, useState, useRef, useEffect, memo } from 'react';
import { Icons } from '../Icons';
import { MobileHeader } from './Header';
import { 
  formatTime, 
  truncate, 
  getContentTypeIcon
} from '../../utils';
import { ClipboardEntry } from '../../types';
import { EmptyState } from '../ui/EmptyState';
import { Skeleton } from '../ui/Skeleton';
import { usePullToRefresh } from '../../hooks/usePullToRefresh';
import { FilterChip } from '../ui/FilterChip';
import { useLanguage } from '../../contexts/LanguageContext';

// Memoized history item to prevent unnecessary re-renders
interface HistoryItemProps {
  entry: ClipboardEntry;
  onClick: (entry: ClipboardEntry) => void;
}

const HistoryItem = memo<HistoryItemProps>(({ entry, onClick }) => {
  const { t } = useLanguage();
  
  return (
    <button 
      className="group flex items-center gap-3 p-3 w-full text-left bg-(--color-surface-raised) border border-(--color-border) rounded-xl hover:bg-(--color-surface) hover:border-(--color-border-subtle) hover:shadow-md hover:shadow-purple-500/5 active:scale-[0.98] transition-all duration-200 ease-out"
      onClick={() => onClick(entry)}
    >
      {/* Icon */}
      <div className="relative w-10 h-10 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-purple-500/20 to-purple-500/5" />
        <div className="relative w-4 h-4 text-purple-400">{getContentTypeIcon(entry.contentType)}</div>
        {entry.pinned && (
          <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-linear-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg shadow-amber-500/30">
            <div className="w-2 h-2 text-white">{Icons.pin}</div>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0 py-0.5">
        <span className="block text-[14px] font-medium text-(--color-text-primary) line-clamp-1 mb-0.5 group-hover:text-(--color-text-primary) transition-colors">
          {truncate(entry.content, 50)}
        </span>
        
        <div className="flex items-center gap-1.5 text-(--color-text-tertiary)">
          <span className="text-[11px] truncate min-w-0 shrink">
            {entry.source === 'local' ? t('this_device') : (entry.deviceName || 'Synced')}
          </span>
          <span className="text-[10px] opacity-40">•</span>
          <span className="text-[11px] whitespace-nowrap tabular-nums shrink-0">
            {formatTime(entry.timestamp)}
          </span>
        </div>
      </div>
      
      {/* Chevron */}
      <div className="text-(--color-text-tertiary) group-hover:text-(--color-text-secondary) group-hover:translate-x-0.5 transition-all">
        <div className="w-4 h-4">{Icons.chevron}</div>
      </div>
    </button>
  );
}, (prev, next) => prev.entry.id === next.entry.id && prev.entry.pinned === next.entry.pinned);

HistoryItem.displayName = 'HistoryItem';

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
  const { t } = useLanguage();

  const filteredHistory = useMemo(() => history.filter(item => {
    const matchesSearch = item.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || item.contentType === filterType;
    return matchesSearch && matchesFilter;
  }), [history, searchQuery, filterType]);

  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;
  
  const visibleHistory = useMemo(() => {
    return filteredHistory.slice(0, page * ITEMS_PER_PAGE);
  }, [filteredHistory, page]);

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && visibleHistory.length < filteredHistory.length) {
          setPage((prev) => prev + 1);
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [visibleHistory.length, filteredHistory.length]);

  const filterOptions = [
    { type: "all" as const, label: "All" },
    { type: "text" as const, label: "Text" },
    { type: "code" as const, label: "Code" },
    { type: "url" as const, label: "Links" },
  ];

  return (
    <div className="flex flex-col h-full bg-transparent w-full transition-colors duration-300">
      {/* Sticky Header */}
      <div className="shrink-0 z-30 bg-transparent backdrop-blur-2xl border-b border-(--color-border) sticky top-0 transition-colors duration-300">
        <MobileHeader 
          title={t('history')}
          showBack={true}
          onBack={onBack}
          className="bg-transparent! border-none! px-1" 
          rightAction={
            history.length > 0 ? (
              <button
                className="p-3 -mr-1 rounded-full text-red-400/80 hover:text-red-400 hover:bg-red-500/10 active:scale-90 transition-all duration-200"
                onClick={onClearHistory}
                title="Clear history"
              >
                <div className="w-5 h-5">{Icons.trash}</div>
              </button>
            ) : null
          }
        />
        
        {/* Search Input */}
        <div className="px-4 pb-4">
          <div className="relative group">
            <div className="absolute -inset-0.5 rounded-2xl opacity-0 group-focus-within:opacity-100 bg-linear-to-r from-purple-500/40 via-pink-500/40 to-purple-500/40 blur-lg transition-opacity duration-500" />
            <div className="relative">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-(--color-text-tertiary) group-focus-within:text-purple-400 transition-colors duration-300">
                <div className="w-5 h-5">{Icons.search}</div>
              </div>
              <input 
                type="text" 
                className="w-full h-12 bg-(--color-surface) border border-(--color-border) rounded-xl pl-12 pr-12 text-[15px] text-(--color-text-primary) font-medium placeholder-(--color-text-muted) focus:outline-none focus:border-purple-500/50 focus:bg-(--color-surface-raised) transition-all duration-300"
                placeholder={t('search_items')} 
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              {searchQuery && (
                <button 
                  className="absolute inset-y-0 right-3 flex items-center text-(--color-text-tertiary) hover:text-(--color-text-primary) active:scale-90 transition-all"
                  onClick={() => onSearchChange("")}
                >
                  <div className="w-6 h-6 bg-(--color-surface-raised) hover:bg-(--color-border) rounded-full flex items-center justify-center transition-colors">
                    <div className="w-3 h-3">{Icons.close}</div>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Pills - Full Width Grid */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-4 gap-2 w-full">
            {filterOptions.map(({ type, label }) => (
              <FilterChip
                key={type}
                label={label}
                isActive={filterType === type}
                onClick={() => onFilterChange(type)}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div ref={containerRef} className="flex-1 overflow-y-auto custom-scrollbar relative bg-transparent pb-32!">
        {/* Pull to Refresh */}
        <div 
          className="absolute top-0 left-0 right-0 flex justify-center overflow-hidden pointer-events-none z-10" 
          style={{ height: `${pullHeight}px` }}
        >
          <div 
            className={`flex items-center justify-center w-12 h-12 rounded-full bg-(--color-surface-raised) border border-(--color-border) shadow-xl mt-8 transition-all duration-300 ${activeRefreshing ? 'ring-4 ring-purple-500/30' : ''}`}
            style={{ 
              opacity: Math.min(pullHeight / 50, 1),
              transform: activeRefreshing 
                ? 'scale(1.1)' 
                : `translateY(${Math.min(pullHeight * 0.2, 20)}px) rotate(${pullHeight * 3}deg) scale(${Math.min(pullHeight / 60, 1)})`,
            }}
          >
            <div className={`w-6 h-6 text-purple-400 ${activeRefreshing ? 'animate-spin' : ''}`}>
              {Icons.sync}
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {isLoading ? (
            <div className="flex flex-col gap-3">
               {[1, 2, 3, 4, 5].map((i) => (
                 <div key={i} className="flex items-center gap-4 p-4 bg-(--color-surface-raised) rounded-2xl border border-(--color-border)">
                   <Skeleton variant="circular" className="w-12 h-12 shrink-0 rounded-xl!" />
                   <div className="flex-1 min-w-0 flex flex-col gap-2.5">
                      <Skeleton variant="text" className="w-4/5 h-4 rounded!" />
                      <Skeleton variant="text" className="w-2/5 h-3 rounded!" />
                   </div>
                 </div>
               ))}
            </div>
          ) : visibleHistory.length > 0 ? (
            <div className="flex flex-col gap-3">
              {visibleHistory.map((entry) => (
                <HistoryItem key={entry.id} entry={entry} onClick={onItemClick} />
              ))}
              <div ref={loadMoreRef} className="h-4 w-full" />
            </div>
          ) : (
            <div className="pt-20 pb-20">
              <EmptyState 
                title={searchQuery ? t('no_matches_found') : t('no_history')}
                description={searchQuery ? t('adjust_filters') : t('copy_tip')}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
