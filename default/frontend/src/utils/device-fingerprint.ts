/**
 * Responsibility: Persists a browser-local device fingerprint so refresh-token rotation can be bound to one device.
 */
const storageKey =
  import.meta.env.VITE_DEVICE_FINGERPRINT_KEY?.trim() ||
  "shopsphere.device.fingerprint";

export const getDeviceFingerprint = (): string => {
  const storedFingerprint = window.localStorage.getItem(storageKey);

  if (storedFingerprint) {
    return storedFingerprint;
  }

  const fingerprint = window.crypto.randomUUID();
  window.localStorage.setItem(storageKey, fingerprint);

  return fingerprint;
};

