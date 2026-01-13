import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { hostname, type as platformType } from "@tauri-apps/plugin-os";
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
import { getAuthToken, saveAuthToken, removeAuthToken, fetchClipboardHistory } from "./api";

import { AppState, MobileView, LinkedDevice, ClipboardEntry, ContentType } from "./types";
import { ScanningOverlay } from "./components/mobile/ScanningOverlay";
import { useClipboard } from "./hooks/useClipboard";
import { useKeys } from "./hooks/useKeys";
import { usePushNotifications } from "./hooks/usePushNotifications";
import { useWebSocket } from "./hooks/useWebSocket";
import { useLatest } from "./hooks/useLatest";
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
  // ... rest of the App logic ...

  const keys = useKeys();
  const { showToast, showError } = useToast();
  
  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  
  const [view, setViewState] = useState<"login" | "register" | "main" | "onboarding">("onboarding");
  const [mobileView, setMobileView] = useState<MobileView>("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [deviceId, setDeviceId] = useState<string>("unknown");
  const [deviceName, setDeviceName] = useState<string>("This Device");
  
  const [devices, setDevices] = useState<LinkedDevice[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<ContentType | "all">("all");
  const [selectedEntry, setSelectedEntry] = useState<ClipboardEntry | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isMobilePlatform, setIsMobilePlatform] = useState(false);
  const [backgroundModeEnabled, setBackgroundModeEnabled] = useState(() => {
    return localStorage.getItem("echo_background_mode") === "true";
  });

  const [showQR, setShowQR] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [manualKey, setManualKey] = useState("");

  // Lock to prevent infinite loops when we write to clipboard from a remote message
  const isRemoteUpdateRef = useRef(false);
  
  // Track push notification sync state - for cold starts only
  const isSyncingFromPushRef = useRef(false);

  // Refs for accessing current values (avoids stale closures in callbacks)
  const clipboardRef = useLatest(clipboard);
  const connectedRef = useLatest(connected);

  const handleDeviceJoin = useCallback((device: LinkedDevice) => {
      setDevices(prev => {
        const exists = prev.find(d => d.id === device.id);
        if (exists) {
          return prev.map(d => d.id === device.id ? { ...d, lastSeen: Date.now() } : d);
        }
        return [...prev, device];
      });
      
      const isMe = device.id === deviceId || device.isCurrentDevice;
      const isGenericName = device.name === "This Device" || device.name === "Unknown Device";
      if (!isMe && !isGenericName) {
         showToast(`${device.name} joined`, "info");
      }
  }, [deviceId, showToast]);

  // Helper to copy content to OS clipboard with proper locking
  const copyToOsClipboard = useCallback(async (content: string) => {
    try {
      isRemoteUpdateRef.current = true;
      const { emit } = await import("@tauri-apps/api/event");
      await emit("clipboard-remote-write", content);
      await clipboard.copyToClipboard(content);
      // Reset lock after a safety delay
      setTimeout(() => { isRemoteUpdateRef.current = false; }, 1000);
      return true;
    } catch (e) {
      console.error("Failed to copy to OS clipboard:", e);
      isRemoteUpdateRef.current = false;
      return false;
    }
  }, [clipboard]);

  const handleIncomingCopy = useCallback(async (entry: ClipboardEntry, isHistory?: boolean) => {
    // Always add to local history UI
    clipboard.addEntry(entry.content, 'remote', entry.deviceName);

    if (!isHistory) {
      // Live message - always copy to OS clipboard
      await copyToOsClipboard(entry.content);
    } else if (isSyncingFromPushRef.current) {
      // History replay during a push-triggered sync (cold start)
      // Copy the first history item (which is the most recent from server)
      console.log("[App] Cold start sync: copying first history item to clipboard");
      isSyncingFromPushRef.current = false; // Only sync once
      await copyToOsClipboard(entry.content);
    }
    // Normal history replay (not from push) - just add to UI, don't copy
  }, [clipboard, copyToOsClipboard]);

  const handleDeviceLeave = useCallback((id: string) => {
    setDevices(prev => prev.filter(d => d.id !== id || d.isCurrentDevice));
  }, []);

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

  // Keep wsRef synced (useLatest pattern)
  const wsRef = useLatest(ws);

  usePushNotifications({
    token,
    deviceId,
    isConnected: connected,
    onSyncRequest: async () => {
      const isConnected = connectedRef.current;
      console.log("[App] Sync request received from push, connected:", isConnected);
      
      if (isConnected) {
        // WARM START: Already connected, sync from local history
        // The latest remote entry in our history is the newest clipboard from other devices
        const latestRemote = clipboardRef.current.getLatestRemoteEntry();
        if (latestRemote) {
          console.log("[App] Warm start sync: copying latest remote entry to clipboard");
          showToast("Syncing clipboard...", "info");
          isRemoteUpdateRef.current = true;
          try {
            const { emit } = await import("@tauri-apps/api/event");
            await emit("clipboard-remote-write", latestRemote.content);
            await clipboardRef.current.copyToClipboard(latestRemote.content);
            setTimeout(() => { isRemoteUpdateRef.current = false; }, 1000);
            showToast("Clipboard synced!", "success");
          } catch (e) {
            console.error("[App] Warm start sync failed:", e);
            isRemoteUpdateRef.current = false;
          }
        } else {
          console.log("[App] No remote entries in history to sync");
          showToast("No clipboard to sync", "info");
        }
      } else {
        // COLD START: Need to reconnect, the first history item will be synced
        console.log("[App] Cold start sync: setting flag and reconnecting");
        isSyncingFromPushRef.current = true;
        
        // Timeout to reset flag if sync doesn't happen
        setTimeout(() => {
          isSyncingFromPushRef.current = false;
        }, 15000);

        if (token && wsRef.current) {
          showToast("Syncing from notification...", "info");
          wsRef.current.connect();
        } else {
          console.log("[App] Token or ws not ready, sync will happen on auto-connect");
        }
      }
    }
  });

  // Additional refs for polling intervals (avoids stale closures)
  const deviceNameRef = useLatest(deviceName);
  const keysRef = useLatest(keys);

  // Initialize secure token and auth state
  useEffect(() => {
    const initAuth = async () => {
      try {
        const storedToken = await getAuthToken();
        const storedEmail = localStorage.getItem("echo_email");
        const onboardingComplete = localStorage.getItem("echo_onboarding_complete") === "true";
        
        setToken(storedToken);
        setEmail(storedEmail);
        
        if (!onboardingComplete) {
          setViewState("onboarding");
        } else if (storedToken) {
          setViewState("main");
        } else {
          setViewState("login");
        }

        // Sync background mode to Rust
        try {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('set_background_mode', { enabled: backgroundModeEnabled });
        } catch (e) {
          console.error("Failed to sync background mode:", e);
        }
      } catch (error) {
        console.error("Failed to load auth state:", error);
        setViewState("login");
      }
    };
    
    initAuth();
  }, []);

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

        // Detect if we're on a mobile platform (not just small screen)
        const isMobile = platform === 'android' || platform === 'ios';
        setIsMobilePlatform(isMobile);

        let name = "Echo Device";
        if (platform === 'android') {
          name = 'Echo Mobile (Android)';
        } else if (platform === 'ios') {
          name = 'Echo Mobile (iOS)';
        } else {
          try {
            const sysName = await hostname();
            if (sysName && !sysName.includes("localhost") && sysName !== "This Device") {
              name = sysName;
            } else {
               name = platform === 'macos' ? 'Echo Desktop (Mac)' : 
                      platform === 'windows' ? 'Echo Desktop (Windows)' : 
                      platform === 'linux' ? 'Echo Desktop (Linux)' : 'Echo Desktop';
            }
          } catch (e) {
             name = platform === 'macos' ? 'Echo Desktop (Mac)' : 
                    platform === 'windows' ? 'Echo Desktop (Windows)' : 'Echo Desktop';
          }
        }
        
        setDeviceName(name);
        setDevices([{ id, name, lastSeen: Date.now(), isCurrentDevice: true }]);
      } catch (e) {
        console.error("Initialization error:", e);
        if (deviceId === "unknown") {
             const fallbackId = crypto.randomUUID();
             setDeviceId(fallbackId);
             setDevices([{ id: fallbackId, name: "Echo Device", lastSeen: Date.now(), isCurrentDevice: true }]);
        }
      } finally {
        setIsLoading(false);
      }
    };
    init();

    const unlistenFocusRef = { current: undefined as (() => void) | undefined };
    const unlistenResumeRef = { current: undefined as (() => void) | undefined };
    const unlistenClipboardRef = { current: undefined as (() => void) | undefined };
    
    const setupListeners = async () => {
      try {
        const checkClipboard = async () => {
          if (isRemoteUpdateRef.current) return; // Skip check if we just wrote it
          
          const text = await clipboard.readFromClipboard();
          if (text) {
             const wasAdded = clipboard.addEntry(text, 'local', deviceName);
             if (wasAdded && keys.encryptionKey) {
                ws.send(text);
             }
          }
        };

        unlistenFocusRef.current = await listen('tauri://window-focus', () => {
          if (keys.encryptionKey) ws.connect();
          checkClipboard();
        });

        unlistenResumeRef.current = await listen('tauri://resume', () => {
          if (keys.encryptionKey) ws.connect();
          checkClipboard();
        });

        unlistenClipboardRef.current = await listen<string>('clipboard-change', (event) => {
          // Check lock
          if (isRemoteUpdateRef.current) {
            console.log("Ignoring remote update clipboard event");
            return;
          }

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
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.encryptionKey, deviceName]);

  useEffect(() => {
    if (keys.encryptionKey && token) {
      ws.connect();
    } else {
      ws.disconnect();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keys.encryptionKey, token]);

  // Mobile clipboard handling - Native events on Android, adaptive polling on iOS
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    let adjustmentInterval: ReturnType<typeof setInterval> | null = null;
    let nativeClipboardHandler: ((e: Event) => void) | null = null;
    
    const setupMobileClipboard = async () => {
      try {
        const platform = platformType();
        
        if (platform === 'android') {
          // Android: Listen for native clipboard change events from MainActivity.kt
          // PLUS fallback polling since the native listener is unreliable on many devices
          console.log("[Android] Setting up native clipboard listener + fallback polling");
          
          let lastPolledText = '';
          
          nativeClipboardHandler = (e: Event) => {
            const customEvent = e as CustomEvent<string>;
            const content = customEvent.detail;
            
            if (isRemoteUpdateRef.current) {
              console.log("[Android] Ignoring remote update");
              return;
            }
            
            if (content && typeof content === 'string') {
              console.log("[Android] Native clipboard change detected");
              lastPolledText = content; // Update to avoid duplicate from polling
              const wasAdded = clipboardRef.current.addEntry(content, 'local', deviceNameRef.current);
              // Always call ws.send() - it will queue if not connected and send when reconnected
              if (wasAdded && keysRef.current.encryptionKey) {
                wsRef.current.send(content);
                showToast(`Synced: ${content.substring(0, 30)}${content.length > 30 ? '...' : ''}`, 'success');
              }
            }
          };
          
          window.addEventListener('native-clipboard-change', nativeClipboardHandler);
          
          // Fallback polling for unreliable native listener (poll every 1s when visible)
          const pollClipboard = async () => {
            if (!keysRef.current.encryptionKey) return;
            if (document.visibilityState !== 'visible') return;
            
            try {
              const text = await clipboardRef.current.readFromClipboard();
              if (text && text !== lastPolledText && !isRemoteUpdateRef.current) {
                lastPolledText = text;
                console.log("[Android] Polling detected clipboard change");
                const wasAdded = clipboardRef.current.addEntry(text, 'local', deviceNameRef.current);
                if (wasAdded && keysRef.current.encryptionKey) {
                  wsRef.current.send(text);
                  showToast(`Synced: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`, 'success');
                }
              }
            } catch (e) {
              // Ignore read errors
            }
          };
          
          // Poll every 1 second as fallback
          interval = setInterval(pollClipboard, 1000);
          
          // Also check immediately on resume for any missed changes
          const checkOnResume = async () => {
            const text = await clipboardRef.current.readFromClipboard();
            if (text && text !== lastPolledText && !isRemoteUpdateRef.current) {
              lastPolledText = text;
              const wasAdded = clipboardRef.current.addEntry(text, 'local', deviceNameRef.current);
              // Always call ws.send() - it will queue if not connected
              if (wasAdded && keysRef.current.encryptionKey) {
                wsRef.current.send(text);
                showToast(`Synced: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`, 'success');
              }
            }
          };
          
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
              checkOnResume();
            }
          });
          
        } else if (platform === 'ios') {
          // iOS: Adaptive polling (no native clipboard events available)
          console.log("[iOS] Starting adaptive clipboard polling");
          
          let lastChangeTime = Date.now();
          let currentInterval = 500; // Start very fast (500ms)
          
          const poll = async () => {
            if (!keysRef.current.encryptionKey) return;
            
            const text = await clipboardRef.current.readFromClipboard();
            if (text && !isRemoteUpdateRef.current) {
              const wasAdded = clipboardRef.current.addEntry(text, 'local', deviceNameRef.current);
              // Always call ws.send() - it will queue if not connected and send when reconnected
              if (wasAdded && keysRef.current.encryptionKey) {
                lastChangeTime = Date.now();
                currentInterval = 500; // Speed up on activity
                wsRef.current.send(text);
                showToast(`Synced: ${text.substring(0, 30)}${text.length > 30 ? '...' : ''}`, 'success');
              }
            }
            
            // Adaptive slowdown - more aggressive when active
            const idleTime = Date.now() - lastChangeTime;
            if (document.visibilityState === 'hidden') {
              currentInterval = 15000; // Slower when backgrounded (was 30s)
            } else if (idleTime > 120000) {
              currentInterval = 5000; // Medium after 2 min idle (was 10s)
            } else if (idleTime > 30000) {
              currentInterval = 2000; // Faster after 30s idle (was 5s)
            } else {
              currentInterval = 500; // Very fast when active (was 2s)
            }
          };
          
          // Use a single self-scheduling timeout instead of nested intervals
          // This avoids the memory leak from creating new intervals
          let timeoutId: ReturnType<typeof setTimeout> | null = null;
          
          const scheduleNext = () => {
            timeoutId = setTimeout(async () => {
              await poll();
              scheduleNext(); // Schedule next poll with updated interval
            }, currentInterval);
          };
          
          // Store the cleanup function
          interval = setInterval(() => {}, 1); // Dummy to satisfy type
          clearInterval(interval);
          
          scheduleNext();
          
          // Override cleanup to use the timeout
          adjustmentInterval = setInterval(() => {
            // No-op, kept for cleanup compatibility
          }, 86400000);
          
          // Store timeout cleanup in adjustmentInterval's slot
          const originalCleanup = () => {
            if (timeoutId) clearTimeout(timeoutId);
          };
          (window as any).__iosClipboardCleanup = originalCleanup;
        }
      } catch (e) {
        console.error("[Mobile] Clipboard setup failed:", e);
      }
    };

    if (keys.encryptionKey) {
      setupMobileClipboard();
    }
    
    return () => {
      if (interval) {
        console.log("[Mobile] Stopping clipboard polling");
        clearInterval(interval);
      }
      if (adjustmentInterval) {
        console.log("[Mobile] Stopping adjustment interval");
        clearInterval(adjustmentInterval);
      }
      // Clean up iOS timeout-based polling
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

  // Toggle transparency for scanner
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

  const handleAuthSuccess = async (newToken: string, newEmail: string) => {
    try {
      await saveAuthToken(newToken);
      localStorage.setItem("echo_email", newEmail);
      setToken(newToken);
      setEmail(newEmail);
      setViewState("main");
      showToast("Welcome to Echo!", "success");
    } catch (error) {
      console.error("Failed to save auth token:", error);
      showToast("Failed to save login credentials", "error");
    }
  };

  const handleLogout = async () => {
    try {
      await removeAuthToken();
      localStorage.removeItem("echo_email");
      setToken(null);
      setEmail(null);
      setViewState("login");
    } catch (error) {
      console.error("Failed to clear auth token:", error);
      // Still update UI state even if storage fails
      setToken(null);
      setEmail(null);
      setViewState("login");
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      // Reconnect WebSocket to ensure live connection
      ws.connect();
      
      // Fetch history from server
      const serverHistory = await fetchClipboardHistory();
      
      if (Array.isArray(serverHistory) && serverHistory.length > 0) {
        // Decrypt and add any new entries from server
        for (const msg of serverHistory) {
          // Skip messages from this device
          if (msg.device_id === deviceId) continue;
          
          // Skip non-encrypted or system messages
          if (!msg.encrypted || !msg.nonce) continue;
          if (!keys.encryptionKey) continue;
          
          try {
            // Import decrypt function
            const { decrypt } = await import('./crypto');
            const content = decrypt(msg.content, msg.nonce, keys.encryptionKey);
            
            // Add to local history (addEntry will dedupe)
            clipboard.addEntry(content, 'remote', msg.device_name);
          } catch (e) {
            console.warn('[Refresh] Failed to decrypt message:', e);
          }
        }
      }
    } catch (e) {
      console.error('[Refresh] Error:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleManualKeySync = async () => {
    if (!manualKey) return;
    try {
      const key = importKey(manualKey);
      await keys.saveKey(key);
      showToast("Sync key saved!", "success");
      setManualKey("");
      setShowKeyInput(false);
    } catch (e) {
      showToast("Invalid key format", "error");
    }
  };

  const handleScanQR = async () => {
    setMobileView("settings");
    try {
      let permissions = await checkPermissions();
      
      // Request permission if not already granted
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
      
      if (!result || !result.content) {
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
          showToast("Device linked successfully!", "success");
        } else {
          showToast("Invalid QR Code content", "error");
        }
      } else {
        showToast(`Not an Echo QR code`, "error");
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
      setIsScanning(false);
    } catch (e) {
      setIsScanning(false);
    }
  };

  const removeDevice = (id: string) => {
    setDevices(prev => prev.filter(d => d.id !== id));
    showToast("Device unlinked locally", "info");
  };

  const getDeviceIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("phone") || n.includes("android") || n.includes("ios") || n.includes("mobile")) return Icons.phone;
    if (n.includes("mac") || n.includes("win") || n.includes("desktop") || n.includes("laptop")) return Icons.desktop;
    return Icons.devices;
  };

  const derivedState: AppState = useMemo(() => ({
    history: clipboard.history,
    connected,
    searchQuery,
    selectedEntry,
    encryptionKey: keys.encryptionKey,
    keyFingerprint: keys.fingerprint,
    view,
    isRefreshing,
    filterType,
    devices,
    showQR,
    linkUri: keys.encryptionKey ? generateLinkUri(deviceId, keys.encryptionKey, config.wsUrl) : keys.linkUri,
    showDevices,
    showKeyInput,
    manualKey,
    mobileView,
    isLoading,
    email: email || "",
    showClearConfirm
  }), [clipboard.history, connected, searchQuery, selectedEntry, keys.encryptionKey, keys.fingerprint, view, isRefreshing, filterType, devices, showQR, keys.linkUri, showDevices, showKeyInput, manualKey, mobileView, isLoading, showClearConfirm, deviceId, email]);

  const handleOnboardingComplete = () => {
    localStorage.setItem("echo_onboarding_complete", "true");
    setViewState("login");
  };

  // Handle device setup actions
  const handleDeviceSetupImportKey = async (keyString: string) => {
    try {
      const key = importKey(keyString);
      await keys.saveKey(key);
      showToast("Device linked successfully!", "success");
    } catch (e) {
      console.error("Failed to import key:", e);
      showToast("Invalid encryption key", "error");
    }
  };

  const handleDeviceSetupCreateNew = async () => {
    await keys.createNewKey();
    showToast("New encryption key created", "success");
  };

  if (view === "onboarding") return <ErrorBoundary><Onboarding onComplete={handleOnboardingComplete} /></ErrorBoundary>;
  if (view === "login") return <ErrorBoundary><AuthLayout><Login initialEmail={email || ""} onSuccess={handleAuthSuccess} onSwitchToRegister={() => setViewState("register")} /></AuthLayout></ErrorBoundary>;
  if (view === "register") return <ErrorBoundary><AuthLayout><Register initialEmail={email || ""} onSuccess={handleAuthSuccess} onSwitchToLogin={() => setViewState("login")} /></AuthLayout></ErrorBoundary>;
  
  // Show device setup if logged in but no encryption key
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
        {/* Mobile Layout - show for mobile platforms regardless of screen size */}
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

        {/* Desktop Layout - show for desktop platforms */}
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
        isOpen={showQR && !!derivedState.linkUri}
        onClose={() => setShowQR(false)}
        title="Link a device"
        description="Scan this QR code with the Echo mobile app"
        footer={<Button variant="primary" size="md" fullWidth onClick={() => setShowQR(false)}>Done</Button>}
      >
        <div className="flex flex-col items-center gap-5">
          <div className="p-4 bg-white rounded-2xl">
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(derivedState.linkUri || "")}`} 
              alt="QR code for device pairing - scan with Echo mobile app" 
              width={200} 
              height={200} 
            />
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
                {!device.isCurrentDevice && <button onClick={() => removeDevice(device.id)} className="text-(--color-text-secondary) hover:text-red-500 transition-colors">{Icons.trash}</button>}
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
