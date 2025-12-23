import { useRef, useCallback, useEffect, useState } from "react";
import { config } from "../config";
import { ClipboardEntry, LinkedDevice } from "../types";
import { encrypt, decrypt } from "../crypto";
import { detectContentType } from "../utils";

// Message types from backend
const MSG_HANDSHAKE = "handshake";
const MSG_PRESENCE_JOIN = "__JOIN__";
const MSG_PRESENCE_LEAVE = "__LEAVE__";

// Reconnection config - Production balanced
const MAX_RETRIES = 8;
const BASE_DELAY_MS = 500; // Fast but not aggressive
const MAX_DELAY_MS = 10000; // Cap at 10s
const PING_INTERVAL_MS = 20000; // 20s keep-alive

interface ServerMessage {
  device_id: string;
  device_name?: string;
  content: string;
  nonce?: string;
  encrypted?: boolean;
  timestamp: number;
  is_history?: boolean;
}

export interface UseWebSocketOptions {
  token: string | null;
  deviceId: string;
  deviceName: string;
  encryptionKey: Uint8Array | null;
  onConnectionChange: (connected: boolean) => void;
  onIncomingCopy: (entry: ClipboardEntry, isHistory?: boolean) => void;
  onDeviceJoin: (device: LinkedDevice) => void;
  onDeviceLeave: (deviceId: string) => void;
}

export interface UseWebSocketReturn {
  connected: boolean;
  connect: () => void;
  disconnect: () => void;
  send: (content: string) => void;
}

