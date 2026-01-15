import { platform, hostname } from '@tauri-apps/plugin-os';



/**
 * Get a human-readable device name based on platform
 * Returns actual device model when possible (e.g. "Samsung Galaxy S23", "iPhone 15 Pro", "Jeff's MacBook Pro")
 * Falls back to hostname or platform name if model unavailable
 */
export async function getDeviceName(): Promise<string> {
    try {
        const platformName = await platform();

        // Platform-specific device model detection
        switch (platformName) {
            case 'android':
                // Try to get Android device model via EchoBridge (JavaScript interface)
                try {
                    if (window.EchoBridge?.getDeviceModel) {
                        const model = window.EchoBridge.getDeviceModel();
                        if (model && model.trim()) {
                            console.log('[getDeviceName] Android model:', model);
                            return model;
                        }
                    }
                } catch (e) {
                    console.warn('[getDeviceName] Failed to get Android model via bridge:', e);
                }
                return 'Android Device';

            case 'ios':
                // iOS hostname is usually user-set device name like "Jeff's iPhone"
                try {
                    const host = await hostname();
                    if (host && !host.includes('localhost') && !host.includes('.local')) {
                        return host;
                    }
                } catch { }
                return 'iPhone';

            case 'macos':
                // macOS hostname is usually computer name like "Jeff's MacBook Pro"
                try {
                    const host = await hostname();
                    if (host && !host.includes('localhost') && !host.includes('.local')) {
                        return host;
                    }
                } catch { }
                return 'Mac';

            case 'windows':
                // Windows hostname is usually computer name
                try {
                    const host = await hostname();
                    if (host && !host.includes('localhost')) {
                        return host;
                    }
                } catch { }
                return 'Windows PC';

            case 'linux':
                try {
                    const host = await hostname();
                    if (host && !host.includes('localhost')) {
                        return host;
                    }
                } catch { }
                return 'Linux Desktop';

            default:
                try {
                    const host = await hostname();
                    if (host && !host.includes('localhost')) {
                        return host;
                    }
                } catch { }
                return 'Unknown Device';
        }
    } catch (error) {
        console.error('[getDeviceName] Error:', error);
        return 'This Device';
    }
}
