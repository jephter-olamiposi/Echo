export interface HandshakeMessage {
  type: "handshake";
  device_id: string;
  device_name?: string;
  timestamp: number;
}

export interface ClipboardMessage {
  type: "clipboard";
  device_id: string;
  device_name?: string;
  content: string;
  nonce: string;
  timestamp: number;
  is_history?: boolean;
}

export interface PresenceMessage {
  type: "presence";
  device_id: string;
  device_name?: string;
  event: "join" | "leave";
  timestamp: number;
}

export interface ProtocolErrorMessage {
  type: "error";
  error: string;
  code: string;
}

export type ClientMessage = HandshakeMessage | ClipboardMessage;
export type ServerMessage = ClipboardMessage | PresenceMessage | ProtocolErrorMessage;

export function createHandshake(
  deviceId: string,
  deviceName: string
): HandshakeMessage {
  return {
    type: "handshake",
    device_id: deviceId,
    device_name: deviceName,
    timestamp: Date.now(),
  };
}

export function createClipboardMessage(
  deviceId: string,
  deviceName: string,
  content: string,
  nonce: string
): ClipboardMessage {
  return {
    type: "clipboard",
    device_id: deviceId,
    device_name: deviceName,
    content,
    nonce,
    timestamp: Date.now(),
  };
}

export function isClipboardMessage(
  message: ServerMessage
): message is ClipboardMessage {
  return message.type === "clipboard";
}

export function isPresenceMessage(
  message: ServerMessage
): message is PresenceMessage {
  return message.type === "presence";
}

export function isProtocolErrorMessage(
  message: ServerMessage
): message is ProtocolErrorMessage {
  return message.type === "error";
}
