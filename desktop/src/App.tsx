import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { hostname, type as platformType } from "@tauri-apps/plugin-os";
import { listen } from "@tauri-apps/api/event";
import { scan, Format, checkPermissions, requestPermissions, cancel as cancelScan } from "@tauri-apps/plugin-barcode-scanner";
import "./App.css"; 
import "./KeyStyles.css";
import "./Fingerprint.css";
import { Icons } from "./components/Icons";
import { Toast } from "./components/shared/Toast";
import { Modal } from "./components/shared/Modal";
import { MobileLayout } from "./components/mobile/Layout";
import { Sidebar } from "./components/desktop/Sidebar";
import { Main } from "./components/desktop/Main";
import { Login } from "./components/auth/Login";
import { Register } from "./components/auth/Register";
import { Onboarding } from "./components/auth/Onboarding";
import { AuthLayout } from "./components/auth/AuthLayout";
import { 
  importKey, 
  exportKey,
  getOrCreateDeviceId,
  generateLinkUri
} from "./crypto";
import { config } from "./config";

import { AppState, MobileView, LinkedDevice, ClipboardEntry, ContentType } from "./types";
import { ScanningOverlay } from "./components/mobile/ScanningOverlay";
import { useClipboard } from "./hooks/useClipboard";
import { useKeys } from "./hooks/useKeys";
import { usePushNotifications } from "./hooks/usePushNotifications";
import { useWebSocket } from "./hooks/useWebSocket";



