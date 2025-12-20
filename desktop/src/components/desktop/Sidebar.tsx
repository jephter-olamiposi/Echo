import React from 'react';
import { Icons } from '../Icons';
import { 
  formatTime, 
  truncate, 
  getContentTypeIcon
} from '../../utils';
import { ClipboardEntry, ContentType } from '../../types';

interface DesktopSidebarProps {
  history: ClipboardEntry[];
  searchQuery: string;
  filterType: ContentType | "all";
  selectedEntryId: string | null;
  onSearchChange: (query: string) => void;
  onFilterChange: (type: ContentType | "all") => void;
  onSelectEntry: (entry: ClipboardEntry) => void;
  onClearHistory: () => void;
  onCopyConstructor: (text: string) => void;
}

export const Sidebar: React.FC<DesktopSidebarProps> = ({
  history,
  searchQuery,
  filterType,
  selectedEntryId,
  onSearchChange,
  onFilterChange,
  onSelectEntry,
  onClearHistory,
  onCopyConstructor
}) => {

  const filteredHistory = history.filter((entry) => {
    const matchesSearch = entry.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || entry.contentType === filterType;
    return matchesSearch && matchesFilter;
  });

  const groupedHistory = filteredHistory.reduce((groups, entry) => {
    const date = new Date(entry.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let key = date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });

    if (date.toDateString() === today.toDateString()) {
      key = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = "Yesterday";
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(entry);
    return groups;
  }, {} as Record<string, ClipboardEntry[]>);

  return (
    <aside className="w-80 h-screen bg-zinc-950 border-r border-white/5 flex flex-col overflow-hidden">
      <div className="p-5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-zinc-100 font-bold text-lg">
          <div className="w-5 h-5 text-purple-500">{Icons.history}</div>
          <span>History</span>
        </div>
        {history.length > 0 && (
          <button
            className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-colors"
            onClick={onClearHistory}
            title="Clear history"
          >
            <div className="w-4 h-4">{Icons.trash}</div>
          </button>
        )}
      </div>

      <div className="px-5 mb-4">
        <div className="relative group">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-purple-500 transition-colors">
            <div className="w-4 h-4">{Icons.search}</div>
          </div>
          <input
            type="text"
            className="w-full bg-zinc-900 border border-white/5 rounded-xl py-2.5 pl-10 pr-10 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
            placeholder="Search clipboard..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-300 transition-colors"
              onClick={() => onSearchChange("")}
            >
              <div className="w-3.5 h-3.5">{Icons.close}</div>
            </button>
          )}
        </div>
      </div>

      <div className="px-5 mb-6 flex gap-1 overflow-x-auto no-scrollbar">
        {(["all", "text", "code", "url"] as const).map((type) => (
          <button
            key={type}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider whitespace-nowrap transition-all ${
              filterType === type 
                ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" 
                : "text-zinc-500 hover:text-zinc-300 bg-transparent border border-transparent"
            }`}
            onClick={() => onFilterChange(type)}
          >
            {type === "all" ? "All" : type}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-2 custom-scrollbar pb-10">
        {Object.keys(groupedHistory).length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-40">
            {searchQuery ? (
              <>
                <p className="text-zinc-300 font-medium mb-1">No results found</p>
                <span className="text-xs text-zinc-500">Try a different search term</span>
              </>
            ) : (
              <>
                <div className="w-12 h-12 text-zinc-500 mb-4">{Icons.clipboard}</div>
                <p className="text-zinc-300 font-medium mb-1">No history</p>
                <span className="text-xs text-zinc-500">Items you copy will appear here</span>
              </>
            )}
          </div>
        ) : (
          Object.entries(groupedHistory).map(([date, entries]) => (
            <div key={date} className="mb-6 last:mb-0">
              <div className="px-3 mb-2 flex items-center gap-2">
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-[2px]">{date}</span>
                <div className="h-px flex-1 bg-zinc-900"></div>
              </div>
              <div className="flex flex-col gap-1">
                {entries.map((entry) => (
                  <button
                    key={entry.id}
                    className={`group flex items-start gap-3 p-3 rounded-xl transition-all relative ${
                      selectedEntryId === entry.id 
                        ? "bg-purple-500/10 border border-purple-500/20 shadow-sm" 
                        : "bg-transparent border border-transparent hover:bg-zinc-900/50"
                    }`}
                    onClick={() => onSelectEntry(entry)}
                  >
                    <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      selectedEntryId === entry.id ? "bg-purple-500/20 text-purple-400" : "bg-zinc-900 text-zinc-500 group-hover:bg-zinc-800"
                    }`}>
                      <div className="w-4 h-4">{getContentTypeIcon(entry.contentType)}</div>
                    </div>
                    <div className="flex-1 min-w-0 pr-6">
                      <p className={`text-sm font-medium leading-normal truncate ${
                        selectedEntryId === entry.id ? "text-purple-300" : "text-zinc-300"
                      }`}>
                        {truncate(entry.content, 60)}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className={`w-1.5 h-1.5 rounded-full ${entry.source === 'local' ? 'bg-green-500/60' : 'bg-blue-500/60'}`}></div>
                        <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">{formatTime(entry.timestamp)}</span>
                      </div>
                    </div>
                    {entry.pinned && (
                      <div className="absolute top-3 right-3 w-4 h-4 text-purple-500/80">
                         {Icons.pin}
                      </div>
                    )}
                    
                    <div 
                      className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-white/10 text-zinc-400 hover:text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        onCopyConstructor(entry.content);
                      }}
                      title="Copy"
                    >
                      <div className="w-3.5 h-3.5">{Icons.copy}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </aside>
  );
};
