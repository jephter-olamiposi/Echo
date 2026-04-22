import { useState, useEffect, useCallback, useRef } from "react";
import QRCode from "qrcode";
import { type as platformType } from "@tauri-apps/plugin-os";
import { emit, listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import {
  scan,
  Format,
  checkPermissions,
  requestPermissions,
  cancel as cancelScan,
} from "@tauri-apps/plugin-barcode-scanner";
import { getDeviceName } from "../utils/deviceName";
import {
  decrypt,
  importKey,
  getOrCreateDeviceId,
  generateLinkUri,
} from "../crypto";
import { config } from "../config";
import { fetchClipboardHistory, clearServerHistory } from "../api";
import { MobileView, ContentType } from "../types";
import { useClipboard } from "./useClipboard";
import { useKeys } from "./useKeys";
import { usePushNotifications } from "./usePushNotifications";
import { useWebSocket } from "./useWebSocket";
import { useLatest } from "./useLatest";
import { useAuth } from "./useAuth";
import { useDevices } from "./useDevices";
import { useToast } from "../utils";
import { Icons } from "../components/Icons";

type HistoryEntry = ReturnType<typeof useClipboard>["history"][number];

export function useEchoController() {
  const clipboard = useClipboard();
  const keys = useKeys();
  const { showToast, showError } = useToast();

  const [deviceId, setDeviceId] = useState<string>("");
  const [deviceName, setDeviceName] = useState<string>("This Device");
  const [isMobilePlatform, setIsMobilePlatform] = useState(false);

  const auth = useAuth(
    () => showToast("Welcome to Echo!", "success"),
    async () => {
      clipboard.clearHistory();
      setDevices([]);
    }
  );
  const {
    token,
    email,
    view,
    isLoading,
    setView,
    handleAuthSuccess,
    logout,
    handleOnboardingComplete,
  } = auth;

  const { devices, setDevices, handleDeviceJoin, handleDeviceLeave, removeDevice } =
    useDevices(deviceId, (name) => showToast(`${name} joined`, "info"));

  const [mobileView, setMobileView] = useState<MobileView>("dashboard");
  const [connected, setConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<ContentType | "all">("all");
  const [selectedEntry, setSelectedEntry] = useState<HistoryEntry | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [backgroundModeEnabled, setBackgroundModeEnabled] = useState(
    () => localStorage.getItem("echo_background_mode") === "true"
  );
  const [showQR, setShowQR] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [manualKey, setManualKey] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const isRemoteUpdateRef = useRef(false);
  const remoteUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const iosPollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pushSyncResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const isSyncingFromPushRef = useRef(false);

  const clipboardRef = useLatest(clipboard);
  const connectedRef = useLatest(connected);

  const copyToOsClipboard = useCallback(
    async (content: string) => {
      try {
        clipboard.suppressNextLocalSend(content);
        isRemoteUpdateRef.current = true;
        await emit("clipboard-remote-write", content);
        await clipboard.copyToClipboard(content);
        if (remoteUpdateTimerRef.current) clearTimeout(remoteUpdateTimerRef.current);
        remoteUpdateTimerRef.current = setTimeout(() => {
          remoteUpdateTimerRef.current = null;
          isRemoteUpdateRef.current = false;
        }, 1000);
        return true;
      } catch (error) {
        console.error("Failed to copy to OS clipboard:", error);
        if (remoteUpdateTimerRef.current) {
          clearTimeout(remoteUpdateTimerRef.current);
          remoteUpdateTimerRef.current = null;
        }
        isRemoteUpdateRef.current = false;
        return false;
      }
    },
    [clipboard]
  );

  const handleIncomingCopy = useCallback(
    async (entry: HistoryEntry, isHistory?: boolean) => {
      clipboard.addEntry(entry.content, "remote", entry.deviceName);

      if (!isHistory) {
        await copyToOsClipboard(entry.content);
      } else if (isSyncingFromPushRef.current) {
        isSyncingFromPushRef.current = false;
        await copyToOsClipboard(entry.content);
      }
    },
    [clipboard, copyToOsClipboard]
  );

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch {
    }
  }, [logout]);

  const ws = useWebSocket({
    token,
    deviceId,
    deviceName,
    encryptionKey: keys.encryptionKey,
    onConnectionChange: setConnected,
    onIncomingCopy: handleIncomingCopy,
    onDeviceJoin: handleDeviceJoin,
    onDeviceLeave: handleDeviceLeave,
    onError: (msg) => showError(msg),
  });

  const wsRef = useLatest(ws);

  usePushNotifications({
    token,
    deviceId,
    isConnected: connected,
    onSyncRequest: async () => {
      if (connectedRef.current) {
        const latestRemote = clipboardRef.current.getLatestRemoteEntry();
        if (latestRemote) {
          showToast("Syncing clipboard...", "info");
          const success = await copyToOsClipboard(latestRemote.content);
          if (success) showToast("Clipboard synced!", "success");
        } else {
          showToast("No clipboard to sync", "info");
        }
      } else {
        isSyncingFromPushRef.current = true;
        if (pushSyncResetTimerRef.current) {
          clearTimeout(pushSyncResetTimerRef.current);
        }
        pushSyncResetTimerRef.current = setTimeout(() => {
          pushSyncResetTimerRef.current = null;
          isSyncingFromPushRef.current = false;
        }, 15000);

        if (token && wsRef.current) {
          showToast("Syncing from notification...", "info");
          wsRef.current.connect();
        }
      }
    },
  });

  const deviceNameRef = useLatest(deviceName);
  const keysRef = useLatest(keys);

  useEffect(() => {
    return () => {
      if (remoteUpdateTimerRef.current) {
        clearTimeout(remoteUpdateTimerRef.current);
        remoteUpdateTimerRef.current = null;
      }
      if (pushSyncResetTimerRef.current) {
        clearTimeout(pushSyncResetTimerRef.current);
        pushSyncResetTimerRef.current = null;
      }
      if (iosPollTimeoutRef.current) {
        clearTimeout(iosPollTimeoutRef.current);
        iosPollTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const id = await getOrCreateDeviceId();
        setDeviceId(id);
        let platform = "unknown";
        try {
          platform = platformType();
        } catch (error) {
          console.warn("Failed to detect platform:", error);
        }

        const isMobile = platform === "android" || platform === "ios";
        setIsMobilePlatform(isMobile);

        const name = await getDeviceName();
        setDeviceName(name);
        setDevices((prev) => {
          const others = prev.filter((d) => d.id !== id && !d.isCurrentDevice);
          return [
            { id, name, lastSeen: Date.now(), isCurrentDevice: true },
            ...others,
          ];
        });
      } catch (error) {
        console.error("Initialization error:", error);
        if (!deviceId) {
          const fallbackId = crypto.randomUUID();
          setDeviceId(fallbackId);
          setDevices((prev) => {
            const others = prev.filter(
              (d) => d.id !== fallbackId && !d.isCurrentDevice
            );
            return [
              {
                id: fallbackId,
                name: "Echo Device",
                lastSeen: Date.now(),
                isCurrentDevice: true,
              },
              ...others,
            ];
          });
        }
      }
    };
    init();

    invoke("set_background_mode", { enabled: backgroundModeEnabled }).catch(
      (error) => console.error("Failed to sync background mode:", error)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const unlistenFocusRef = { current: undefined as (() => void) | undefined };
    const unlistenResumeRef = {
      current: undefined as (() => void) | undefined,
    };
    const unlistenClipboardRef = {
      current: undefined as (() => void) | undefined,
    };
    const unlistenClipboardInitRef = {
      current: undefined as (() => void) | undefined,
    };

    const setupListeners = async () => {
      try {
        const checkClipboard = async () => {
          if (isRemoteUpdateRef.current) return;
          const text = await clipboard.readFromClipboard();
          if (text) {
            const wasAdded = clipboard.addEntry(text, "local", deviceName);
            if (wasAdded && keys.encryptionKey) {
              ws.send(text);
            }
          }
        };

        unlistenFocusRef.current = await listen("tauri://window-focus", () => {
          if (keys.encryptionKey && !connectedRef.current) ws.connect();
          checkClipboard();
        });

        unlistenResumeRef.current = await listen("tauri://resume", () => {
          if (keys.encryptionKey && !connectedRef.current) ws.connect();
          checkClipboard();
        });

        unlistenClipboardRef.current = await listen<string>(
          "clipboard-change",
          (event) => {
            if (isRemoteUpdateRef.current) return;
            const content = event.payload;
            if (content && typeof content === "string") {
              const wasAdded = clipboard.addEntry(content, "local", deviceName);
              if (wasAdded && keys.encryptionKey) {
                ws.send(content);
              }
            }
          }
        );

        unlistenClipboardInitRef.current = await listen<string>(
          "clipboard-init",
          (event) => {
            const content = event.payload;
            if (content && typeof content === "string") {
              const wasAdded = clipboard.addEntry(content, "local", deviceName);
              if (wasAdded && keys.encryptionKey) {
                ws.send(content);
              }
            }
          }
        );
      } catch (error) {
        console.error("Failed to setup lifecycle listeners", error);
      }
    };

    setupListeners();

    return () => {
      unlistenFocusRef.current?.();
      unlistenResumeRef.current?.();
      unlistenClipboardRef.current?.();
      unlistenClipboardInitRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.encryptionKey, deviceName]);

  useEffect(() => {
    const linkUri = keys.encryptionKey
      ? generateLinkUri(deviceId, keys.encryptionKey, config.wsUrl)
      : null;
    if (!linkUri) {
      setQrDataUrl(null);
      return;
    }
    QRCode.toDataURL(linkUri, { width: 200, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [keys.encryptionKey, deviceId]);

  useEffect(() => {
    if (keys.encryptionKey && token && deviceId) {
      setDevices((prev) => prev.filter((d) => d.isCurrentDevice));
      ws.connect();
    } else {
      ws.disconnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.encryptionKey, token, deviceId]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let nativeClipboardHandler: ((e: Event) => void) | null = null;
    let visibilityChangeHandler: (() => void) | null = null;

    const setupMobileClipboard = async () => {
      try {
        const platform = platformType();

        if (platform === "android") {
          let lastPolledText = "";

          nativeClipboardHandler = (e: Event) => {
            const customEvent = e as CustomEvent<string>;
            const content = customEvent.detail;
            if (isRemoteUpdateRef.current) return;
            if (content && typeof content === "string") {
              lastPolledText = content;
              const wasAdded = clipboardRef.current.addEntry(
                content,
                "local",
                deviceNameRef.current
              );
              if (wasAdded && keysRef.current.encryptionKey) {
                wsRef.current.send(content);
                showToast(
                  `Synced: ${content.substring(0, 30)}${
                    content.length > 30 ? "..." : ""
                  }`,
                  "success"
                );
              }
            }
          };

          window.addEventListener(
            "native-clipboard-change",
            nativeClipboardHandler
          );

          const pollClipboard = async () => {
            if (!keysRef.current.encryptionKey) return;
            if (document.visibilityState !== "visible") return;
            try {
              const text = await clipboardRef.current.readFromClipboard();
              if (text && text !== lastPolledText) {
                lastPolledText = text;
                if (isRemoteUpdateRef.current) return;
                const wasAdded = clipboardRef.current.addEntry(
                  text,
                  "local",
                  deviceNameRef.current
                );
                if (wasAdded && keysRef.current.encryptionKey) {
                  wsRef.current.send(text);
                  showToast(
                    `Synced: ${text.substring(0, 30)}${
                      text.length > 30 ? "..." : ""
                    }`,
                    "success"
                  );
                }
              }
            } catch {
            }
          };

          interval = setInterval(pollClipboard, 1000);

          visibilityChangeHandler = () => {
            void (async () => {
              if (document.visibilityState === "visible") {
                const text = await clipboardRef.current.readFromClipboard();
                if (text && text !== lastPolledText) {
                  lastPolledText = text;
                  if (isRemoteUpdateRef.current) return;
                  const wasAdded = clipboardRef.current.addEntry(
                    text,
                    "local",
                    deviceNameRef.current
                  );
                  if (wasAdded && keysRef.current.encryptionKey) {
                    wsRef.current.send(text);
                    showToast(
                      `Synced: ${text.substring(0, 30)}${
                        text.length > 30 ? "..." : ""
                      }`,
                      "success"
                    );
                  }
                }
              }
            })();
          };

          document.addEventListener(
            "visibilitychange",
            visibilityChangeHandler
          );
        } else if (platform === "ios") {
          let lastChangeTime = Date.now();
          let currentInterval = 500;

          const poll = async () => {
            if (!keysRef.current.encryptionKey) return;
            const text = await clipboardRef.current.readFromClipboard();
            if (text && !isRemoteUpdateRef.current) {
              const wasAdded = clipboardRef.current.addEntry(
                text,
                "local",
                deviceNameRef.current
              );
              if (wasAdded && keysRef.current.encryptionKey) {
                lastChangeTime = Date.now();
                currentInterval = 500;
                wsRef.current.send(text);
                showToast(
                  `Synced: ${text.substring(0, 30)}${
                    text.length > 30 ? "..." : ""
                  }`,
                  "success"
                );
              }
            }

            const idleTime = Date.now() - lastChangeTime;
            if (document.visibilityState === "hidden") {
              currentInterval = 15000;
            } else if (idleTime > 120000) {
              currentInterval = 5000;
            } else if (idleTime > 30000) {
              currentInterval = 2000;
            } else {
              currentInterval = 500;
            }
          };

          const scheduleNext = () => {
            iosPollTimeoutRef.current = setTimeout(async () => {
              await poll();
              scheduleNext();
            }, currentInterval);
          };

          scheduleNext();
        }
      } catch (error) {
        console.error("[Mobile] Clipboard setup failed:", error);
      }
    };

    if (keys.encryptionKey) {
      setupMobileClipboard();
    }

    return () => {
      if (interval) clearInterval(interval);
      if (iosPollTimeoutRef.current) {
        clearTimeout(iosPollTimeoutRef.current);
        iosPollTimeoutRef.current = null;
      }
      if (nativeClipboardHandler) {
        window.removeEventListener(
          "native-clipboard-change",
          nativeClipboardHandler
        );
      }
      if (visibilityChangeHandler) {
        document.removeEventListener(
          "visibilitychange",
          visibilityChangeHandler
        );
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.encryptionKey]);

  useEffect(() => {
    if (isScanning) {
      document.body.classList.add("scan-active");
    } else {
      document.body.classList.remove("scan-active");
    }
    return () => document.body.classList.remove("scan-active");
  }, [isScanning]);

  useEffect(() => {
    const disableContextMenu = (event: MouseEvent) => event.preventDefault();
    if (!import.meta.env.DEV) {
      document.addEventListener("contextmenu", disableContextMenu);
    }
    const handleAuthError = () => {
      handleLogout();
      showToast("Session expired. Please sign in again.", "error");
    };
    window.addEventListener("auth-error", handleAuthError);
    return () => {
      if (!import.meta.env.DEV) {
        document.removeEventListener("contextmenu", disableContextMenu);
      }
      window.removeEventListener("auth-error", handleAuthError);
    };
  }, [handleLogout, showToast]);

  const handleManualKeySync = useCallback(async () => {
    if (!manualKey) return;
    try {
      const key = importKey(manualKey);
      await keys.saveKey(key);
      clearServerHistory().catch(() => {});
      clipboard.clearHistory();
      showToast("Sync key saved!", "success");
      setManualKey("");
      setShowKeyInput(false);
    } catch {
      showToast("Invalid key format", "error");
    }
  }, [manualKey, keys, clipboard, showToast]);

  const handleScanQR = useCallback(async () => {
    setMobileView("settings");
    try {
      let permissions = await checkPermissions();
      if (permissions !== "granted") {
        permissions = await requestPermissions();
      }
      if (permissions !== "granted") {
        showToast("Camera permission denied", "error");
        return;
      }

      setIsScanning(true);
      const result = await scan({ windowed: true, formats: [Format.QRCode] });
      setIsScanning(false);

      if (!result?.content) {
        showToast("No QR code detected", "info");
        return;
      }

      if (result.content.startsWith("echo://")) {
        const uri = result.content;
        let keyBase64 = "";
        if (uri.startsWith("echo://connect?")) {
          try {
            const params = new URLSearchParams(uri.split("?")[1]);
            keyBase64 = params.get("key") || "";
          } catch (error) {
            console.error("Failed to parse QR params", error);
          }
        } else {
          keyBase64 = uri.replace("echo://", "");
        }

        if (keyBase64) {
          const key = importKey(keyBase64);
          await keys.saveKey(key);
          clearServerHistory().catch(() => {});
          clipboard.clearHistory();
          showToast("Device linked successfully!", "success");
        } else {
          showToast("Invalid QR Code content", "error");
        }
      } else {
        showToast("Not an Echo QR code", "error");
      }
    } catch (error: any) {
      console.error("QR Scanner error:", error);
      setIsScanning(false);
      if (error.message?.includes("permission")) {
        showToast("Camera permission denied", "error");
      } else if (!error.message?.includes("cancel")) {
        showToast(`Scanner error: ${error.message || "Unknown error"}`, "error");
      }
    }
  }, [keys, clipboard, showToast]);

  const handleCancelScan = useCallback(async () => {
    try {
      await cancelScan();
    } finally {
      setIsScanning(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      ws.reconnect();
      const serverHistory = await fetchClipboardHistory();

      if (Array.isArray(serverHistory) && serverHistory.length > 0) {
        for (const msg of [...serverHistory].reverse()) {
          if (msg.device_id === deviceId) continue;
          if (!msg.nonce || !keys.encryptionKey) continue;
          try {
            const content = decrypt(msg.content, msg.nonce, keys.encryptionKey);
            clipboard.addEntry(content, "remote", msg.device_name);
          } catch (error) {
            console.warn("[Refresh] Failed to decrypt message:", error);
          }
        }
      }
    } catch {
      showError("Failed to refresh. Please check your connection.");
    } finally {
      setIsRefreshing(false);
    }
  }, [ws, deviceId, keys.encryptionKey, clipboard, showError]);

  const handleDeviceSetupImportKey = useCallback(
    async (keyString: string) => {
      try {
        const key = importKey(keyString);
        await keys.saveKey(key);
        clearServerHistory().catch(() => {});
        clipboard.clearHistory();
        showToast("Device linked successfully!", "success");
      } catch {
        showToast("Invalid encryption key", "error");
      }
    },
    [keys, clipboard, showToast]
  );

  const handleDeviceSetupCreateNew = useCallback(async () => {
    await keys.createNewKey();
    clearServerHistory().catch(() => {});
    clipboard.clearHistory();
    setDevices([]);
    ws.reconnect();
    showToast("Started fresh with new encryption key", "success");
  }, [keys, clipboard, setDevices, ws, showToast]);

  const handleClearHistoryConfirm = useCallback(async () => {
    setShowClearConfirm(false);
    clipboard.clearHistory();

    try {
      await clearServerHistory();
    } catch {
      showError("Failed to clear server history.");
    }
  }, [clipboard, showError]);

  const toggleBackgroundMode = useCallback(async () => {
    const newValue = !backgroundModeEnabled;
    setBackgroundModeEnabled(newValue);
    localStorage.setItem("echo_background_mode", String(newValue));
    try {
      await invoke("set_background_mode", { enabled: newValue });
    } catch (error) {
      console.error("Failed to set background mode:", error);
    }
  }, [backgroundModeEnabled]);

  const getDeviceIcon = useCallback((name: string) => {
    const normalized = name.toLowerCase();
    if (
      normalized.includes("phone") ||
      normalized.includes("android") ||
      normalized.includes("ios") ||
      normalized.includes("mobile")
    ) {
      return Icons.phone;
    }
    if (
      normalized.includes("mac") ||
      normalized.includes("win") ||
      normalized.includes("desktop") ||
      normalized.includes("laptop")
    ) {
      return Icons.desktop;
    }
    return Icons.devices;
  }, []);

  return {
    clipboard,
    keys,
    ws,
    auth: {
      token,
      email,
      view,
      isLoading,
      setView,
      handleAuthSuccess,
      handleOnboardingComplete,
      handleLogout,
    },
    device: {
      deviceId,
      deviceName,
      isMobilePlatform,
      connected,
      devices,
      removeDevice,
      getDeviceIcon,
    },
    ui: {
      mobileView,
      setMobileView,
      searchQuery,
      setSearchQuery,
      filterType,
      setFilterType,
      selectedEntry,
      setSelectedEntry,
      isRefreshing,
      isScanning,
      backgroundModeEnabled,
      showQR,
      setShowQR,
      showDevices,
      setShowDevices,
      showKeyInput,
      setShowKeyInput,
      showClearConfirm,
      setShowClearConfirm,
      manualKey,
      setManualKey,
      qrDataUrl,
    },
    actions: {
      handleManualKeySync,
      handleScanQR,
      handleCancelScan,
      handleRefresh,
      handleDeviceSetupImportKey,
      handleDeviceSetupCreateNew,
      handleClearHistoryConfirm,
      toggleBackgroundMode,
    },
  };
}
