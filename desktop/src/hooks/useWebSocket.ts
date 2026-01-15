import { useRef, useCallback, useEffect, useState } from "react";
import { config } from "../config";
import { ClipboardEntry, LinkedDevice } from "../types";
import { encrypt, decrypt } from "../crypto";
import { detectContentType } from "../utils";

const MSG_HANDSHAKE = "handshake";
const MSG_PRESENCE_JOIN = "__JOIN__";
const MSG_PRESENCE_LEAVE = "__LEAVE__";


const BASE_DELAY_MS = 500;
const MAX_DELAY_MS = 10000;
const PING_INTERVAL_MS = 20000;
const MAX_QUEUE = 200;

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
  onError?: (error: string) => void;
}

export interface UseWebSocketReturn {
  connected: boolean;
  queuedCount: number;
  connect: () => void;
  disconnect: () => void;
  reconnect: () => void;
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
    onError,
  } = options;

  const [connected, setConnected] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const intentionalCloseRef = useRef(false);

  const onConnectionChangeRef = useRef(onConnectionChange);
  const onIncomingCopyRef = useRef(onIncomingCopy);
  const onDeviceJoinRef = useRef(onDeviceJoin);
  const onDeviceLeaveRef = useRef(onDeviceLeave);
  const encryptionKeyRef = useRef(encryptionKey);
  const deviceIdRef = useRef(deviceId);
  const deviceNameRef = useRef(deviceName);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onConnectionChangeRef.current = onConnectionChange;
    onIncomingCopyRef.current = onIncomingCopy;
    onDeviceJoinRef.current = onDeviceJoin;
    onDeviceLeaveRef.current = onDeviceLeave;
    encryptionKeyRef.current = encryptionKey;
    deviceIdRef.current = deviceId;
    deviceNameRef.current = deviceName;
    onErrorRef.current = onError;
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

  const connectRef = useRef<() => void>(() => { });
  const messageQueueRef = useRef<string[]>([]);
  const sendRef = useRef<((content: string) => void) | null>(null);

  const updateConnectionState = useCallback((state: boolean) => {
    setConnected(state);
    onConnectionChangeRef.current(state);
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (intentionalCloseRef.current) {
      return;
    }

    // Checking navigator.onLine prevents rapid retry loops when completely offline
    // We rely on window 'online' event to trigger immediate retry
    if (!navigator.onLine) {
      return;
    }

    const baseDelay = Math.min(
      BASE_DELAY_MS * Math.pow(2, retriesRef.current),
      MAX_DELAY_MS
    );
    const jittered = baseDelay * (0.85 + Math.random() * 0.3);
    const delay = Math.floor(jittered);



    reconnectTimeoutRef.current = setTimeout(() => {
      retriesRef.current++;
      connectRef.current();
    }, delay);
  }, []);

  const handleMessage = useCallback(async (event: MessageEvent) => {
    const text = event.data;
    if (text === "ping") {
      wsRef.current?.send("pong");
      return;
    }

    if (text === "pong") return;

    try {
      const msg: ServerMessage = JSON.parse(text);

      if (msg.device_id === deviceIdRef.current) return;

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

      if (msg.content === MSG_HANDSHAKE) return;

      if (!msg.encrypted || !msg.nonce) {
        console.warn("[ws] Rejected unencrypted message");
        onErrorRef.current?.(
          "Received unencrypted message. Please ensure all devices have encryption enabled."
        );
        return;
      }
      if (!encryptionKeyRef.current) {
        onErrorRef.current?.(
          "Encryption key required to receive messages. Please set up encryption in settings."
        );
        return;
      }

      let content: string;
      try {
        content = decrypt(msg.content, msg.nonce, encryptionKeyRef.current);
      } catch (e) {
        console.error("[ws] Decryption failed:", e);
        return;
      }

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
      return;
    }
    if (!encryptionKeyRef.current) {
      onErrorRef.current?.(
        "Encryption is required. Set your passphrase/key before connecting."
      );
      return;
    }

    if (wsRef.current) {
      intentionalCloseRef.current = true;
      wsRef.current.close();
      wsRef.current = null;
    }

    cleanup();
    intentionalCloseRef.current = false;
    retriesRef.current = 0; // Reset retries on manual connect (e.g. pull-to-refresh)

    const wsUrl = `${config.wsUrl}?token=${encodeURIComponent(token)}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      retriesRef.current = 0;
      updateConnectionState(true);

      const handshake = {
        device_id: deviceIdRef.current,
        device_name: deviceNameRef.current,
        content: MSG_HANDSHAKE,
        timestamp: Date.now(),
        encrypted: false,
      };
      ws.send(JSON.stringify(handshake));

      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send("ping");
        }
      }, PING_INTERVAL_MS);

      while (messageQueueRef.current.length > 0) {
        const msg = messageQueueRef.current.shift();
        if (msg) {
          sendRef.current?.(msg);
        }
      }
      setQueuedCount(0); // Clear queue count after flush
    };

    ws.onmessage = handleMessage;

    ws.onclose = (event) => {
      cleanup();
      updateConnectionState(false);

      if (event.code === 4001 || event.code === 4002 || event.code === 4003) {
        onErrorRef.current?.(`Auth Error: ${event.reason || "Check login"}`);
        return;
      }

      if (!intentionalCloseRef.current) {
        scheduleReconnect();
      }
    };

    ws.onerror = (error) => {
      console.error("[ws] Error:", error);
    };
  }, [token, cleanup, updateConnectionState, handleMessage, scheduleReconnect]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    const handleOnline = () => {
      cleanup();
      retriesRef.current = 0;
      connect();
    };

    const handleOffline = () => {
      updateConnectionState(false);
    };

    const handleVisibility = () => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        const ws = wsRef.current;
        const isConnected = ws && ws.readyState === WebSocket.OPEN;

        if (!isConnected) {
          cleanup();
          retriesRef.current = 0;
          connect();
        }
      }
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [connect, cleanup, updateConnectionState]);

  const disconnect = useCallback(() => {
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
      if (messageQueueRef.current.length >= MAX_QUEUE) {
        messageQueueRef.current.shift();
      }
      messageQueueRef.current.push(content);
      setQueuedCount(messageQueueRef.current.length);
      return;
    }

    const key = encryptionKeyRef.current;
    if (!key) {
      onErrorRef.current?.(
        "Encryption is required. Set your passphrase/key before sending."
      );
      return;
    }

    const { ciphertext, nonce } = encrypt(content, key);
    const payload: Record<string, unknown> = {
      device_id: deviceIdRef.current,
      device_name: deviceNameRef.current,
      content: ciphertext,
      nonce,
      encrypted: true,
      timestamp: Date.now(),
    };
    wsRef.current.send(JSON.stringify(payload));
  }, []);

  useEffect(() => {
    sendRef.current = send;
  }, [send]);

  useEffect(() => {
    return () => {
      intentionalCloseRef.current = true;
      cleanup();
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [cleanup]);

  return {
    connected,
    queuedCount,
    connect,
    disconnect,
    reconnect: connect,
    send,
  };
}