export function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn {
  const {
    token,
    deviceId,
    deviceName,
    encryptionKey,
    onConnectionChange,
    onIncomingCopy,
    onDeviceJoin,
    onDeviceLeave,
  } = options;

  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const intentionalCloseRef = useRef(false);

  // Stable refs for callbacks to avoid reconnect loops
  const onConnectionChangeRef = useRef(onConnectionChange);
  const onIncomingCopyRef = useRef(onIncomingCopy);
  const onDeviceJoinRef = useRef(onDeviceJoin);
  const onDeviceLeaveRef = useRef(onDeviceLeave);
  const encryptionKeyRef = useRef(encryptionKey);
  const deviceIdRef = useRef(deviceId);
  const deviceNameRef = useRef(deviceName);

  useEffect(() => {
    onConnectionChangeRef.current = onConnectionChange;
    onIncomingCopyRef.current = onIncomingCopy;
    onDeviceJoinRef.current = onDeviceJoin;
    onDeviceLeaveRef.current = onDeviceLeave;
    encryptionKeyRef.current = encryptionKey;
    deviceIdRef.current = deviceId;
    deviceNameRef.current = deviceName;
  });

  const cleanup = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  }, []);

  const updateConnectionState = useCallback((state: boolean) => {
    setConnected(state);
    onConnectionChangeRef.current(state);
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (intentionalCloseRef.current || retriesRef.current >= MAX_RETRIES) {
      console.log(
        "[ws] Max retries reached or intentional close, stopping reconnection"
      );
      return;
    }

    const delay = Math.min(
      BASE_DELAY_MS * Math.pow(2, retriesRef.current),
      MAX_DELAY_MS
    );
    console.log(
      `[ws] Reconnecting in ${delay}ms (attempt ${
        retriesRef.current + 1
      }/${MAX_RETRIES})`
    );

    reconnectTimeoutRef.current = setTimeout(() => {
      retriesRef.current++;
      connect();
    }, delay);
  }, []);

  const handleMessage = useCallback(async (event: MessageEvent) => {
    const text = event.data;
    if (text === "ping" || text === "pong") return;

    try {
      const msg: ServerMessage = JSON.parse(text);

      // Skip messages from self
      if (msg.device_id === deviceIdRef.current) return;

      // Handle presence
      if (msg.content === MSG_PRESENCE_JOIN) {
        onDeviceJoinRef.current({
          id: msg.device_id,
          name: msg.device_name || "Unknown",
          lastSeen: Date.now(),
          isCurrentDevice: false,
        });
        return;
      }

      if (msg.content === MSG_PRESENCE_LEAVE) {
        onDeviceLeaveRef.current(msg.device_id);
        return;
      }

      // Skip handshake echoes
      if (msg.content === MSG_HANDSHAKE) return;

      // Decrypt if needed
      let content = msg.content;
      if (msg.encrypted && msg.nonce && encryptionKeyRef.current) {
        try {
          content = decrypt(msg.content, msg.nonce, encryptionKeyRef.current);
        } catch (e) {
          console.error("[ws] Decryption failed:", e);
          return;
        }
      }

      // Build entry and notify
      const entry: ClipboardEntry = {
        id: crypto.randomUUID(),
        content,
        timestamp: msg.timestamp || Date.now(),
        source: "remote",
        deviceName: msg.device_name,
        contentType: detectContentType(content),
      };

      onIncomingCopyRef.current(entry, msg.is_history);
    } catch (e) {
      console.error("[ws] Failed to parse message:", e);
    }
  }, []);

  const connect = useCallback(() => {
    if (!token || !deviceIdRef.current) {
      console.log("[ws] Cannot connect: missing token or deviceId");
      return;
    }

    // Close existing connection
    if (wsRef.current) {
      intentionalCloseRef.current = true;
      wsRef.current.close();
      wsRef.current = null;
    }

    cleanup();
    intentionalCloseRef.current = false;
    retriesRef.current = 0; // Reset retries on manual connect (e.g. pull-to-refresh)

    const wsUrl = `${config.wsUrl}?token=${token}`;
    console.log("[ws] Connecting to:", wsUrl.replace(token, "***"));

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("[ws] Connected, sending handshake");
      retriesRef.current = 0;
      updateConnectionState(true);

      // Send handshake
      const handshake = {
        device_id: deviceIdRef.current,
        device_name: deviceNameRef.current,
        content: MSG_HANDSHAKE,
        timestamp: Date.now(),
        encrypted: false,
      };
      ws.send(JSON.stringify(handshake));

      // Start ping interval
      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send("ping");
        }
      }, PING_INTERVAL_MS);
    };

    ws.onmessage = handleMessage;

    ws.onclose = (event) => {
      console.log(`[ws] Closed: code=${event.code}, reason=${event.reason}`);
      cleanup();
      updateConnectionState(false);

      if (!intentionalCloseRef.current) {
        scheduleReconnect();
      }
    };

    ws.onerror = (error) => {
      console.error("[ws] Error:", error);
    };
  }, [token, cleanup, updateConnectionState, handleMessage, scheduleReconnect]);

  const disconnect = useCallback(() => {
    console.log("[ws] Intentional disconnect");
    intentionalCloseRef.current = true;
    cleanup();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    updateConnectionState(false);
    retriesRef.current = 0;
  }, [cleanup, updateConnectionState]);

  const send = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn("[ws] Cannot send: not connected");
      return;
    }

    const key = encryptionKeyRef.current;
    let payload: Record<string, unknown>;

    if (key) {
      const { ciphertext, nonce } = encrypt(content, key);
      payload = {
        device_id: deviceIdRef.current,
        device_name: deviceNameRef.current,
        content: ciphertext,
        nonce,
        encrypted: true,
        timestamp: Date.now(),
      };
    } else {
      payload = {
        device_id: deviceIdRef.current,
        device_name: deviceNameRef.current,
        content,
        encrypted: false,
        timestamp: Date.now(),
      };
    }

    wsRef.current.send(JSON.stringify(payload));
  }, []);

  // Cleanup on unmount & Setup Network Listeners
  useEffect(() => {
    const handleOnline = () => {
      console.log("[ws] Network online, attempting reconnect");
      if (!intentionalCloseRef.current) {
        // Reset retries for a fresh attempt
        retriesRef.current = 0;
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
        connect();
      }
    };

    const handleOffline = () => {
      console.log("[ws] Network offline");
      if (wsRef.current) {
        wsRef.current.close();
      }
      updateConnectionState(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      intentionalCloseRef.current = true;
      cleanup();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [cleanup, connect, updateConnectionState]);

  return {
    connected,
    connect,
    disconnect,
    send,
  };
}
