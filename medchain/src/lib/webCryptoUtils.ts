// lib/webCryptoUtils.ts

/**
 * Generate a non-extractable RSA-OAEP key pair
 */
export async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
  return window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    false, // extractable: false (Private key cannot be exported)
    ["encrypt", "decrypt"]
  );
}

/**
 * Export public key to PEM format (for on-chain storage)
 */
export async function exportPublicKeyToPEM(publicKey: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey("spki", publicKey);
  const exportedAsBase64 = arrayBufferToBase64(exported);
  return `-----BEGIN PUBLIC KEY-----\n${formatPEM(exportedAsBase64)}\n-----END PUBLIC KEY-----`;
}

/**
 * Import public key from PEM format (for encryption)
 */
export async function importPublicKeyFromPEM(pem: string): Promise<CryptoKey> {
  // Remove PEM header/footer and newlines
  const pemHeader = "-----BEGIN PUBLIC KEY-----";
  const pemFooter = "-----END PUBLIC KEY-----";
  const pemContents = pem
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s/g, "");

  const binaryDer = base64ToArrayBuffer(pemContents);

  return window.crypto.subtle.importKey(
    "spki",
    binaryDer,
    {
      name: "RSA-OAEP",
      hash: "SHA-256",
    },
    true,
    ["encrypt"]
  );
}

/**
 * Encrypt AES key with RSA Public Key (OAEP)
 * Returns hex string (0x...)
 */
export async function encryptAESKeyWithPublicKey(
  aesKeyHex: string,
  publicKeyPEM: string
): Promise<string> {
  // 1. Import the public key
  const publicKey = await importPublicKeyFromPEM(publicKeyPEM);

  // 2. Convert AES key hex to ArrayBuffer
  const aesKeyBuffer = hexToArrayBuffer(aesKeyHex.replace(/^0x/, ''));

  // 3. Encrypt
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "RSA-OAEP",
    },
    publicKey,
    aesKeyBuffer
  );

  // 4. Convert to hex
  return '0x' + arrayBufferToHex(encryptedBuffer);
}

/**
 * Decrypt AES key with RSA Private Key (OAEP)
 * Returns hex string
 */
export async function decryptAESKeyWithPrivateKey(
  encryptedKeyHex: string,
  privateKey: CryptoKey
): Promise<string> {
// 1. Convert encrypted hex to ArrayBuffer
  const cleanHex = encryptedKeyHex.replace(/^0x/, '');
  console.log('🔍 Decrypt Debug - Clean Hex:', cleanHex);
  console.log('🔍 Decrypt Debug - Hex Length:', cleanHex.length);
  const encryptedBuffer = hexToArrayBuffer(cleanHex);
  console.log('🔍 Decrypt Debug - Buffer Length (bytes):', encryptedBuffer.byteLength);
  console.log('🔍 Decrypt Debug - Private Key Algo:', privateKey.algorithm);
  
  // Validate expected length for RSA-2048 OAEP (should be exactly 256 bytes)
  if (encryptedBuffer.byteLength !== 256) {
    throw new Error(`Invalid ciphertext length: ${encryptedBuffer.byteLength} bytes (expected 256 for RSA-2048)`);
  }
  // 2. Decrypt
  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: "RSA-OAEP",
    },
    privateKey,
    encryptedBuffer
  );

  // 3. Convert back to hex
  return arrayBufferToHex(decryptedBuffer);
}

// --- Helpers ---

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

function formatPEM(base64: string): string {
  return base64.match(/.{1,64}/g)?.join('\n') || base64;
}

function hexToArrayBuffer(hex: string): ArrayBuffer {
  if (hex.length % 2 !== 0) {
      throw new Error("Invalid hex string");
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes.buffer;
}

function arrayBufferToHex(buffer: ArrayBuffer): string {
  const byteArray = new Uint8Array(buffer);
  return Array.from(byteArray)
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('');
}
