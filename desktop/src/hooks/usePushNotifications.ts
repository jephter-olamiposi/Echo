import { useEffect, useRef, useCallback } from "react";
import { apiFetch } from "../api";
import { type as osType } from "@tauri-apps/plugin-os";
import {
  isPermissionGranted,
  requestPermission,
} from "@tauri-apps/plugin-notification";

interface UsePushNotificationsOptions {
  token: string | null;
  deviceId: string;
  isConnected?: boolean;
  onSyncRequest?: () => void;
}

const BRIDGE_READY_EVENT = "echo-bridge-ready";
const BRIDGE_FCM_TOKEN_EVENT = "echo-bridge-fcm-token";
const SYNC_TRIGGER_EVENT = "echo-sync-trigger";
type EchoBridge = NonNullable<Window["EchoBridge"]>;

async function waitForBridge(timeoutMs = 5000): Promise<EchoBridge | null> {
  if (window.EchoBridge) {
    return window.EchoBridge;
  }

  return new Promise<EchoBridge | null>((resolve) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener(BRIDGE_READY_EVENT, handleReady);
      resolve(window.EchoBridge ?? null);
    }, timeoutMs);

    const handleReady = () => {
      window.clearTimeout(timeout);
      window.removeEventListener(BRIDGE_READY_EVENT, handleReady);
      resolve(window.EchoBridge ?? null);
    };

    window.addEventListener(BRIDGE_READY_EVENT, handleReady, { once: true });
  });
}

async function waitForFcmToken(timeoutMs = 5000): Promise<string | null> {
  const bridge = await waitForBridge();
  const immediate = bridge?.getFcmToken?.();
  if (immediate) {
    return immediate;
  }

  return new Promise<string | null>((resolve) => {
    const timeout = window.setTimeout(() => {
      window.removeEventListener(
        BRIDGE_FCM_TOKEN_EVENT,
        handleToken as EventListener
      );
      resolve(window.EchoBridge?.getFcmToken?.() ?? null);
    }, timeoutMs);

    const handleToken = (event: Event) => {
      window.clearTimeout(timeout);
      window.removeEventListener(
        BRIDGE_FCM_TOKEN_EVENT,
        handleToken as EventListener
      );
      resolve((event as CustomEvent<string>).detail || null);
    };

    window.addEventListener(
      BRIDGE_FCM_TOKEN_EVENT,
      handleToken as EventListener,
      { once: true }
    );
  });
}

export function usePushNotifications({
  token,
  deviceId,
  isConnected,
  onSyncRequest,
}: UsePushNotificationsOptions) {
  const hasRegistered = useRef(false);

  const registerPushToken = useCallback(
    async (fcmToken: string) => {
      if (!token) {
        return false;
      }

      try {
        await apiFetch("/push/register", {
          method: "POST",
          body: JSON.stringify({
            device_id: deviceId,
            token: fcmToken,
          }),
        });
        hasRegistered.current = true;
        return true;
      } catch (error) {
        console.error("[Push] Error registering token:", error);
        return false;
      }
    },
    [token, deviceId]
  );

  useEffect(() => {
    hasRegistered.current = false;
  }, [token, deviceId]);

  useEffect(() => {
    if (!token || !isConnected || hasRegistered.current) {
      return;
    }

    const initPush = async () => {
      try {
        const platform = osType();

        if (platform !== "android" && platform !== "ios") {
          return;
        }

        let permission = await isPermissionGranted();
        if (!permission) {
          permission = (await requestPermission()) === "granted";
        }

        if (!permission) {
          console.warn("[Push] Notification permission denied");
          return;
        }

        const fcmToken = await waitForFcmToken();
        if (!fcmToken) {
          console.warn("[Push] FCM token not available after timeout");
          return;
        }

        await registerPushToken(fcmToken);
      } catch (error) {
        console.error("[Push] Error initializing:", error);
      }
    };

    initPush();
  }, [token, isConnected, registerPushToken]);

  useEffect(() => {
    if (!onSyncRequest) return;

    const consumePendingPush = async () => {
      const bridge = await waitForBridge(1500);
      if (bridge?.consumeOpenedFromPush?.()) {
        onSyncRequest();
      }
    };

    consumePendingPush();

    const handleSyncTrigger = () => {
      onSyncRequest();
    };

    window.addEventListener(SYNC_TRIGGER_EVENT, handleSyncTrigger);
    return () =>
      window.removeEventListener(SYNC_TRIGGER_EVENT, handleSyncTrigger);
  }, [onSyncRequest]);

  return { registerPushToken };
}
