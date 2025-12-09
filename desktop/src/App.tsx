import { fetch } from "@tauri-apps/plugin-http";
import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { config, saveToken, loadToken, clearToken } from "./config";
import {
  generateSecretKey,
  encrypt,
  decrypt,
  saveEncryptionKey,
  loadEncryptionKey,
  generateLinkUri,
  getKeyFingerprint,
  getOrCreateDeviceId,
  exportKey,
  importKey,
} from "./crypto";
import "./App.css";
import "./KeyStyles.css";
import "./Fingerprint.css";

const { apiUrl: API_URL, wsUrl: WS_URL } = config;

const Icons = {
  logo: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h6" />
    </svg>
  ),
  clipboard: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  ),
  copy: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
  phone: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
      <path d="M12 18h.01" />
    </svg>
  ),
  desktop: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  ),
  sync: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  ),
  search: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  ),
  link: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  ),
  devices: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="4" y="4" width="16" height="12" rx="2" />
      <rect x="9" y="18" width="6" height="4" rx="1" />
      <path d="M2 8h2M20 8h2M2 12h2M20 12h2" />
    </svg>
  ),
  pin: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l2.5 8.5L22 12l-7.5 1.5L12 22l-2.5-8.5L2 12l7.5-1.5L12 2z" />
    </svg>
  ),
  text: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M4 7V4h16v3M9 20h6M12 4v16" />
    </svg>
  ),
  code: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  ),
  url: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

type View = "login" | "register" | "home";
type ContentType = "text" | "code" | "url" | "other";

interface Toast {
  message: string;
  type: "success" | "error";
}

interface ClipboardEntry {
  id: string;
  content: string;
  timestamp: number;
  source: "local" | "remote";
  deviceName?: string;
  pinned?: boolean;
  contentType: ContentType;
}

interface LinkedDevice {
  id: string;
  name: string;
  lastSeen: number;
  isCurrentDevice: boolean;
}

interface AppState {
  view: View;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  loading: boolean;
  toast: Toast | null;
  connected: boolean;
  encryptionKey: Uint8Array | null;
  keyFingerprint: string | null;
  showQR: boolean;
  showDevices: boolean;
  showKeyInput: boolean;
  manualKey: string;
  linkUri: string | null;
  history: ClipboardEntry[];
  searchQuery: string;
  selectedEntry: ClipboardEntry | null;
  devices: LinkedDevice[];
  filterType: ContentType | "all";
}

const initialState: AppState = {
  view: "login",
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  loading: false,
  toast: null,
  connected: false,
  encryptionKey: null,
  keyFingerprint: null,
  showQR: false,
  showDevices: false,
  showKeyInput: false,
  manualKey: "",
  linkUri: null,
  history: [],
  searchQuery: "",
  selectedEntry: null,
  devices: [],
  filterType: "all",
};

const MAX_HISTORY = 200;

