import React, { memo } from 'react';
import { Icons } from '../Icons';
import {
  formatTime,
  truncate,
  getContentTypeIcon
} from '../../utils';
import { ClipboardEntry, ContentType } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';

interface SidebarItemProps {
  entry: ClipboardEntry;
  isSelected: boolean;
  onSelect: (entry: ClipboardEntry) => void;
  onCopy: (text: string) => void;
}

const SidebarItem = memo<SidebarItemProps>(({ entry, isSelected, onSelect, onCopy }) => (
  <button
    onClick={() => onSelect(entry)}
    className={`group w-full text-left p-3 rounded-2xl transition-all border relative ${isSelected
      ? "bg-white/10 border-white/15 backdrop-blur-xl shadow-lg"
      : "bg-transparent border-transparent hover:bg-white/5"
      }`}
  >
    <div className="flex items-start gap-3">
      <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${isSelected
        ? "bg-purple-500/20 border-purple-500/30 text-purple-400"
        : "bg-white/5 border-white/5 text-(--color-text-secondary) group-hover:text-(--color-text-primary)"
        }`}>
        <div className="w-3.5 h-3.5">{getContentTypeIcon(entry.contentType)}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-[11px] font-medium ${isSelected ? "text-purple-400" : "text-(--color-text-secondary)"
            }`}>
            {entry.contentType.charAt(0).toUpperCase() + entry.contentType.slice(1)}
          </span>
          <div className="flex items-center gap-1.5">
            {entry.pinned && (
              <div className="w-3 h-3 text-purple-400 transform -rotate-45" title="Pinned">
                {Icons.pin}
              </div>
            )}
            <span className="text-[10px] text-(--color-text-tertiary)">{formatTime(entry.timestamp)}</span>
          </div>
        </div>
        <p className={`text-xs line-clamp-2 leading-relaxed transition-colors ${isSelected ? "text-(--color-text-primary)" : "text-(--color-text-muted) group-hover:text-(--color-text-secondary)"
          }`}>
          {truncate(entry.content, 100)}
        </p>
      </div>
    </div>

    <div
      className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-(--color-surface) text-(--color-text-muted) hover:text-(--color-text-primary)"
      onClick={(e) => {
        e.stopPropagation();
        onCopy(entry.content);
      }}
      title="Copy"
    >
      <div className="w-3 h-3">{Icons.copy}</div>
    </div>
  </button>
), (prev, next) =>
  prev.entry.id === next.entry.id &&
  prev.entry.pinned === next.entry.pinned &&
  prev.isSelected === next.isSelected
);

