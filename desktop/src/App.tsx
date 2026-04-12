import { useState, useEffect, useCallback, useRef } from "react";
import QRCode from "qrcode";
import { getDeviceName } from "./utils/deviceName";
import { type as platformType } from "@tauri-apps/plugin-os";
import { listen } from "@tauri-apps/api/event";
import { scan, Format, checkPermissions, requestPermissions, cancel as cancelScan } from "@tauri-apps/plugin-barcode-scanner";
import "./App.css";

import { Icons } from "./components/Icons";
import { Modal } from "./components/ui/Modal";
import { Button } from "./components/ui/Button";
import { Input } from "./components/ui/Input";
import { MobileLayout } from "./components/mobile";
import { Sidebar } from "./components/desktop/Sidebar";
import { Main } from "./components/desktop/Main";
import { Login } from "./components/auth/Login";
import { Register } from "./components/auth/Register";
import { Onboarding } from "./components/auth/Onboarding";
import { AuthLayout } from "./components/auth/AuthLayout";
import { DeviceSetup } from "./components/auth/DeviceSetup";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import {
  importKey,
  exportKey,
  getOrCreateDeviceId,
  generateLinkUri
} from "./crypto";
import { config } from "./config";
import { fetchClipboardHistory, clearServerHistory } from "./api";

import { MobileView, ContentType } from "./types";
import { ScanningOverlay } from "./components/mobile/ScanningOverlay";
import { useClipboard } from "./hooks/useClipboard";
import { useKeys } from "./hooks/useKeys";
import { usePushNotifications } from "./hooks/usePushNotifications";
import { useWebSocket } from "./hooks/useWebSocket";
import { useLatest } from "./hooks/useLatest";
import { useAuth } from "./hooks/useAuth";
import { useDevices } from "./hooks/useDevices";
import { useToast, ToastProvider } from "./utils";

import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

