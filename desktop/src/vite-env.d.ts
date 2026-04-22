/// <reference types="vite/client" />

interface Window {
    EchoBridge?: {
        getDeviceModel?: () => string;
        getFcmToken?: () => string | null;
        consumeOpenedFromPush?: () => boolean;
        getLastClipboardContent?: () => string | null;
        saveAuthToken?: (token: string) => void;
        clearAuthToken?: () => void;
    };
}
