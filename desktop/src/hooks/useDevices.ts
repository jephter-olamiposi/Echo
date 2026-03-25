import { useState, useCallback } from "react";
import { LinkedDevice } from "../types";

export interface UseDevicesReturn {
  devices: LinkedDevice[];
  setDevices: React.Dispatch<React.SetStateAction<LinkedDevice[]>>;
  handleDeviceJoin: (device: LinkedDevice) => void;
  handleDeviceLeave: (id: string) => void;
  removeDevice: (id: string) => void;
}

export function useDevices(
  currentDeviceId: string,
  onDeviceJoinToast?: (name: string) => void
): UseDevicesReturn {
  const [devices, setDevices] = useState<LinkedDevice[]>([]);

  const handleDeviceJoin = useCallback(
    (device: LinkedDevice) => {
      setDevices((prev) => {
        const exists = prev.find((d) => d.id === device.id);
        if (exists) {
          return prev.map((d) =>
            d.id === device.id ? { ...d, lastSeen: Date.now() } : d
          );
        }
        return [...prev, device];
      });

      const isMe = device.id === currentDeviceId || device.isCurrentDevice;
      const isGenericName =
        device.name === "This Device" || device.name === "Unknown Device";
      if (!isMe && !isGenericName) {
        onDeviceJoinToast?.(device.name);
      }
    },
    [currentDeviceId, onDeviceJoinToast]
  );

  const handleDeviceLeave = useCallback((id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id || d.isCurrentDevice));
  }, []);

  const removeDevice = useCallback((id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
  }, []);

  return { devices, setDevices, handleDeviceJoin, handleDeviceLeave, removeDevice };
}
