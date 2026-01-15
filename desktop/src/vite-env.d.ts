/// <reference types="vite/client" />

interface Window {
    EchoBridge?: {
        getDeviceModel?: () => string;
        getFcmToken?: () => string | null;
        wasOpenedFromPush?: () => boolean;
        clearOpenedFromPush?: () => void;
        getLastClipboardContent?: () => string | null;
        saveAuthToken?: (token: string) => void;
        clearAuthToken?: () => void;
    };
}

