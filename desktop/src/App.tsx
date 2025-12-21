import { useState, useEffect, useMemo } from "react";
import { listen } from "@tauri-apps/api/event";
import { hostname } from "@tauri-apps/plugin-os";
import "./App.css"; 
// import "./KeyStyles.css";
// import "./Fingerprint.css";
import { Icons } from "./components/Icons";
import { Toast } from "./components/shared/Toast";
import { Modal } from "./components/shared/Modal";
import { MobileLayout } from "./components/mobile/Layout";
import { Sidebar } from "./components/desktop/Sidebar";
import { Main } from "./components/desktop/Main";
import { Login } from "./components/auth/Login";
import { Register } from "./components/auth/Register";
import { AuthLayout } from "./components/auth/AuthLayout";
import { 
  importKey, 
  exportKey,
  getOrCreateDeviceId,
  generateLinkUri
} from "./crypto";
import { config } from "./config";
import { formatTime } from "./utils";
import { AppState, MobileView, LinkedDevice, ClipboardEntry } from "./types";
import { useClipboard } from "./hooks/useClipboard";
import { useKeys } from "./hooks/useKeys";

import { useWebSocket } from "./hooks/useWebSocket";

// Initial values shifted to state

function App() {
  // --- Hooks ---
  const clipboard = useClipboard();
  const keys = useKeys();
  
  // --- Local UI State ---
  // We keep UI state here that coordinates between Mobile/Desktop or Modals
  const [token, setToken] = useState<string | null>(localStorage.getItem("echo_token"));
  const [email, setEmail] = useState<string | null>(localStorage.getItem("echo_email"));
  const [view, setViewState] = useState<"login" | "register" | "main">(token ? "main" : "login");
  
  const [mobileView, setMobileView] = useState<MobileView>("dashboard");
  const [isLoading, setIsLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [deviceId, setDeviceId] = useState<string>("unknown");
  const [deviceName, setDeviceName] = useState<string>("This Device");
  
  const [devices, setDevices] = useState<LinkedDevice[]>([]);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<ClipboardEntry | null>(null);
  
  // WebSocket Hook
  const showToastMsg = (message: string, type: "success" | "error" | "info" = "info") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleDeviceJoin = (device: LinkedDevice) => {
      setDevices(prev => {
        const exists = prev.find(d => d.id === device.id);
        if (exists) {
          return prev.map(d => d.id === device.id ? { ...d, lastSeen: Date.now() } : d);
        }
        return [...prev, device];
      });
      
      // Suppress toast if it's a zombie session of "me" or generic name
      if (device.name !== deviceName && device.name !== "This Device" && device.name !== "Unknown Device") {
         showToastMsg(`${device.name} joined`, "info");
      }
  };

  const ws = useWebSocket({
    token,
    deviceId,
    deviceName,
    encryptionKey: keys.encryptionKey,
    onConnectionChange: setConnected,
    onIncomingCopy: (entry, isHistory) => {
      clipboard.addEntry(entry.content, 'remote', entry.deviceName);
      // If it's a live sync or the latest history item, update system clipboard
      if (!isHistory) {
        clipboard.copyToClipboard(entry.content);
      }
    },
    onDeviceJoin: handleDeviceJoin,
    onDeviceLeave: (id) => {
      setDevices(prev => prev.filter(d => d.id !== id || d.isCurrentDevice));
    }
  });

  // Modal States
  const [showQR, setShowQR] = useState(false);
  const [showDevices, setShowDevices] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [manualKey, setManualKey] = useState("");
  
  // Removed manual wsRef as we use the ws hook

  // --- Effects ---

  // Initial Loading Simulation & Device Init
  useEffect(() => {
    const init = async () => {
      const id = await getOrCreateDeviceId();
      let name = "This Device";
      
      try {
        const host = await hostname();
        if (host) name = host;
      } catch (e) {
        console.warn("Failed to get hostname", e);
      }

      setDeviceId(id);
      
      // Improve default naming
      if (name === "This Device") {
         try {
           const { type } = await import("@tauri-apps/plugin-os");
           const platform = type();
           name = platform === 'android' ? 'Android Device' : 
                  platform === 'ios' ? 'iPhone' : 
                  platform === 'macos' ? 'Mac' : 
                  platform === 'windows' ? 'Windows' : 'Device';
         } catch (e) {
           // ignore
         }
      }
      setDeviceName(name);
      setDevices([{ id, name, lastSeen: Date.now(), isCurrentDevice: true }]);
      setIsLoading(false);
    };
    init();
  }, []);

  // Sync WebSocket with Clipboard
  useEffect(() => {
    if (keys.encryptionKey) {
      ws.connect();
    } else {
      ws.disconnect();
    }
  }, [keys.encryptionKey, ws]);

  // Clipboard Listener
  useEffect(() => {
    setupClipboardListener();
    
    // Prevent context menu
    if (!import.meta.env.DEV) {
      document.addEventListener('contextmenu', event => event.preventDefault());
    }
  }, []);

  // --- Helper Functions ---

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

  const sendToWebSocket = (text: string) => {
    ws.send(text);
  };

  const setupClipboardListener = async () => {
    // Mobile listener
    const unlisten = await listen("app-resumed", checkClipboard);
    const interval = setInterval(checkClipboard, 1000);
    return () => {
      unlisten();
      clearInterval(interval);
    };
  };

  const checkClipboard = async () => {
    try {
      const { readText } = await import("@tauri-apps/plugin-clipboard-manager");
      const text = await readText();
      if (text) {
        const entry = clipboard.addEntry(text, 'local');
        if (entry) sendToWebSocket(text);
      }
    } catch (err) {
      // ignore
    }
  };

  // Removed duplicate sendToWebSocket

  const handleManualKeySync = async () => {
    try {
      const key = importKey(manualKey);
      await keys.saveKey(key);
      setShowKeyInput(false);
      showToastMsg("Key updated successfully", "success");
    } catch (e) {
      showToastMsg("Invalid key format", "error");
    }
  };

  const handleScanQR = async () => {
    // Logic for QR scanning
    setMobileView("settings");
    try {
       const { scan, Format } = await import("@tauri-apps/plugin-barcode-scanner");
       const result = await scan({ windowed: true, formats: [Format.QRCode] });
       
        if (result.content && result.content.startsWith("echo://")) {
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
           showToastMsg("Invalid QR Code", "error");
        }
    } catch (e) {
       console.error(e);
       showToastMsg("Failed to scan QR", "error");
    }
  };

  const removeDevice = (id: string) => {
    setDevices(prev => prev.filter(d => d.id !== id));
    showToastMsg("Device unlinked locally", "info");
  };

  const getDeviceIcon = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes("phone") || n.includes("android") || n.includes("pixel") || n.includes("galaxy") || n.includes("ios") || n.includes("mobile")) return Icons.phone;
    if (n.includes("mac") || n.includes("win") || n.includes("desktop") || n.includes("laptop") || n.includes("book")) return Icons.desktop;
    return Icons.devices;
  };

  // --- Render ---

  if (view === "login") {
    return (
      <AuthLayout>
        <Login onSuccess={handleAuthSuccess} onSwitchToRegister={() => setViewState("register")} />
      </AuthLayout>
    );
  }

  if (view === "register") {
    return (
      <AuthLayout>
        <Register onSuccess={handleAuthSuccess} onSwitchToLogin={() => setViewState("login")} />
      </AuthLayout>
    );
  }

  // Mobile Actions Bundle - Memoized for senior performance
  const mobileActions = useMemo(() => ({
    onCopy: clipboard.copyToClipboard,
    onDelete: clipboard.deleteEntry,
    onPin: clipboard.togglePin,
    onClearHistory: () => setShowClearConfirm(true),
    onLogout: handleLogout,
    onScanQR: handleScanQR,
    onShowPairingCode: () => setShowQR(true),
    onShowDevices: () => setShowDevices(true),
    onViewChange: setMobileView,
    onSearchChange: setSearchQuery,
    onSelectEntry: setSelectedEntry
  }), [clipboard, handleScanQR]);

  // Derived AppState - Memoized for senior performance
  const derivedState: AppState = useMemo(() => ({
    history: clipboard.history,
    connected,
    searchQuery,
    selectedEntry,
    encryptionKey: keys.encryptionKey,
    keyFingerprint: keys.fingerprint,
    toast,
    view,
    isRefreshing: false,
    filterType: "all",
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
  }), [clipboard.history, connected, searchQuery, selectedEntry, keys.encryptionKey, keys.fingerprint, toast, view, devices, showQR, keys.linkUri, showDevices, showKeyInput, manualKey, mobileView, isLoading, showClearConfirm]);

  return (
    <>
      {/* Mobile-only Layout */}
      <div className="block md:hidden h-dvh w-full">
        <MobileLayout 
          state={derivedState} 
          actions={mobileActions} 
        />
      </div>

      {/* Desktop-only Layout */}
      <div className="hidden md:flex flex-row h-screen w-full overflow-hidden bg-black text-white"> 
        <Sidebar 
          history={clipboard.history}
          searchQuery={searchQuery}
          filterType={"all"}
          selectedEntryId={selectedEntry?.id || null}
          onSearchChange={setSearchQuery}
          onFilterChange={() => {}}
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
           onCopy={clipboard.copyToClipboard}
           onPin={clipboard.togglePin}
           onDelete={(id: string) => {
             clipboard.deleteEntry(id);
             if (selectedEntry?.id === id) setSelectedEntry(null);
           }}
           onLinkDevice={() => setShowQR(true)}
           onEnterKey={() => setShowKeyInput(true)}
           onManageDevices={() => setShowDevices(true)}
        />
      </div>

      {/* Modals - Kept at root level */}
      <Modal
        isOpen={showKeyInput}
        onClose={() => setShowKeyInput(false)}
        title="Enter Sync Key"
        description="Paste the encryption key from your other device."
        footer={
          <>
            <button 
              className="px-4 py-2 text-sm font-bold text-zinc-500 hover:text-white transition-colors" 
              onClick={() => setShowKeyInput(false)}
            >
              Cancel
            </button>
            <button 
              className="px-6 py-2 bg-purple-500 text-white rounded-xl font-bold text-sm hover:bg-purple-400 active:scale-95 transition-all shadow-lg shadow-purple-500/10" 
              onClick={handleManualKeySync}
            >
              Save Key
            </button>
          </>
        }
      >
        <input
          className="w-full p-4 bg-zinc-800/50 rounded-2xl border border-white/5 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all font-mono text-sm"
          placeholder="Paste key here..."
          value={manualKey}
          onChange={(e) => setManualKey(e.target.value)}
        />
      </Modal>

      <Modal
        isOpen={showQR && !!keys.linkUri}
        onClose={() => setShowQR(false)}
        title="Link a Device"
        description="Scan this QR code with the Echo mobile app"
        footer={
          <button 
            className="w-full py-3 bg-purple-500 text-white rounded-2xl font-bold text-sm hover:bg-purple-400 active:scale-95 transition-all" 
            onClick={() => setShowQR(false)}
          >
            Done
          </button>
        }
      >
        <div className="flex flex-col items-center gap-6">
          <div className="p-4 bg-white rounded-4xl shadow-2xl">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(keys.linkUri || "")}`}
              alt="QR Code"
              className="rounded-lg"
              width={200}
              height={200}
            />
          </div>
          <div className="w-full bg-zinc-800/50 p-4 rounded-2xl border border-white/5 flex items-center gap-3">
            <code className="text-xs text-zinc-400 truncate flex-1 block font-mono">
              {keys.encryptionKey ? exportKey(keys.encryptionKey) : ""}
            </code>
            <button 
              className="p-2.5 bg-zinc-700/50 rounded-xl hover:bg-zinc-600 text-white transition-colors"
              onClick={() => {
                if (keys.encryptionKey) {
                   clipboard.copyToClipboard(exportKey(keys.encryptionKey));
                   showToastMsg("Key copied!");
                }
              }}
            >
              <div className="w-4 h-4">{Icons.copy}</div>
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showDevices}
        onClose={() => setShowDevices(false)}
        title="Manage Devices"
        description="Linked devices currently syncing with your clipboard."
        footer={
          <button 
            className="w-full py-3 bg-zinc-800 text-white rounded-2xl font-bold text-sm hover:bg-zinc-700 active:scale-95 transition-all border border-white/5" 
            onClick={() => setShowDevices(false)}
          >
            Done
          </button>
        }
      >
        <div className="flex flex-col gap-3">
          {devices.map((device: LinkedDevice) => (
            <div key={device.id} className="flex items-center justify-between p-4 bg-white/3 rounded-2xl border border-white/5 group hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${device.isCurrentDevice ? 'bg-purple-500/20 text-purple-400' : 'bg-zinc-800 text-zinc-500'}`}>
                  <div className="w-5 h-5">{getDeviceIcon(device.name)}</div>
                </div>
                <div>
                  <p className="text-sm font-bold text-white leading-none">{device.name}</p>
                  <div className="flex items-center gap-2 mt-2">
                     <span className={`w-1.5 h-1.5 rounded-full ${device.isCurrentDevice ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-zinc-600'}`} />
                     <p className="text-[10px] text-zinc-500 uppercase font-black tracking-widest">
                       {device.isCurrentDevice ? "This Device" : `Last seen ${formatTime(device.lastSeen)}`}
                     </p>
                  </div>
                </div>
              </div>
              {!device.isCurrentDevice && (
                <button 
                  className="p-2.5 rounded-xl text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all active:scale-95"
                  onClick={() => removeDevice(device.id)}
                  title="Unlink device"
                >
                  <div className="w-4 h-4">{Icons.trash}</div>
                </button>
              )}
            </div>
          ))}
        </div>
      </Modal>

      {/* Other Modals (Devices, Clear Confirm) omitted/simplified for this refactor to save space, 
          but in production should be present. I will include ClearConfirm. */}
      
      <Modal
         isOpen={showClearConfirm}
         onClose={() => setShowClearConfirm(false)}
         title="Clear History?"
         description="This action cannot be undone."
         footer={
           <div className="flex gap-3 w-full">
             <button 
                className="flex-1 py-3 text-zinc-500 font-bold text-sm hover:text-white transition-colors" 
                onClick={() => setShowClearConfirm(false)}
             >
                Cancel
             </button>
             <button 
                className="flex-1 py-3 bg-red-500 text-white rounded-2xl font-bold text-sm hover:bg-red-400 active:scale-95 transition-all shadow-lg shadow-red-500/10" 
                onClick={() => {
                  clipboard.clearHistory();
                  setShowClearConfirm(false);
                }}
             >
                Clear All
             </button>
           </div>
         }
      >
        <p className="text-sm text-zinc-400 leading-relaxed text-center px-4">
          Are you sure you want to permanently delete all items from your clipboard history?
        </p>
      </Modal>

      {toast && (
        <Toast message={toast.message} type={toast.type} />
      )}
    </>
  );
}

export default App;