function detectContentType(content: string): ContentType {
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

function formatTime(timestamp: number): string {
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

function formatFullTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + "…";
}

function getContentTypeIcon(type: ContentType) {
  switch (type) {
    case "url": return Icons.url;
    case "code": return Icons.code;
    default: return Icons.text;
  }
}

export default function App() {
  const [state, setState] = useState<AppState>(initialState);
  const wsRef = useRef<WebSocket | null>(null);
  const deviceIdRef = useRef<string>("");
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const update = useCallback(
    <K extends keyof AppState>(key: K, value: AppState[K]) =>
      setState((prev) => ({ ...prev, [key]: value })),
    []
  );

  const showToast = useCallback(
    (message: string, type: Toast["type"] = "success") => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      update("toast", { message, type });
      toastTimeoutRef.current = setTimeout(() => update("toast", null), 3000);
    },
    [update]
  );

  const addToHistory = useCallback(
    (content: string, source: "local" | "remote", deviceName?: string) => {
      setState((prev) => {
        if (prev.history[0]?.content === content) return prev;

        const entry: ClipboardEntry = {
          id: crypto.randomUUID(),
          content,
          timestamp: Date.now(),
          source,
          deviceName,
          contentType: detectContentType(content),
          pinned: false,
        };

        const newHistory = [entry, ...prev.history].slice(0, MAX_HISTORY);
        return { ...prev, history: newHistory };
      });
    },
    []
  );

  const copyToClipboard = useCallback(
    async (text: string) => {
      try {
        await invoke("set_clipboard", { text });
        showToast("Copied to clipboard");
      } catch {
        showToast("Failed to copy", "error");
      }
    },
    [showToast]
  );

  const togglePin = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      history: prev.history.map((e) =>
        e.id === id ? { ...e, pinned: !e.pinned } : e
      ),
    }));
  }, []);

  const deleteFromHistory = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      history: prev.history.filter((e) => e.id !== id),
      selectedEntry: prev.selectedEntry?.id === id ? null : prev.selectedEntry,
    }));
  }, []);

  const clearHistory = useCallback(() => {
    setState((prev) => ({
      ...prev,
      history: prev.history.filter((e) => e.pinned),
      selectedEntry: null,
    }));
    showToast("History cleared (pinned items kept)");
  }, [showToast]);

  const initEncryption = useCallback(async () => {
    let key = await loadEncryptionKey();
    if (!key) {
      key = generateSecretKey();
      await saveEncryptionKey(key);
    }
    update("encryptionKey", key);
    update("keyFingerprint", await getKeyFingerprint(key));
  }, [update]);

  const sendClipboard = useCallback(
    (text: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
      if (!deviceIdRef.current) return;

      let payload;
      const timestamp = Date.now();

      if (state.encryptionKey) {
        const { ciphertext, nonce } = encrypt(text, state.encryptionKey);
        payload = {
          device_id: deviceIdRef.current,
          content: ciphertext, // Store ciphertext in content field
          nonce: nonce,
          encrypted: true,
          timestamp: timestamp
        };
      } else {
        payload = {
          device_id: deviceIdRef.current,
          content: text,
          encrypted: false,
          timestamp: timestamp
        };
      }

      wsRef.current.send(JSON.stringify(payload));
    },
    [state.encryptionKey]
  );

  const connectWebSocket = useCallback(
    (token: string) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) return;

      const socket = new WebSocket(`${WS_URL}/ws?token=${token}`);

      socket.onopen = () => {
        update("connected", true);
        reconnectAttemptsRef.current = 0;
        
        // Send handshake to establish device_id
        if (deviceIdRef.current) {
          socket.send(JSON.stringify({
            device_id: deviceIdRef.current,
            content: "handshake",
            timestamp: Date.now()
          }));
        }

        setState((prev) => ({
          ...prev,
          devices: [
            {
              id: deviceIdRef.current,
              name: "This Device",
              lastSeen: Date.now(),
              isCurrentDevice: true,
            },
            ...prev.devices.filter((d) => !d.isCurrentDevice),
          ],
        }));
        heartbeatRef.current = setInterval(() => {
          if (socket.readyState === WebSocket.OPEN) socket.send("ping");
        }, 30000);
      };

      socket.onmessage = async (event) => {
        if (event.data === "pong") return;
        try {
          const msg = JSON.parse(event.data);
          
          if (msg.device_id === deviceIdRef.current) {
            return;
          }

          // Handle presence updates
          if (msg.content === "__PRESENCE__") {
            setState((prev) => {
              if (prev.devices.some((d) => d.id === msg.device_id)) return prev;
              return {
                ...prev,
                devices: [
                  ...prev.devices,
                  {
                    id: msg.device_id,
                    name: "Remote Device",
                    lastSeen: Date.now(),
                    isCurrentDevice: false,
                  },
                ],
              };
            });
            return;
          }
          
          let text;
          if (msg.nonce) {
             // Message is encrypted
             if (!state.encryptionKey) {
                console.warn("Received encrypted message but no key is set.");
                showToast("Received encrypted message but no key set", "error");
                return;
             }
             
             try {
                // Backend sends ciphertext in the 'content' field
                text = decrypt(msg.content, msg.nonce, state.encryptionKey);
             } catch (e) {
                console.error("Decryption failed:", e);
                showToast("Decryption failed: Keys might not match", "error");
                return;
             }
          } else {
             // Message is plain text
             text = msg.content;
          }

          if (!text) {
             return;
          }

          await invoke("set_clipboard", { text });
          addToHistory(text, "remote", msg.device_name || "Remote Device");
        } catch (e) {
          console.error("Error processing message:", e);
        }
      };

      socket.onclose = () => {
        update("connected", false);
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        
        // Auto-reconnect with exponential backoff
        const attempts = reconnectAttemptsRef.current;
        const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
        reconnectAttemptsRef.current = attempts + 1;

        console.log(`WebSocket closed. Reconnecting in ${delay}ms (Attempt ${attempts + 1})`);

        setTimeout(() => {
          const currentToken = loadToken();
          if (currentToken && state.view === "home") {
            connectWebSocket(currentToken);
          }
        }, delay);
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      wsRef.current = socket;
    },
    [update, addToHistory]
  );

  useEffect(() => {
    const init = async () => {
      deviceIdRef.current = await getOrCreateDeviceId();
      const token = loadToken();
      if (token) {
        await initEncryption();
        update("view", "home");
        connectWebSocket(token);
      }
    };
    init();

    return () => {
      wsRef.current?.close();
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (state.view !== "home") return;

    const unlisten = listen<string>("clipboard-change", (event) => {
      const text = event.payload;
      if (text) {
        addToHistory(text, "local", "This Device");
        sendClipboard(text);
      }
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [state.view, sendClipboard, addToHistory]);

  const authRequest = async (endpoint: string, body: object) => {
    update("loading", true);
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request failed");
      return data;
    } finally {
      update("loading", false);
    }
  };

  const handleLogin = async () => {
    try {
      const { token } = await authRequest("/login", {
        email: state.email,
        password: state.password,
      });
      saveToken(token);
      await initEncryption();
      setState((prev) => ({ ...prev, view: "home", email: "", password: "" }));
      connectWebSocket(token);
      showToast("Welcome back!");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Login failed", "error");
    }
  };

  const handleRegister = async () => {
    try {
      await authRequest("/register", {
        email: state.email,
        password: state.password,
        first_name: state.firstName,
        last_name: state.lastName,
      });
      showToast("Account created! Please sign in.");
      setState((prev) => ({ ...prev, view: "login", firstName: "", lastName: "" }));
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Registration failed", "error");
    }
  };

  const handleLogout = () => {
    wsRef.current?.close();
    clearToken();
    setState({ ...initialState });
    showToast("Signed out");
  };

  const handleShowQR = () => {
    if (!state.encryptionKey) return;
    const uri = generateLinkUri(deviceIdRef.current, state.encryptionKey, WS_URL);
    setState((prev) => ({ ...prev, showQR: true, linkUri: uri }));
  };

  const handleManualKeySync = async () => {
    try {
      if (!state.manualKey) return;
      const key = importKey(state.manualKey);
      await saveEncryptionKey(key);
      update("encryptionKey", key);
      update("keyFingerprint", await getKeyFingerprint(key));
      update("showKeyInput", false);
      update("manualKey", "");
      showToast("Encryption key updated successfully");
    } catch {
      showToast("Invalid key format", "error");
    }
  };

  const filteredHistory = state.history
    .filter((e) => {
      if (state.filterType !== "all" && e.contentType !== state.filterType) return false;
      if (state.searchQuery) {
        return e.content.toLowerCase().includes(state.searchQuery.toLowerCase());
      }
      return true;
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return b.timestamp - a.timestamp;
    });

  const groupedHistory = filteredHistory.reduce((groups, entry) => {
    const date = new Date(entry.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let key: string;
    if (date.toDateString() === today.toDateString()) {
      key = "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      key = "Yesterday";
    } else {
      key = date.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
    }

    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
    return groups;
  }, {} as Record<string, ClipboardEntry[]>);

  if (state.view === "login" || state.view === "register") {
    const isLogin = state.view === "login";

    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-brand">
            {Icons.logo}
            <h1>Echo</h1>
            <p>{isLogin ? "Sign in to sync your clipboard" : "Create your account"}</p>
          </div>

          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              isLogin ? handleLogin() : handleRegister();
            }}
          >
            {!isLogin && (
              <div className="form-row">
                <input
                  className="input"
                  placeholder="First name"
                  value={state.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                  autoComplete="given-name"
                />
                <input
                  className="input"
                  placeholder="Last name"
                  value={state.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
                  autoComplete="family-name"
                />
              </div>
            )}

            <input
              className="input"
              type="email"
              placeholder="Email"
              value={state.email}
              onChange={(e) => update("email", e.target.value)}
              autoComplete="email"
              required
            />

            <input
              className="input"
              type="password"
              placeholder="Password"
              value={state.password}
              onChange={(e) => update("password", e.target.value)}
              autoComplete={isLogin ? "current-password" : "new-password"}
              required
            />

            <button type="submit" className="btn btn-primary" disabled={state.loading}>
              {state.loading ? <span className="spinner" /> : isLogin ? "Sign In" : "Create Account"}
            </button>
          </form>

          <div className="auth-footer">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
            <button
              className="btn btn-link"
              onClick={() => update("view", isLogin ? "register" : "login")}
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </div>
        </div>

        {state.toast && (
          <div className={`toast ${state.toast.type}`}>{state.toast.message}</div>
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-brand">
          {Icons.logo}
          <span>Echo</span>
        </div>

        <div className="header-center">
          <div className="header-status">
            <span className={`status-dot ${state.connected ? "online" : ""}`} />
            {state.connected ? "Syncing" : "Offline"}
          </div>
          <div className="header-stats">
            <span>{state.history.length} items</span>
            <span className="divider">•</span>
            <span>{state.devices.length} device{state.devices.length !== 1 ? "s" : ""}</span>
            {state.keyFingerprint && (
              <>
                <span className="divider">•</span>
                <span className="fingerprint" title="Encryption Key Fingerprint">
                   Key: {state.keyFingerprint}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="header-actions">
          <button
            className="btn btn-ghost btn-icon"
            onClick={() => update("showDevices", true)}
            title="Linked devices"
          >
            {Icons.devices}
          </button>
          <button
            className="btn btn-ghost btn-icon"
            onClick={handleShowQR}
            title="Link new device"
          >
            {Icons.link}
          </button>
          <button className="btn btn-danger btn-sm" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-header">
            <div className="sidebar-title">
              {Icons.history}
              <span>History</span>
            </div>
            {state.history.length > 0 && (
              <button
                className="btn btn-ghost btn-icon btn-sm"
                onClick={clearHistory}
                title="Clear history"
              >
                {Icons.trash}
              </button>
            )}
          </div>

          <div className="search-box">
            <span className="search-icon">{Icons.search}</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search clipboard history..."
              value={state.searchQuery}
              onChange={(e) => update("searchQuery", e.target.value)}
            />
            {state.searchQuery && (
              <button
                className="search-clear"
                onClick={() => update("searchQuery", "")}
              >
                {Icons.close}
              </button>
            )}
          </div>

          <div className="filter-tabs">
            {(["all", "text", "code", "url"] as const).map((type) => (
              <button
                key={type}
                className={`filter-tab ${state.filterType === type ? "active" : ""}`}
                onClick={() => update("filterType", type)}
              >
                {type === "all" ? "All" : type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          <div className="history-list">
            {Object.keys(groupedHistory).length === 0 ? (
              <div className="history-empty">
                {state.searchQuery ? (
                  <>
                    <p>No results found</p>
                    <span>Try a different search term</span>
                  </>
                ) : (
                  <>
                    <div className="empty-icon">{Icons.clipboard}</div>
                    <p>No clipboard history</p>
                    <span>Copy something to get started</span>
                  </>
                )}
              </div>
            ) : (
              Object.entries(groupedHistory).map(([date, entries]) => (
                <div key={date} className="history-group">
                  <div className="history-date">{date}</div>
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`history-item ${state.selectedEntry?.id === entry.id ? "selected" : ""} ${entry.pinned ? "pinned" : ""}`}
                      onClick={() => update("selectedEntry", entry)}
                    >
                      <div className="history-item-icon">
                        {getContentTypeIcon(entry.contentType)}
                      </div>
                      <div className="history-item-content">
                        <span className="history-item-text">{truncate(entry.content, 60)}</span>
                        <div className="history-item-meta">
                          <span className={`source-dot ${entry.source}`} />
                          <span className="history-item-time">{formatTime(entry.timestamp)}</span>
                        </div>
                      </div>
                      {entry.pinned && (
                        <span className="pin-badge">{Icons.pin}</span>
                      )}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </aside>

        <main className="main-content">
          {state.selectedEntry ? (
            <div className="preview-panel">
              <div className="preview-header">
                <div className="preview-type">
                  {getContentTypeIcon(state.selectedEntry.contentType)}
                  <span>{state.selectedEntry.contentType.toUpperCase()}</span>
                </div>
                <div className="preview-actions">
                  <button
                    className={`btn btn-ghost btn-icon btn-sm ${state.selectedEntry.pinned ? "active" : ""}`}
                    onClick={() => togglePin(state.selectedEntry!.id)}
                    title={state.selectedEntry.pinned ? "Unpin" : "Pin"}
                  >
                    {Icons.pin}
                  </button>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => copyToClipboard(state.selectedEntry!.content)}
                  >
                    {Icons.copy}
                    Copy
                  </button>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => deleteFromHistory(state.selectedEntry!.id)}
                  >
                    {Icons.trash}
                  </button>
                </div>
              </div>

              <div className="preview-meta">
                <div className="preview-meta-item">
                  <span className="label">Source</span>
                  <span className={`value source-badge ${state.selectedEntry.source}`}>
                    {state.selectedEntry.source === "local" ? Icons.desktop : Icons.phone}
                    {state.selectedEntry.deviceName || (state.selectedEntry.source === "local" ? "This Device" : "Remote")}
                  </span>
                </div>
                <div className="preview-meta-item">
                  <span className="label">Time</span>
                  <span className="value">{formatFullTime(state.selectedEntry.timestamp)}</span>
                </div>
              </div>

              <div className={`preview-content ${state.selectedEntry.contentType === "code" ? "code" : ""}`}>
                <pre>{state.selectedEntry.content}</pre>
              </div>

              <div className="preview-stats">
                <div className="stat">
                  <span className="stat-value">{state.selectedEntry.content.length.toLocaleString()}</span>
                  <span className="stat-label">characters</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{state.selectedEntry.content.split(/\s+/).filter(Boolean).length.toLocaleString()}</span>
                  <span className="stat-label">words</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{state.selectedEntry.content.split("\n").length}</span>
                  <span className="stat-label">lines</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="welcome-panel">
              <div className="welcome-hero">
                <div className="welcome-icon">{Icons.clipboard}</div>
                <h2>Welcome to Echo</h2>
                <p>Your clipboard syncs across all devices in real-time with end-to-end encryption.</p>
              </div>

              <div className="status-grid">
                <div className="status-card">
                  <div className={`status-card-icon ${state.connected ? "success" : "warning"}`}>
                    {Icons.sync}
                  </div>
                  <div className="status-card-content">
                    <span className="status-card-label">Connection</span>
                    <span className={`status-card-value ${state.connected ? "success" : "warning"}`}>
                      {state.connected ? "Active" : "Disconnected"}
                    </span>
                  </div>
                </div>

                <div className="status-card">
                  <div className="status-card-icon success">{Icons.shield}</div>
                  <div className="status-card-content">
                    <span className="status-card-label">Encryption</span>
                    <span className="status-card-value success">End-to-end</span>
                  </div>
                </div>

                <div className="status-card">
                  <div className="status-card-icon">{Icons.history}</div>
                  <div className="status-card-content">
                    <span className="status-card-label">History</span>
                    <span className="status-card-value">{state.history.length} items</span>
                  </div>
                </div>

                <div className="status-card">
                  <div className="status-card-icon">{Icons.devices}</div>
                  <div className="status-card-content">
                    <span className="status-card-label">Devices</span>
                    <span className="status-card-value">{state.devices.length} linked</span>
                  </div>
                </div>
              </div>

              {state.keyFingerprint && (
                <div className="key-info">
                  <span className="key-label">Encryption Key</span>
                  <code className="key-value">{state.keyFingerprint}</code>
                </div>
              )}

              <div className="quick-actions">
                <button className="btn btn-secondary" onClick={handleShowQR}>
                  {Icons.link}
                  Link New Device
                </button>
                <button className="btn btn-ghost" onClick={() => update("showKeyInput", true)}>
                  {Icons.shield}
                  Enter Sync Key
                </button>
                <button className="btn btn-ghost" onClick={() => update("showDevices", true)}>
                  {Icons.devices}
                  Manage Devices
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      {state.showKeyInput && (
        <div className="modal-backdrop" onClick={() => update("showKeyInput", false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Enter Sync Key</h2>
              <p>Paste the encryption key from your other device to sync clipboard history.</p>
            </div>
            <div className="modal-body">
              <input
                className="input"
                placeholder="Paste key here..."
                value={state.manualKey}
                onChange={(e) => update("manualKey", e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => update("showKeyInput", false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleManualKeySync}>
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}

      {state.showQR && state.linkUri && (
        <div className="modal-backdrop" onClick={() => update("showQR", false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Link a Device</h2>
              <p>Scan this QR code with the Echo mobile app</p>
            </div>
            <div className="modal-body">
              <div className="qr-wrapper">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(state.linkUri)}`}
                  alt="QR Code"
                  width={200}
                  height={200}
                />
              </div>
              <div className="key-display-wrapper">
                <p className="modal-hint">Or copy this key to your other device:</p>
                <div className="key-display">
                  <code>{state.encryptionKey ? exportKey(state.encryptionKey) : ""}</code>
                  <button 
                    className="btn btn-sm btn-secondary"
                    onClick={() => {
                      if (state.encryptionKey) {
                        copyToClipboard(exportKey(state.encryptionKey));
                        showToast("Key copied!");
                      }
                    }}
                  >
                    {Icons.copy}
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-primary" onClick={() => update("showQR", false)}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {state.showDevices && (
        <div className="modal-backdrop" onClick={() => update("showDevices", false)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Linked Devices</h2>
              <p>Devices connected to your Echo account</p>
            </div>
            <div className="modal-body">
              <div className="devices-list">
                {state.devices.length === 0 ? (
                  <div className="devices-empty">
                    <p>No devices linked yet</p>
                    <button className="btn btn-secondary" onClick={() => {
                      update("showDevices", false);
                      handleShowQR();
                    }}>
                      {Icons.link}
                      Link a Device
                    </button>
                  </div>
                ) : (
                  state.devices.map((device) => (
                    <div key={device.id} className={`device-item ${device.isCurrentDevice ? "current" : ""}`}>
                      <div className="device-icon">
                        {device.isCurrentDevice ? Icons.desktop : Icons.phone}
                      </div>
                      <div className="device-info">
                        <span className="device-name">
                          {device.name}
                          {device.isCurrentDevice && <span className="current-badge">Current</span>}
                        </span>
                        <span className="device-meta">Last active: {formatTime(device.lastSeen)}</span>
                      </div>
                      {!device.isCurrentDevice && (
                        <button className="btn btn-ghost btn-icon btn-sm" title="Remove device">
                          {Icons.trash}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => update("showDevices", false)}>
                Close
              </button>
              <button className="btn btn-secondary" onClick={() => {
                update("showDevices", false);
                handleShowQR();
              }}>
                {Icons.link}
                Link New Device
              </button>
            </div>
          </div>
        </div>
      )}

      {state.toast && (
        <div className={`toast ${state.toast.type}`}>{state.toast.message}</div>
      )}
    </div>
  );
}