function AppContent() {
  const clipboard = useClipboard();
  const keys = useKeys();
  const { showToast, showError } = useToast();

  // ── Device identity ─────────────────────────────────────────────────────────
  const [deviceId, setDeviceId] = useState<string>("");
  const [deviceName, setDeviceName] = useState<string>("This Device");
  const [isMobilePlatform, setIsMobilePlatform] = useState(false);

  // ── Auth ────────────────────────────────────────────────────────────────────
  const auth = useAuth(
    () => showToast("Welcome to Echo!", "success"),
    async () => {
      clipboard.clearHistory();
      setDevices([]);
    }
  );
  const { token, email, view, isLoading, setView, handleAuthSuccess, logout, handleOnboardingComplete } = auth;

  // ── Devices ─────────────────────────────────────────────────────────────────
  const { devices, setDevices, handleDeviceJoin, handleDeviceLeave, removeDevice } = useDevices(
    deviceId,
    (name) => showToast(`${name} joined`, "info")
  );

  // ── UI state ─────────────────────────────────────────────────────────────────
  const [mobileView, setMobileView] = useState<MobileView>("dashboard");
  const [connected, setConnected] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<ContentType | "all">("all");
  const [selectedEntry, setSelectedEntry] = useState<ReturnType<typeof useClipboard>["history"][number] | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [backgroundModeEnabled, setBackgroundModeEnabled] = useState(() => {
    return localStorage.getItem("echo_background_mode") === "true";
  });
  const [showQR, setShowQR] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [manualKey, setManualKey] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const isRemoteUpdateRef = useRef(false);
  const remoteUpdateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSyncingFromPushRef = useRef(false);

  const clipboardRef = useLatest(clipboard);
  const connectedRef = useLatest(connected);

  // ── Clipboard sync helpers ───────────────────────────────────────────────────
  const copyToOsClipboard = useCallback(async (content: string) => {
    try {
      // Stamp lastSentRef so iOS/Android pollers treat this content as already-sent
      // and don't echo it back as a new local clipboard event.
      clipboard.suppressNextLocalSend(content);
      isRemoteUpdateRef.current = true;
      const { emit } = await import("@tauri-apps/api/event");
      await emit("clipboard-remote-write", content);
      await clipboard.copyToClipboard(content);
      // Cancel any previous timer before setting a new one — rapid consecutive remote
      // writes would otherwise cause the first timer to clear the flag prematurely.
      if (remoteUpdateTimerRef.current) clearTimeout(remoteUpdateTimerRef.current);
      remoteUpdateTimerRef.current = setTimeout(() => {
        remoteUpdateTimerRef.current = null;
        isRemoteUpdateRef.current = false;
      }, 1000);
      return true;
    } catch (e) {
      console.error("Failed to copy to OS clipboard:", e);
      if (remoteUpdateTimerRef.current) {
        clearTimeout(remoteUpdateTimerRef.current);
        remoteUpdateTimerRef.current = null;
      }
      isRemoteUpdateRef.current = false;
      return false;
    }
  }, [clipboard]);

  const handleIncomingCopy = useCallback(async (entry: ReturnType<typeof useClipboard>["history"][number], isHistory?: boolean) => {
    clipboard.addEntry(entry.content, 'remote', entry.deviceName);

    if (!isHistory) {
      await copyToOsClipboard(entry.content);
    } else if (isSyncingFromPushRef.current) {
      isSyncingFromPushRef.current = false;
      await copyToOsClipboard(entry.content);
    }
  }, [clipboard, copyToOsClipboard]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch {
      // logout handles its own errors; ensure UI state is reset
    }
  }, [logout]);

  // ── WebSocket ────────────────────────────────────────────────────────────────
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
      const isConnected = connectedRef.current;

      if (isConnected) {
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
        setTimeout(() => { isSyncingFromPushRef.current = false; }, 15000);

        if (token && wsRef.current) {
          showToast("Syncing from notification...", "info");
          wsRef.current.connect();
        }
      }
    }
  });

  const deviceNameRef = useLatest(deviceName);
  const keysRef = useLatest(keys);

  // ── Device + platform init ───────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        const id = await getOrCreateDeviceId();
        setDeviceId(id);
        let platform = 'unknown';
        try {
          platform = platformType();
        } catch (e) {
          console.warn("Failed to detect platform:", e);
        }

        const isMobile = platform === 'android' || platform === 'ios';
        setIsMobilePlatform(isMobile);

        const name = await getDeviceName();
        setDeviceName(name);
        // Merge rather than overwrite — peers may already have been added via __JOIN__
        // messages that arrived before this async init completed.
        setDevices(prev => {
          const others = prev.filter(d => d.id !== id && !d.isCurrentDevice);
          return [{ id, name, lastSeen: Date.now(), isCurrentDevice: true }, ...others];
        });
      } catch (e) {
        console.error("Initialization error:", e);
        if (!deviceId) {
          const fallbackId = crypto.randomUUID();
          setDeviceId(fallbackId);
          setDevices(prev => {
            const others = prev.filter(d => d.id !== fallbackId && !d.isCurrentDevice);
            return [{ id: fallbackId, name: "Echo Device", lastSeen: Date.now(), isCurrentDevice: true }, ...others];
          });
        }
      }
    };
    init();

    // Sync persisted background mode to Rust on mount.
    import('@tauri-apps/api/core')
      .then(({ invoke }) => invoke('set_background_mode', { enabled: backgroundModeEnabled }))
      .catch((e) => console.error("Failed to sync background mode:", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Desktop lifecycle listeners (focus, resume, clipboard) ──────────────────
  useEffect(() => {
    const unlistenFocusRef = { current: undefined as (() => void) | undefined };
    const unlistenResumeRef = { current: undefined as (() => void) | undefined };
    const unlistenClipboardRef = { current: undefined as (() => void) | undefined };
    const unlistenClipboardInitRef = { current: undefined as (() => void) | undefined };

    const setupListeners = async () => {
      try {
        const checkClipboard = async () => {
          if (isRemoteUpdateRef.current) return;
          const text = await clipboard.readFromClipboard();
          if (text) {
            const wasAdded = clipboard.addEntry(text, 'local', deviceName);
            if (wasAdded && keys.encryptionKey) {
              ws.send(text);
            }
          }
        };

        unlistenFocusRef.current = await listen('tauri://window-focus', () => {
          if (keys.encryptionKey && !connectedRef.current) ws.connect();
          checkClipboard();
        });

        unlistenResumeRef.current = await listen('tauri://resume', () => {
          if (keys.encryptionKey && !connectedRef.current) ws.connect();
          checkClipboard();
        });

        unlistenClipboardRef.current = await listen<string>('clipboard-change', (event) => {
          if (isRemoteUpdateRef.current) return;
          const content = event.payload;
          if (content && typeof content === 'string') {
            const wasAdded = clipboard.addEntry(content, 'local', deviceName);
            if (wasAdded && keys.encryptionKey) {
              ws.send(content);
            }
          }
        });

        unlistenClipboardInitRef.current = await listen<string>('clipboard-init', (event) => {
          const content = event.payload;
          if (content && typeof content === 'string') {
            const wasAdded = clipboard.addEntry(content, 'local', deviceName);
            if (wasAdded && keys.encryptionKey) {
              ws.send(content);
            }
          }
        });
      } catch (e) {
        console.error("Failed to setup lifecycle listeners", e);
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

  // ── QR code — generated locally so the key never leaves the device ──────────
  useEffect(() => {
    const linkUri = keys.encryptionKey
      ? generateLinkUri(deviceId, keys.encryptionKey, config.wsUrl)
      : null;
    if (!linkUri) { setQrDataUrl(null); return; }
    QRCode.toDataURL(linkUri, { width: 200, margin: 1 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [keys.encryptionKey, deviceId]);

  // ── Connect/disconnect WebSocket when auth or key state changes ──────────────
  useEffect(() => {
    if (keys.encryptionKey && token && deviceId) {
      // Clear remote devices before connecting. The backend re-sends __JOIN__ 
      // for every currently-online peer on handshake, so we start fresh.
      setDevices(prev => prev.filter(d => d.isCurrentDevice));
      ws.connect();
    } else {
      ws.disconnect();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.encryptionKey, token, deviceId]);


  // ── Mobile clipboard polling ─────────────────────────────────────────────────
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let adjustmentInterval: ReturnType<typeof setInterval> | null = null;
    let nativeClipboardHandler: ((e: Event) => void) | null = null;

    const setupMobileClipboard = async () => {
      try {
        const platform = platformType();

        if (platform === 'android') {
          let lastPolledText = '';

          nativeClipboardHandler = (e: Event) => {
            const customEvent = e as CustomEvent<string>;
            const content = customEvent.detail;
            if (isRemoteUpdateRef.current) return;
            if (content && typeof content === 'string') {
              lastPolledText = content;
              const wasAdded = clipboardRef.current.addEntry(content, 'local', deviceNameRef.current);
              if (wasAdded && keysRef.current.encryptionKey) {
                wsRef.current.send(content);
                showToast(`Synced: ${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`, 'success');
              }
            }
          };

          window.addEventListener('native-clipboard-change', nativeClipboardHandler);

          const pollClipboard = async () => {
            if (!keysRef.current.encryptionKey) return;
            if (document.visibilityState !== 'visible') return;
            try {
              const text = await clipboardRef.current.readFromClipboard();
              if (text && text !== lastPolledText) {
                // Always update lastPolledText, even for remote writes.
                // If we skip without updating, the next poll after isRemoteUpdateRef
                // clears will see text !== lastPolledText and echo the remote content.
                lastPolledText = text;
                if (isRemoteUpdateRef.current) return;
                const wasAdded = clipboardRef.current.addEntry(text, 'local', deviceNameRef.current);
                if (wasAdded && keysRef.current.encryptionKey) {
                  wsRef.current.send(text);
                  showToast(`Synced: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`, 'success');
                }
              }
            } catch {
              // Ignore clipboard read errors
            }
          };

          interval = setInterval(pollClipboard, 1000);

          document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState === 'visible') {
              const text = await clipboardRef.current.readFromClipboard();
              if (text && text !== lastPolledText) {
                lastPolledText = text;
                if (isRemoteUpdateRef.current) return;
                const wasAdded = clipboardRef.current.addEntry(text, 'local', deviceNameRef.current);
                if (wasAdded && keysRef.current.encryptionKey) {
                  wsRef.current.send(text);
                  showToast(`Synced: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`, 'success');
                }
              }
            }
          });

        } else if (platform === 'ios') {
          let lastChangeTime = Date.now();
          let currentInterval = 500;

          const poll = async () => {
            if (!keysRef.current.encryptionKey) return;
            const text = await clipboardRef.current.readFromClipboard();
            if (text && !isRemoteUpdateRef.current) {
              const wasAdded = clipboardRef.current.addEntry(text, 'local', deviceNameRef.current);
              if (wasAdded && keysRef.current.encryptionKey) {
                lastChangeTime = Date.now();
                currentInterval = 500;
                wsRef.current.send(text);
                showToast(`Synced: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`, 'success');
              }
            }

            const idleTime = Date.now() - lastChangeTime;
            if (document.visibilityState === 'hidden') {
              currentInterval = 15000;
            } else if (idleTime > 120000) {
              currentInterval = 5000;
            } else if (idleTime > 30000) {
              currentInterval = 2000;
            } else {
              currentInterval = 500;
            }
          };

          let timeoutId: ReturnType<typeof setTimeout> | null = null;
          const scheduleNext = () => {
            timeoutId = setTimeout(async () => {
              await poll();
              scheduleNext();
            }, currentInterval);
          };

          scheduleNext();
          adjustmentInterval = setInterval(() => {}, 86400000);
          (window as any).__iosClipboardCleanup = () => { if (timeoutId) clearTimeout(timeoutId); };
        }
      } catch (e) {
        console.error("[Mobile] Clipboard setup failed:", e);
      }
    };

    if (keys.encryptionKey) {
      setupMobileClipboard();
    }

    return () => {
      if (interval) clearInterval(interval);
      if (adjustmentInterval) clearInterval(adjustmentInterval);
      if ((window as any).__iosClipboardCleanup) {
        (window as any).__iosClipboardCleanup();
        delete (window as any).__iosClipboardCleanup;
      }
      if (nativeClipboardHandler) {
        window.removeEventListener('native-clipboard-change', nativeClipboardHandler);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.encryptionKey]);

  useEffect(() => {
    if (isScanning) {
      document.body.classList.add('scan-active');
    } else {
      document.body.classList.remove('scan-active');
    }
    return () => document.body.classList.remove('scan-active');
  }, [isScanning]);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      document.addEventListener('contextmenu', event => event.preventDefault());
    }
    const handleAuthError = () => {
      handleLogout();
      showToast("Session expired. Please sign in again.", "error");
    };
    window.addEventListener('auth-error', handleAuthError);
    return () => window.removeEventListener('auth-error', handleAuthError);
  }, []);

  // ── Action handlers ─────────────────────────────────────────────────────────
  const handleManualKeySync = async () => {
    if (!manualKey) return;
    try {
      const key = importKey(manualKey);
      await keys.saveKey(key);
      // Old server history was encrypted with the previous key — purge it so
      // the history replay doesn't fail decryption on every reconnect.
      clearServerHistory().catch(() => {});
      clipboard.clearHistory();
      showToast("Sync key saved!", "success");
      setManualKey("");
      setShowKeyInput(false);
    } catch {
      showToast("Invalid key format", "error");
    }
  };

  const handleScanQR = async () => {
    setMobileView("settings");
    try {
      let permissions = await checkPermissions();
      if (permissions !== 'granted') {
        permissions = await requestPermissions();
      }
      if (permissions !== 'granted') {
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
          } catch (e) {
            console.error("Failed to parse QR params", e);
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
    } catch (e: any) {
      console.error("QR Scanner error:", e);
      setIsScanning(false);
      if (e.message?.includes("permission")) {
        showToast("Camera permission denied", "error");
      } else if (!e.message?.includes("cancel")) {
        showToast(`Scanner error: ${e.message || "Unknown error"}`, "error");
      }
    }
  };

  const handleCancelScan = async () => {
    try {
      await cancelScan();
    } finally {
      setIsScanning(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      ws.reconnect();
      await new Promise(resolve => setTimeout(resolve, 1000));
      const serverHistory = await fetchClipboardHistory();

      if (Array.isArray(serverHistory) && serverHistory.length > 0) {
        for (const msg of serverHistory) {
          if (msg.device_id === deviceId) continue;
          if (!msg.encrypted || !msg.nonce || !keys.encryptionKey) continue;
          try {
            const { decrypt } = await import('./crypto');
            const content = decrypt(msg.content, msg.nonce, keys.encryptionKey);
            clipboard.addEntry(content, 'remote', msg.device_name);
          } catch (e) {
            console.warn('[Refresh] Failed to decrypt message:', e);
          }
        }
      }
    } catch {
      showError('Failed to refresh. Please check your connection.');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDeviceSetupImportKey = async (keyString: string) => {
    try {
      const key = importKey(keyString);
      await keys.saveKey(key);
      clearServerHistory().catch(() => {});
      clipboard.clearHistory();
      showToast("Device linked successfully!", "success");
    } catch {
      showToast("Invalid encryption key", "error");
    }
  };

  const handleDeviceSetupCreateNew = async () => {
    await keys.createNewKey();
    clearServerHistory().catch(() => {});
    clipboard.clearHistory();
    setDevices([]);
    ws.reconnect();
    showToast("Started fresh with new encryption key", "success");
  };

  const getDeviceIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("phone") || n.includes("android") || n.includes("ios") || n.includes("mobile")) return Icons.phone;
    if (n.includes("mac") || n.includes("win") || n.includes("desktop") || n.includes("laptop")) return Icons.desktop;
    return Icons.devices;
  };


  // ── Routing ─────────────────────────────────────────────────────────────────
  if (view === "onboarding") return <ErrorBoundary><Onboarding onComplete={handleOnboardingComplete} /></ErrorBoundary>;
  if (view === "login") return <ErrorBoundary><AuthLayout><Login initialEmail={email || ""} onSuccess={handleAuthSuccess} onSwitchToRegister={() => setView("register")} /></AuthLayout></ErrorBoundary>;
  if (view === "register") return <ErrorBoundary><AuthLayout><Register initialEmail={email || ""} onSuccess={handleAuthSuccess} onSwitchToLogin={() => setView("login")} /></AuthLayout></ErrorBoundary>;

  if (view === "main" && keys.needsKeySetup) {
    return (
      <ErrorBoundary>
        {isScanning && <ScanningOverlay onCancel={handleCancelScan} />}
        {!isScanning && (
          <AuthLayout>
            <DeviceSetup
              onScanQR={handleScanQR}
              onImportKey={handleDeviceSetupImportKey}
              onCreateNew={handleDeviceSetupCreateNew}
              onLogout={handleLogout}
              isScanning={isScanning}
            />
          </AuthLayout>
        )}
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      {isScanning && <ScanningOverlay onCancel={handleCancelScan} />}

      <div className={`transition-opacity duration-300 ${isScanning ? 'opacity-0' : 'opacity-100'}`}>
        {isMobilePlatform && (
          <div className="h-dvh w-full">
            <MobileLayout
              history={clipboard.history}
              devices={devices}
              mobileView={mobileView}
              filterType={filterType}
              searchQuery={searchQuery}
              selectedEntry={selectedEntry}
              connected={connected}
              isLoading={isLoading}
              isRefreshing={isRefreshing}
              email={email || ""}
              syncing={!connected && ws.queuedCount > 0}
              queuedCount={ws.queuedCount}
              onCopy={clipboard.copyToClipboard}
              onDelete={clipboard.deleteEntry}
              onClearHistory={() => setShowClearConfirm(true)}
              onLogout={handleLogout}
              onScanQR={handleScanQR}
              onEnterKey={() => setShowKeyInput(true)}
              onShowPairingCode={() => setShowQR(true)}
              onShowDevices={() => setShowDevices(true)}
              onViewChange={setMobileView}
              onSearchChange={setSearchQuery}
              onFilterChange={setFilterType}
              onSelectEntry={setSelectedEntry}
              onPin={clipboard.togglePin}
              onRefresh={handleRefresh}
            />
          </div>
        )}

        {!isMobilePlatform && (
          <div className="flex flex-row h-screen w-full overflow-hidden bg-(--color-bg) text-(--color-text-primary)">
            <Sidebar
              history={clipboard.history}
              searchQuery={searchQuery}
              filterType={filterType}
              selectedEntryId={selectedEntry?.id || null}
              onSearchChange={setSearchQuery}
              onFilterChange={setFilterType}
              onSelectEntry={setSelectedEntry}
              onClearHistory={() => setShowClearConfirm(true)}
              onCopyConstructor={clipboard.copyToClipboard}
            />

            <Main
              selectedEntry={selectedEntry}
              connected={connected}
              devices={devices}
              historyCount={clipboard.history.length}
              keyFingerprint={keys.fingerprint}
              backgroundModeEnabled={backgroundModeEnabled}
              onCopy={clipboard.copyToClipboard}
              onPin={clipboard.togglePin}
              onDelete={(id: string) => {
                clipboard.deleteEntry(id);
                if (selectedEntry?.id === id) setSelectedEntry(null);
              }}
              onLinkDevice={() => setShowQR(true)}
              onEnterKey={() => setShowKeyInput(true)}
              onManageDevices={() => setShowDevices(true)}
              onToggleBackgroundMode={async () => {
                const newValue = !backgroundModeEnabled;
                setBackgroundModeEnabled(newValue);
                localStorage.setItem("echo_background_mode", String(newValue));
                try {
                  const { invoke } = await import('@tauri-apps/api/core');
                  await invoke('set_background_mode', { enabled: newValue });
                } catch (e) {
                  console.error('Failed to set background mode:', e);
                }
              }}
              onLogout={handleLogout}
              onBack={() => setSelectedEntry(null)}
            />
          </div>
        )}
      </div>

      <Modal
        isOpen={showKeyInput}
        onClose={() => setShowKeyInput(false)}
        title="Enter sync key"
        description="Paste the encryption key from your other device."
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="ghost" size="md" className="flex-1" onClick={() => setShowKeyInput(false)}>Cancel</Button>
            <Button variant="primary" size="md" className="flex-1" onClick={handleManualKeySync}>Save</Button>
          </div>
        }
      >
        <Input
          placeholder="Paste key here..."
          value={manualKey}
          onChange={(e) => setManualKey(e.target.value)}
          className="font-mono"
        />
      </Modal>

      <Modal
        isOpen={showQR && !!keys.encryptionKey}
        onClose={() => setShowQR(false)}
        title="Link a device"
        description="Scan this QR code with the Echo mobile app"
        footer={<Button variant="primary" size="md" fullWidth onClick={() => setShowQR(false)}>Done</Button>}
      >
        <div className="flex flex-col items-center gap-5">
          <div className="p-4 bg-white rounded-2xl">
            {qrDataUrl
              ? <img src={qrDataUrl} alt="QR code for device pairing - scan with Echo mobile app" width={200} height={200} />
              : <div className="w-[200px] h-[200px] flex items-center justify-center text-gray-400 text-sm">Generating…</div>
            }
          </div>
          <div className="w-full bg-(--color-surface-raised) p-3 rounded-xl border border-(--color-border) flex items-center gap-2">
            <code className="text-[12px] text-(--color-text-tertiary) truncate flex-1 font-mono">{keys.encryptionKey ? exportKey(keys.encryptionKey) : ""}</code>
            <Button
              variant="primary"
              size="sm"
              icon={Icons.copy}
              onClick={() => {
                if (keys.encryptionKey) {
                  clipboard.copyToClipboard(exportKey(keys.encryptionKey));
                  showToast("Encryption key copied!", "success");
                }
              }}
            >
              Copy
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDevices}
        onClose={() => setShowDevices(false)}
        title="Linked devices"
        description="Devices currently syncing with your clipboard."
        footer={<Button variant="secondary" size="md" fullWidth onClick={() => setShowDevices(false)}>Done</Button>}
      >
        <div className="flex flex-col gap-3">
          {devices.map(device => (
            <div key={device.id} className="flex items-center justify-between p-4 bg-(--color-surface-raised) rounded-2xl border border-(--color-border)">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">{getDeviceIcon(device.name)}</div>
                <div>
                  <p className="text-[15px] font-medium text-(--color-text-primary)">{device.name}</p>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${device.isCurrentDevice ? 'bg-green-500' : 'bg-(--color-text-tertiary)'}`} />
                    <p className="text-[12px] text-(--color-text-tertiary)">
                      {device.isCurrentDevice ? "This device" : "Online"}
                    </p>
                  </div>
                </div>
              </div>
              {!device.isCurrentDevice && (
                <button onClick={() => removeDevice(device.id)} className="text-(--color-text-secondary) hover:text-red-500 transition-colors">
                  {Icons.trash}
                </button>
              )}
            </div>
          ))}
        </div>
      </Modal>

      <Modal
        isOpen={showClearConfirm}
        onClose={() => setShowClearConfirm(false)}
        title="Clear history?"
        description="This action cannot be undone."
        footer={
          <div className="flex gap-3 w-full">
            <Button variant="ghost" size="md" className="flex-1" onClick={() => setShowClearConfirm(false)}>Cancel</Button>
            <Button variant="danger" size="md" className="flex-1" onClick={() => { clipboard.clearHistory(); setShowClearConfirm(false); }}>Clear history</Button>
          </div>
        }
      >
        <p className="text-[14px] text-(--color-text-secondary) text-center">Delete all items from your clipboard history?</p>
      </Modal>

    </ErrorBoundary>
  );
}

export default App;
