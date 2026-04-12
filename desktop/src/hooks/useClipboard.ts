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
  const lastSentTimestampRef = useRef<number>(0);
  const { showError } = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        const store = await getStore();
        const saved = await store.get<ClipboardEntry[]>(HISTORY_STORAGE_KEY);
        if (saved && Array.isArray(saved)) {
          setHistory(saved);
          // Do NOT seed lastSentRef from history — it tracks outgoing sends only.
          // Seeding it would block re-syncing the most recent item after restart.
        }
      } catch (e) {
        console.error("Failed to load history", e);
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
      const systemMessages = ["ping", "handshake", "__JOIN__", "__LEAVE__"];
      if (systemMessages.includes(text) || systemMessages.includes(text.trim()))
        return;

      const normalize = (s: string) => s.replace(/\r\n/g, "\n").trim();
      const normalizedText = normalize(text);

      // Deduplicate outgoing sends: only block if the same text was sent within the last 5s.
      const now = Date.now();
      if (
        source === "local" &&
        (text === lastSentRef.current || normalizedText === normalize(lastSentRef.current)) &&
        now - lastSentTimestampRef.current < 5000
      ) {
        return false;
      }

      let wasAdded = false;
      setHistory((prev) => {
        if (prev.some((entry) => normalize(entry.content) === normalizedText)) {
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

        const updated = [newEntry, ...prev].slice(0, 500);
        saveToStore(updated);
        return updated;
      });

      // Update the send dedup ref synchronously so the next clipboard event sees it immediately.
      if (source === "local") {
        lastSentRef.current = text;
        lastSentTimestampRef.current = now;
        wasAdded = true;
      } else {
        // Remote entries always count as "added" so callers can update the OS clipboard.
        wasAdded = true;
      }

      return wasAdded;
    },
    []
  );

  // Called when remote content is written to the OS clipboard so the local
  // poller treats it as already-sent and doesn't echo it back as a new local copy.
  const suppressNextLocalSend = useCallback((text: string) => {
    lastSentRef.current = text;
    lastSentTimestampRef.current = Date.now();
  }, []);

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await writeText(text);
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

  const getLatestRemoteEntry = useCallback((): ClipboardEntry | null => {
    const remoteEntries = history.filter((entry) => entry.source === "remote");
    if (remoteEntries.length === 0) return null;
    return remoteEntries[0];
  }, [history]);

  return useMemo(
    () => ({
      history,
      addEntry,
      suppressNextLocalSend,
      copyToClipboard,
      deleteEntry,
      togglePin,
      clearHistory,
      readFromClipboard,
      getLatestRemoteEntry,
    }),
    [
      history,
      addEntry,
      suppressNextLocalSend,
      copyToClipboard,
      deleteEntry,
      togglePin,
      clearHistory,
      readFromClipboard,
      getLatestRemoteEntry,
    ]
  );
}
