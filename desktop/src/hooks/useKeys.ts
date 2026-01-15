import { useState, useCallback, useEffect, useMemo } from "react";
import {
  generateSecretKey,
  exportKey,
  saveEncryptionKey,
  loadEncryptionKey,
  clearEncryptionKey,
} from "../crypto";

export function useKeys() {
  const [encryptionKey, setEncryptionKey] = useState<Uint8Array | null>(null);
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [linkUri, setLinkUri] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [needsKeySetup, setNeedsKeySetup] = useState(false);

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

  const generateLink = (key: Uint8Array) => {
    const keyB64 = exportKey(key);
    setLinkUri(`echo://${keyB64}`);
  };

  const saveKey = useCallback(async (key: Uint8Array) => {
    await saveEncryptionKey(key);
    setEncryptionKey(key);
    setNeedsKeySetup(false);
    await generateFingerprint(key);
    generateLink(key);
  }, []);

  const createNewKey = useCallback(async () => {
    const key = generateSecretKey();
    await saveKey(key);
    return key;
  }, [saveKey]);

  const initKeys = useCallback(async () => {
    try {
      const key = await loadEncryptionKey();

      if (!key) {
        setNeedsKeySetup(true);
        setIsReady(true);
        return null;
      }

      setEncryptionKey(key);
      setNeedsKeySetup(false);
      await generateFingerprint(key);
      generateLink(key);
      setIsReady(true);
      return key;
    } catch (e) {
      console.error("Key init failed", e);
      setNeedsKeySetup(true);
      setIsReady(true);
      return null;
    }
  }, []);

  const clearKeys = useCallback(async () => {
    await clearEncryptionKey();
    setEncryptionKey(null);
    setFingerprint(null);
    setLinkUri(null);
    setNeedsKeySetup(true);
  }, []);

  useEffect(() => {
    initKeys();
  }, [initKeys]);

  return useMemo(
    () => ({
      encryptionKey,
      fingerprint,
      linkUri,
      saveKey,
      createNewKey,
      clearKeys,
      needsKeySetup,
      isReady,
    }),
    [
      encryptionKey,
      fingerprint,
      linkUri,
      saveKey,
      createNewKey,
      clearKeys,
      needsKeySetup,
      isReady,
    ]
  );
}
