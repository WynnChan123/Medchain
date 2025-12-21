// lib/keyStorage.ts

const DB_NAME = 'MedChainKeyStore';
const DB_VERSION = 1;
const STORE_NAME = 'keys';
const KEY_PREFIX = 'userPrivateKey_'; // Prefix for unified keys

export interface StoredKey {
  id: string; // Prefixed ID, e.g., 'userPrivateKey_0x123'
  key: CryptoKey;
  createdAt: number;
}

/**
 * Open the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
}

/**
 * Store a private key handle in IndexedDB (address-aware)
 */
export async function storePrivateKey(keyId: string, key: CryptoKey, address: string): Promise<void> {
  const prefixedId = `${KEY_PREFIX}${address.toLowerCase()}`;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const item: StoredKey = {
      id: prefixedId,
      key,
      createdAt: Date.now()
    };

    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve a private key handle from IndexedDB (address-aware)
 */
export async function getPrivateKey(keyId: string, address: string): Promise<CryptoKey | null> {
  const prefixedId = `${KEY_PREFIX}${address.toLowerCase()}`;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(prefixedId);

    request.onsuccess = () => {
      const result = request.result as StoredKey;
      resolve(result ? result.key : null);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Check if a key exists (address-aware)
 */
export async function hasPrivateKey(keyId: string, address: string): Promise<boolean> {
  const key = await getPrivateKey(keyId, address);
  return !!key;
}

/**
 * Clear all keys (Dangerous!)
 */
export async function clearKeys(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a private key (address-aware)
 */
export async function deletePrivateKey(keyId: string, address: string): Promise<void> {
  const prefixedId = `${KEY_PREFIX}${address.toLowerCase()}`;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(prefixedId);

    request.onsuccess = () => {
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Cleanup legacy role-specific keys (one-time, optional)
 */
export async function cleanupLegacyKeys(address: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      
      // Delete old IDs (non-prefixed)
      const legacyRequests = [
        store.delete('patientPrivateKey'),
        store.delete('adminPrivateKey'),
      ];
      
      Promise.allSettled(legacyRequests).then(() => {
        resolve();
      }).catch(reject);
    });
  } catch (error) {
    console.warn('Legacy cleanup failed (safe to ignore):', error);
  }
}