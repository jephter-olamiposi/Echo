import { useState, useCallback, useEffect } from "react";
import { Store } from "@tauri-apps/plugin-store";
import { generateSecretKey, exportKey, importKey } from "../crypto";

const KEY_STORAGE_KEY = "echo_encryption_key";
let storeInstance: Store | null = null;

const getStore = async () => {
  if (!storeInstance) {
    storeInstance = await Store.load("store.json");
  }
  return storeInstance;
};

export function useKeys() {
  const [encryptionKey, setEncryptionKey] = useState<Uint8Array | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [linkUri, setLinkUri] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Generate Fingerprint
  const generateFingerprint = async (key: Uint8Array) => {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new Uint8Array(key).buffer as ArrayBuffer
    );
    const hex = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 8)
      .toUpperCase();
    setFingerprint(hex);
  };

  // Generate Link URI
  const generateLink = (key: Uint8Array) => {
    const keyB64 = exportKey(key);
    // Simple fallback if we don't have device info here
    // In App.tsx we override this with full info
    setLinkUri(`echo://${keyB64}`);
  };

  const saveKey = useCallback(async (key: Uint8Array) => {
    const store = await getStore();
    await store.set(KEY_STORAGE_KEY, exportKey(key));
    await store.save();
    setEncryptionKey(key);
    await generateFingerprint(key);
    generateLink(key);
  }, []);

  const initKeys = useCallback(async () => {
    try {
      const store = await getStore();
      const stored = await store.get<string>(KEY_STORAGE_KEY);

      let key: Uint8Array;

      if (stored) {
        key = importKey(stored);
      } else {
        key = await generateSecretKey();
        await store.set(KEY_STORAGE_KEY, exportKey(key));
        await store.save();
      }

      setEncryptionKey(key);
      await generateFingerprint(key);
      generateLink(key);
      setIsReady(true);
      return key;
    } catch (e) {
      console.error("Key init failed", e);
      setIsReady(true); // Ready but failed?
      return null;
    }
  }, []);

  useEffect(() => {
    initKeys();
  }, [initKeys]);

  return {
    encryptionKey,
    fingerprint,
    linkUri,
    saveKey,
    isReady,
  };
}
