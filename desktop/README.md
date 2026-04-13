# Echo Desktop (Cross-Platform Frontend)

The Echo client is a multi-target application built with React, TypeScript, and Tauri. It handles native system integration for clipboard monitoring, end-to-end encryption, and real-time synchronization.

## 🧩 Architectural Layout

### Core Integration
The application bridges web technologies with native OS primitives via the Tauri bridge:
- **Tauri Core**: Manages the Rust-side system tray, single-instance enforcement, and native clipboard listeners.
- **React Layer**: Handles the UI state, device linking workflows (QR), and cryptographic logic.

### Platform-Specific Implementations
| Target | Clipboard Strategy | Sync Mechanism |
|--------|--------------------|----------------|
| **macOS / Windows / Linux** | Native Rust Listener | Persistent WebSocket |
| **Android** | Kotlin Event + Fallback Polling | WS + FCM Data Messages |
| **iOS** | Adaptive Polling (500ms - 15s) | WS (Active) / FCM (Background) |

## 🔐 Cryptographic Implementation

Encryption is executed in the browser context (WebView) using the `@noble/ciphers` library:
- **Primitive**: XChaCha20-Poly1305 (AEAD).
- **Key Storage**: Secured via `tauri-plugin-store`, persisting the 32-byte secret key across app restarts.
- **Fingerprinting**: First 8 hex characters of the SHA-256 hash of the encryption key, displayed in the UI for manual verification across devices.

## 🛠️ Development Workflow

### Requirements
- **macOS**: Xcode + Rust (for iOS builds)
- **Linux**: Build-essential + WebKit2GTK
- **Windows**: WebView2 + C++ Build Tools
- **Cross-Platform**: Node.js v18+

### Commands
```bash
# Start development server with HMR
npm run tauri dev

# Build production artifacts for the host OS
npm run tauri build

# Android development
npm run tauri android dev
```

## 🛠️ Operational Guide

### Environment Configuration
The application consumes several build-time and runtime environment variables:
- `VITE_WS_URL`: The WebSocket endpoint for the synchronization server.
- `VITE_API_URL`: The REST endpoint for authentication and history.

### Build Troubleshooting

#### Android (NDK/SDK)
- **Error**: `No such file or directory: '.../libcrypto.so'`
- **Fix**: Ensure NDK 25.x+ is installed. The NDK path must be explicitly exported: `export ANDROID_NDK_HOME=/path/to/ndk`.

#### macOS (Code Signing)
- **Problem**: App fails to access clipboard on certain macOS versions when not signed.
- **Fix**: For local development, ensure the binary is ad-hoc signed: `codesign -s - --force --deep target/debug/desktop`.

#### Linux (Tauri Dependencies)
- **Requirement**: `libwebkit2gtk-4.0-dev` and `libssl-dev` are mandatory for both compilation and execution.

## 📂 Project Structure
- `src/`: React application core.
- `src/hooks/`: Specialized hooks for WebSocket management (`useWebSocket`) and Crypto.
- `src-tauri/`: Rust crate for system integration and background task management.
- `src-tauri/src/clipboard.rs`: Native desktop clipboard listener implementation.