SidebarItem.displayName = 'SidebarItem';

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
  const { theme, setTheme } = useTheme();

  const filteredHistory = React.useMemo(() => history.filter((entry) => {
    const matchesSearch = entry.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === "all" || entry.contentType === filterType;
    return matchesSearch && matchesFilter;
  }), [history, searchQuery, filterType]);

  const entrySections = React.useMemo(() => {
    const sections: { title: string; items: ClipboardEntry[] }[] = [];

    // 1. Separate Pinned items
    const pinnedItems = filteredHistory.filter(item => item.pinned);
    const unpinnedItems = filteredHistory.filter(item => !item.pinned);

    // 2. Add Pinned Section if exists
    if (pinnedItems.length > 0) {
      sections.push({ title: "Pinned", items: pinnedItems });
    }

    // 3. Group remaining items by date
    const dateGroups = unpinnedItems.reduce((groups, entry) => {
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

    // 4. Convert date groups to sections (preserving insertion order from reduce is usually fine for simple date sort, 
    //    but purely relying on object key order can be risky. However, given input is sorted by time, keys are created in order.)
    Object.entries(dateGroups).forEach(([title, items]) => {
      sections.push({ title, items });
    });

    return sections;
  }, [filteredHistory]);

  return (
    <aside className="w-80 h-screen bg-(--color-bg) border-r border-(--color-border) flex flex-col overflow-hidden relative transition-colors duration-300">
      {/* App Branding - Draggable */}
      {/* App Branding - Draggable */}
      {/* App Branding - Draggable */}
      <div className="px-5 py-4 border-b border-(--color-glass-border) bg-(--color-glass-surface) backdrop-blur-3xl z-20" data-tauri-drag-region>
        <div className="flex items-center justify-between" data-tauri-drag-region>
          <div className="flex items-center gap-4" data-tauri-drag-region>
            {/* Traffic Lights */}
            <div className="flex items-center gap-2" data-tauri-drag-region>
              <button onClick={async () => (await import('@tauri-apps/api/window')).getCurrentWindow().close()} className="w-3 h-3 rounded-full bg-[#ff5f57] hover:brightness-110 active:brightness-90 transition-all shadow-inner" aria-label="Close" />
              <button onClick={async () => (await import('@tauri-apps/api/window')).getCurrentWindow().minimize()} className="w-3 h-3 rounded-full bg-[#febc2e] hover:brightness-110 active:brightness-90 transition-all shadow-inner" aria-label="Minimize" />
              <button onClick={async () => {
                const win = (await import('@tauri-apps/api/window')).getCurrentWindow();
                (await win.isMaximized()) ? win.unmaximize() : win.maximize();
              }} className="w-3 h-3 rounded-full bg-[#28c840] hover:brightness-110 active:brightness-90 transition-all shadow-inner" aria-label="Maximize" />
            </div>

            {/* Logo & Brand */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-(--color-glass-border)" data-tauri-drag-region>
              <div className="w-6 h-6 rounded-lg bg-linear-to-br from-purple-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/30 rotate-3">
                <div className="w-3.5 h-3.5 text-white">{Icons.logo || Icons.sync}</div>
              </div>
              <span className="text-[14px] font-bold text-(--color-text-primary) tracking-tight">Echo</span>
            </div>
          </div>

          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-8 h-8 rounded-lg text-(--color-text-secondary) hover:text-(--color-text-primary) hover:bg-(--color-highlight) flex items-center justify-center transition-all active:scale-95 border border-(--color-glass-border)"
            title="Switch theme"
          >
            <div className="w-4 h-4">{theme === 'dark' ? Icons.sun : Icons.moon}</div>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-3 bg-white/2">
        <div className="relative group">
          <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-(--color-text-muted) group-focus-within:text-purple-400 transition-colors">
            <div className="w-3.5 h-3.5">{Icons.search}</div>
          </div>
          <input
            type="text"
            className="w-full bg-(--color-glass-surface) border border-(--color-glass-border) rounded-xl py-2 pl-9 pr-4 text-xs text-(--color-text-primary) placeholder:text-(--color-text-muted) focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/30 transition-all font-medium"
            placeholder="Search history..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          {searchQuery && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-(--color-text-muted) hover:text-(--color-text-primary) transition-colors"
              onClick={() => onSearchChange("")}
            >
              <div className="w-3 h-3">{Icons.close}</div>
            </button>
          )}
        </div>

        <div className="flex gap-1.5 p-1 bg-(--color-bg-subtle) rounded-xl border border-(--color-glass-border)">
          {(["all", "text", "url", "code"] as const).map((type) => {
            const label = type === "all" ? "All" : type === "url" ? "URLs" : type.charAt(0).toUpperCase() + type.slice(1);
            return (
              <button
                key={type}
                onClick={() => onFilterChange(type)}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-bold tracking-tight uppercase transition-all ${filterType === type
                  ? "bg-(--color-glass-surface) text-(--color-text-primary) shadow-sm ring-1 ring-(--color-glass-border)"
                  : "text-(--color-text-tertiary) hover:text-(--color-text-primary)"
                  }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* History List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-4">
        {entrySections.length > 0 ? (
          entrySections.map(({ title, items }) => (
            <div key={title} className="mt-5 first:mt-2">
              <h3 className={`px-3 mb-2 text-[12px] font-medium ${title === "Pinned" ? "text-purple-400" : "text-(--color-text-tertiary)"
                }`}>
                {title === "Pinned" && <span className="inline-block mr-1.5">{Icons.pin}</span>}
                {title}
              </h3>
              <div className="space-y-1">
                {items.map((entry) => (
                  <SidebarItem
                    key={entry.id}
                    entry={entry}
                    isSelected={selectedEntryId === entry.id}
                    onSelect={onSelectEntry}
                    onCopy={onCopyConstructor}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-50">
            <div className="w-10 h-10 text-(--color-text-tertiary) mb-3">{Icons.history}</div>
            <p className="text-[13px] text-(--color-text-secondary)">No items found</p>
          </div>
        )}
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-(--color-border) bg-(--color-surface)/80 backdrop-blur-md">
        <button
          onClick={onClearHistory}
          className="w-full h-10 rounded-xl bg-(--color-surface-raised) border border-(--color-border) text-(--color-text-secondary) hover:text-red-400 hover:bg-red-400/10 hover:border-red-400/20 transition-all text-[13px] font-medium flex items-center justify-center gap-2"
        >
          <div className="w-4 h-4">{Icons.trash}</div>
          Clear history
        </button>
      </div>
    </aside>
  );
};
