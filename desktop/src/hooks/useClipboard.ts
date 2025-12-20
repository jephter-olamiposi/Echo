import { useState, useCallback, useRef } from "react";
import { ClipboardEntry } from "../types";
import { detectContentType } from "../utils";
import { haptic } from "../utils/haptics";

export function useClipboard() {
  const [history, setHistory] = useState<ClipboardEntry[]>([]);
  const lastSentRef = useRef<string>("");

  const addEntry = useCallback(
    (
      text: string,
      source: "local" | "remote" = "local",
      deviceName?: string
    ) => {
      if (text === lastSentRef.current) return;

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
      setHistory((prev) => [newEntry, ...prev].slice(0, 50));
      return newEntry;
    },
    []
  );

  const copyToClipboard = useCallback(async (text: string) => {
    try {
      // Dynamic import to support both Tauri and non-Tauri envs conceptually (though we strictly use Tauri here)
      const { writeText } = await import(
        "@tauri-apps/plugin-clipboard-manager"
      );
      await writeText(text);
      lastSentRef.current = text;
      haptic.success();
      return true;
    } catch (err) {
      console.error("Failed to copy:", err);
      return false;
    }
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
    haptic.light();
  }, []);

  const togglePin = useCallback((id: string) => {
    setHistory((prev) =>
      prev.map((h) => (h.id === id ? { ...h, pinned: !h.pinned } : h))
    );
    haptic.selection();
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    haptic.medium();
  }, []);

  return {
    history,
    addEntry,
    copyToClipboard,
    deleteEntry,
    togglePin,
    clearHistory,
  };
}