function App() {
  const clipboard = useClipboard();
  const keys = useKeys();
  
  const [token, setToken] = useState<string | null>(localStorage.getItem("echo_token"));
  const [email, setEmail] = useState<string | null>(localStorage.getItem("echo_email"));
  
  const [view, setViewState] = useState<"login" | "register" | "main" | "onboarding">(() => {
    const onboardingComplete = localStorage.getItem("echo_onboarding_complete") === "true";
    if (!onboardingComplete) return "onboarding";
    return localStorage.getItem("echo_token") ? "main" : "login";
  });
  const [mobileView, setMobileView] = useState<MobileView>("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [deviceId, setDeviceId] = useState<string>("unknown");
  const [deviceName, setDeviceName] = useState<string>("This Device");
  
  const [devices, setDevices] = useState<LinkedDevice[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<ContentType | "all">("all");
  const [selectedEntry, setSelectedEntry] = useState<ClipboardEntry | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [backgroundModeEnabled, setBackgroundModeEnabled] = useState(false);

  const [showQR, setShowQR] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [manualKey, setManualKey] = useState("");

  const showToastMsg = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

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
         showToastMsg(`${device.name} joined`, "info");
      }
  }, [deviceId]);

  const handleIncomingCopy = useCallback((entry: ClipboardEntry, isHistory?: boolean) => {
    clipboard.addEntry(entry.content, 'remote', entry.deviceName);
    if (!isHistory) {
      clipboard.copyToClipboard(entry.content);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    onError: (msg) => showToastMsg(msg, "error"),
  });

  usePushNotifications({
    token,
    deviceId,
    isConnected: connected,
    onSyncRequest: () => ws.connect()
  });

  // Refs for accessing current values in polling interval (avoids stale closures)
  const clipboardRef = useRef(clipboard);
  const wsRef = useRef(ws);
  const deviceNameRef = useRef(deviceName);
  const keysRef = useRef(keys);
  useEffect(() => { clipboardRef.current = clipboard; }, [clipboard]);
  useEffect(() => { wsRef.current = ws; }, [ws]);
  useEffect(() => { deviceNameRef.current = deviceName; }, [deviceName]);
  useEffect(() => { keysRef.current = keys; }, [keys]);

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

  // Mobile clipboard polling (arboard doesn't work on mobile)
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    
    const setupMobilePolling = () => {
      try {
        const platform = platformType();
        const isMobile = platform === 'android' || platform === 'ios';
        
        if (isMobile && keys.encryptionKey) {
          console.log("[Mobile] Starting clipboard polling");
          interval = setInterval(async () => {
            const text = await clipboardRef.current.readFromClipboard();
            if (text) {
              const wasAdded = clipboardRef.current.addEntry(text, 'local', deviceNameRef.current);
              if (wasAdded && keysRef.current.encryptionKey) {
                wsRef.current.send(text);
              }
            }
          }, 2000);
        }
      } catch (e) {
        console.error("[Mobile] Polling setup failed:", e);
      }
    };

    setupMobilePolling();
    
    return () => {
      if (interval) {
        console.log("[Mobile] Stopping clipboard polling");
        clearInterval(interval);
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
      showToastMsg("Session expired. Please sign in again.", "error");
    };

    window.addEventListener('auth-error', handleAuthError);
    return () => window.removeEventListener('auth-error', handleAuthError);
  }, []);

  const handleAuthSuccess = (newToken: string, newEmail: string) => {
    localStorage.setItem("echo_token", newToken);
    localStorage.setItem("echo_email", newEmail);
    setToken(newToken);
    setEmail(newEmail);
    setViewState("main");
    showToastMsg("Welcome to Echo!", "success");
  };

  const handleLogout = () => {
    localStorage.removeItem("echo_token");
    localStorage.removeItem("echo_email");
    setToken(null);
    setEmail(null);
    setViewState("login");
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    ws.connect();
    await new Promise(r => setTimeout(r, 1000));
    setIsRefreshing(false);
  };

  const handleManualKeySync = async () => {
    if (!manualKey) return;
    try {
      const key = importKey(manualKey);
      await keys.saveKey(key);
      showToastMsg("Sync key saved!", "success");
      setManualKey("");
      setShowKeyInput(false);
    } catch (e) {
      showToastMsg("Invalid key format", "error");
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
        showToastMsg("Camera permission denied", "error");
        return;
      }

      setIsScanning(true);
      const result = await scan({ windowed: true, formats: [Format.QRCode] });
      setIsScanning(false);
      
      if (!result || !result.content) {
        showToastMsg("No QR code detected", "info");
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
          showToastMsg("Device linked successfully!", "success");
        } else {
          showToastMsg("Invalid QR Code content", "error");
        }
      } else {
        showToastMsg(`Not an Echo QR code`, "error");
      }
    } catch (e: any) {
      console.error("QR Scanner error:", e);
      setIsScanning(false);
      if (e.message?.includes("permission")) {
        showToastMsg("Camera permission denied", "error");
      } else if (!e.message?.includes("cancel")) {
        showToastMsg(`Scanner error: ${e.message || "Unknown error"}`, "error");
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
    showToastMsg("Device unlinked locally", "info");
  };

  const getDeviceIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("phone") || n.includes("android") || n.includes("ios") || n.includes("mobile")) return Icons.phone;
    if (n.includes("mac") || n.includes("win") || n.includes("desktop") || n.includes("laptop")) return Icons.desktop;
    return Icons.devices;
  };

  const mobileActions = {
    onCopy: clipboard.copyToClipboard,
    onDelete: clipboard.deleteEntry,
    onLogout: handleLogout,
    onScanQR: handleScanQR,
    onRefresh: handleRefresh,
    onShowDevices: () => setShowDevices(true),
    onShowPairingCode: () => setShowQR(true),
    onEnterKey: () => setShowKeyInput(true),
    onViewChange: (v: MobileView) => setMobileView(v),
    onSearchChange: setSearchQuery,
    onFilterChange: setFilterType,
    onSelectEntry: setSelectedEntry,
    onPin: clipboard.togglePin,
    onViewAllHistory: () => setMobileView("history"),
    onClearHistory: () => {
      setShowClearConfirm(true);
    }
  };

  const derivedState: AppState = useMemo(() => ({
    history: clipboard.history,
    connected,
    searchQuery,
    selectedEntry,
    encryptionKey: keys.encryptionKey,
    keyFingerprint: keys.fingerprint,
    toast,
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
  }), [clipboard.history, connected, searchQuery, selectedEntry, keys.encryptionKey, keys.fingerprint, toast, view, isRefreshing, filterType, devices, showQR, keys.linkUri, showDevices, showKeyInput, manualKey, mobileView, isLoading, showClearConfirm, deviceId, email]);

  const handleOnboardingComplete = () => {
    localStorage.setItem("echo_onboarding_complete", "true");
    setViewState("login");
  };

  if (view === "onboarding") return <Onboarding onComplete={handleOnboardingComplete} />;
  if (view === "login") return <AuthLayout><Login onSuccess={handleAuthSuccess} onSwitchToRegister={() => setViewState("register")} /></AuthLayout>;
  if (view === "register") return <AuthLayout><Register onSuccess={handleAuthSuccess} onSwitchToLogin={() => setViewState("login")} /></AuthLayout>;

  return (
    <>
      {isScanning && <ScanningOverlay onCancel={handleCancelScan} />}
      
      <div className={`transition-opacity duration-300 ${isScanning ? 'opacity-0' : 'opacity-100'}`}>
        <div className="block md:hidden h-dvh w-full">
          <MobileLayout state={derivedState} actions={mobileActions} />
        </div>

        <div className="hidden md:flex flex-row h-screen w-full overflow-hidden bg-black text-white"> 
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
      </div>

      <Modal
        isOpen={showKeyInput}
        onClose={() => setShowKeyInput(false)}
        title="Enter Sync Key"
        description="Paste the encryption key from your other device."
        footer={
          <div className="flex gap-3 w-full">
            <button className="flex-1 py-3 text-zinc-500 font-bold text-sm" onClick={() => setShowKeyInput(false)}>Cancel</button>
            <button className="flex-1 py-3 bg-purple-500 text-white rounded-2xl font-bold text-sm" onClick={handleManualKeySync}>Save Key</button>
          </div>
        }
      >
        <input
          className="w-full p-4 bg-zinc-800 rounded-2xl border border-white/5 text-white font-mono text-sm focus:ring-2 focus:ring-purple-500/20 outline-none"
          placeholder="Paste key here..."
          value={manualKey}
          onChange={(e) => setManualKey(e.target.value)}
        />
      </Modal>

      <Modal
        isOpen={showQR && !!derivedState.linkUri}
        onClose={() => setShowQR(false)}
        title="Link a Device"
        description="Scan this QR code with the Echo mobile app"
        footer={<button className="w-full py-3 bg-purple-500 text-white rounded-2xl font-bold text-sm" onClick={() => setShowQR(false)}>Done</button>}
      >
        <div className="flex flex-col items-center gap-6">
          <div className="p-4 bg-white rounded-4xl">
            <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(derivedState.linkUri || "")}`} alt="QR" width={200} height={200} />
          </div>
          <div className="w-full bg-zinc-800 p-3 rounded-2xl border border-white/5 flex items-center gap-2">
            <code className="text-xs text-zinc-400 truncate flex-1 font-mono">{keys.encryptionKey ? exportKey(keys.encryptionKey) : ""}</code>
            <button 
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 shrink-0" 
              onClick={() => {
                if (keys.encryptionKey) {
                  clipboard.copyToClipboard(exportKey(keys.encryptionKey));
                  showToastMsg("Encryption key copied!", "success");
                }
              }}
            >
              <span className="w-4 h-4">{Icons.copy}</span>
              Copy
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDevices}
        onClose={() => setShowDevices(false)}
        title="Manage Devices"
        description="Linked devices currently syncing with your clipboard."
        footer={<button className="w-full py-3 bg-zinc-800 text-white rounded-2xl font-bold text-sm" onClick={() => setShowDevices(false)}>Done</button>}
      >
        <div className="flex flex-col gap-3">
          {devices.map(device => (
            <div key={device.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">{getDeviceIcon(device.name)}</div>
                <div>
                  <p className="text-sm font-bold text-white">{device.name}</p>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-1.5 h-1.5 rounded-full ${device.isCurrentDevice || true ? 'bg-green-500' : 'bg-zinc-600'}`} />
                    <p className="text-[10px] text-zinc-500 uppercase font-medium">
                      {device.isCurrentDevice ? "This Device" : "Online"}
                    </p>
                  </div>
                </div>
              </div>
              {!device.isCurrentDevice && <button onClick={() => removeDevice(device.id)} className="text-zinc-600">{Icons.trash}</button>}
            </div>
          ))}
        </div>
      </Modal>

      <Modal
         isOpen={showClearConfirm}
         onClose={() => setShowClearConfirm(false)}
         title="Clear History?"
         description="This action cannot be undone."
         footer={
           <div className="flex gap-3 w-full">
             <button className="flex-1 py-3 text-zinc-500 font-bold text-sm" onClick={() => setShowClearConfirm(false)}>Cancel</button>
             <button className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-bold text-sm" onClick={() => { clipboard.clearHistory(); setShowClearConfirm(false); }}>Clear All</button>
           </div>
         }
      >
        <p className="text-sm text-zinc-400 text-center">Delete all items from your clipboard history?</p>
      </Modal>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </>
  );
}

export default App;
