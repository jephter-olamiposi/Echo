export type ContentType = "text" | "code" | "url" | "other";

export type MobileView = "dashboard" | "history" | "settings";

export interface ClipboardEntry {
  id: string;
  content: string;
  timestamp: number;
  source: "local" | "remote";
  deviceName?: string; // Optional: name of the device calling
  pinned?: boolean;
  contentType: ContentType;
}

export interface LinkedDevice {
  id: string;
  name: string;
  lastSeen: number;
  isCurrentDevice: boolean;
}

export interface AppState {
  history: ClipboardEntry[];
  connected: boolean;
  searchQuery: string;
  selectedEntry: ClipboardEntry | null;
  encryptionKey: Uint8Array | null;
  keyFingerprint: string | null;
  // toast field removed in favor of ToastContext
  view: "onboarding" | "login" | "register" | "main";
  isRefreshing: boolean;
  filterType: ContentType | "all";
  devices: LinkedDevice[];
  showQR: boolean;
  linkUri: string | null;
  showDevices: boolean;
  showKeyInput: boolean;
  manualKey: string;
  mobileView: MobileView;
  isLoading: boolean;
  email: string | null;
  showClearConfirm: boolean;
}
