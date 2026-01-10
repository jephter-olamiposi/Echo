import { Icons } from "../components/Icons";
import { ContentType } from "../types";

export function detectContentType(content: string): ContentType {
  const trimmed = content.trim();

  if (/^https?:\/\/\S+$/i.test(trimmed)) return "url";

  if (
    /^(import|export|const|let|var|function|class|interface|type|def|fn|pub|async|await)\s/m.test(trimmed) ||
    /[{}\[\]];?\s*$/.test(trimmed) ||
    /<\/?[a-z][\s\S]*>/i.test(trimmed) ||
    /^\s*(if|for|while|switch|try|catch)\s*\(/m.test(trimmed)
  ) {
    return "code";
  }

  return "text";
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - timestamp;

  if (diff < 60000) return "Just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;

  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatFullTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

export function getContentTypeIcon(type: ContentType) {
  switch (type) {
    case "url": return Icons.url;
    case "code": return Icons.code;
    default: return Icons.text;
  }
}

// Export error types for easy access
export * from './AppError';
export { ToastProvider, useToast } from '../contexts/ToastContext';
