import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { Store } from "@tauri-apps/plugin-store";
import { writeText, readText } from "@tauri-apps/plugin-clipboard-manager";
import { ClipboardEntry } from "../types";
import { detectContentType, useToast } from "../utils";
import { haptic } from "../utils/haptics";

const HISTORY_STORAGE_KEY = "echo_clipboard_history";
let storeInstance: Store | null = null;

const getStore = async () => {
  if (!storeInstance) {
    storeInstance = await Store.load("history.json");
  }
  return storeInstance;
};

export function useClipboard() {
  const [history, setHistory] = useState<ClipboardEntry[]>([]);
  const lastSentRef = useRef<string>("");
  const { showError } = useToast();

  // Load history on mount
  useEffect(() => {
    const init = async () => {
      try {
        const store = await getStore();
        const saved = await store.get<ClipboardEntry[]>(HISTORY_STORAGE_KEY);
        if (saved && Array.isArray(saved)) {
          setHistory(saved);
          if (saved[0]) lastSentRef.current = saved[0].content;
        }
      } catch (e) {
        console.error("Failed to load history", e);
        // Silent failure for init is usually better than a toast loop on startup,
        // but we could log it or show a subtle notification if critical.
        // For now, let's keep it silent or log to a remote service in a real app.
      }
    };
    init();
  }, []);

  const saveToStore = async (newHistory: ClipboardEntry[]) => {
    try {
      const store = await getStore();
      await store.set(HISTORY_STORAGE_KEY, newHistory);
      await store.save();
    } catch (e) {
      console.error("Failed to save history", e);
      showError("Failed to save history locally");
    }
  };

  const addEntry = useCallback(
    (
      text: string,
      source: "local" | "remote" = "local",
      deviceName?: string
    ) => {
      // Reject system messages
      const systemMessages = ["ping", "handshake", "__JOIN__", "__LEAVE__"];
      if (systemMessages.includes(text) || systemMessages.includes(text.trim()))
        return;

      // Hardened check for duplicates (ignore whitespace diffs and line endings)
      const normalize = (s: string) => s.replace(/\r\n/g, "\n").trim();
      const normalizedText = normalize(text);

      // Immediate check against last sent to avoid redundant processing
      if (
        text === lastSentRef.current ||
        normalizedText === normalize(lastSentRef.current)
      ) {
        return false;
      }

      let wasAdded = true;
      setHistory((prev) => {
        // More robust check: is it already in history?
        if (prev.some((entry) => normalize(entry.content) === normalizedText)) {
          wasAdded = false;
          return prev;
        }

        const contentType = detectContentType(text);
        const newEntry: ClipboardEntry = {
          id: crypto.randomUUID(),
          content: text,
          timestamp: Date.now(),
          source,
          deviceName,
          contentType,
        };

        lastSentRef.current = text;
        const updated = [newEntry, ...prev].slice(0, 500);
        saveToStore(updated);
        return updated;
      });

      return wasAdded;
    },
    []
  );

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await writeText(text);
      lastSentRef.current = text;
      haptic.success();
      return true;
    } catch (err) {
      console.error("Failed to copy:", err);
      return false;
    }
  }, []);

  const readFromClipboard = useCallback(async () => {
    try {
      const text = await readText();
      return text;
    } catch (err) {
      console.error("Failed to read clipboard:", err);
      return null;
    }
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setHistory((prev) => {
      const updated = prev.filter((h) => h.id !== id);
      saveToStore(updated);
      return updated;
    });
    haptic.light();
  }, []);

  const togglePin = useCallback((id: string) => {
    setHistory((prev) => {
      const updated = prev.map((h) =>
        h.id === id ? { ...h, pinned: !h.pinned } : h
      );
      saveToStore(updated);
      return updated;
    });
    haptic.selection();
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    saveToStore([]);
    haptic.medium();
  }, []);

  return useMemo(
    () => ({
      history,
      addEntry,
      copyToClipboard,
      deleteEntry,
      togglePin,
      clearHistory,
      readFromClipboard,
    }),
    [
      history,
      addEntry,
      copyToClipboard,
      deleteEntry,
      togglePin,
      clearHistory,
      readFromClipboard,
    ]
  );
}
