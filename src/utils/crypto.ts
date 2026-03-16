// Shared secret key derived from both usernames
// In production you'd use proper key exchange (Diffie-Hellman)
// This uses a shared secret both sides can derive

const getKey = async (secret: string): Promise<CryptoKey> => {
  const enc     = new TextEncoder();
  const keyMat  = await crypto.subtle.importKey(
    "raw", enc.encode(secret), "PBKDF2", false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name:       "PBKDF2",
      salt:       enc.encode("akieme-salt"),
      iterations: 100000,
      hash:       "SHA-256",
    },
    keyMat,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
};

// Generate shared secret from two user IDs (sorted so both get same key)
export const getSharedSecret = (userId1: string, userId2: string): string => {
  return [userId1, userId2].sort().join("-");
};

export const encryptMessage = async (
  text: string,
  secret: string
): Promise<{ content: string; iv: string }> => {
  const key       = await getKey(secret);
  const enc       = new TextEncoder();
  const ivBytes   = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    enc.encode(text)
  );
  return {
    content: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    iv:      btoa(String.fromCharCode(...ivBytes)),
  };
};

export const decryptMessage = async (
  content: string,
  iv: string,
  secret: string
): Promise<string> => {
  try {
    const key       = await getKey(secret);
    const dec       = new TextDecoder();
    const ivBytes   = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
    const encrypted = Uint8Array.from(atob(content), c => c.charCodeAt(0));
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBytes },
      key,
      encrypted
    );
    return dec.decode(decrypted);
  } catch {
    return "🔒 Encrypted message";
  }
};