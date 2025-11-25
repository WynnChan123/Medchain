// lib/keyStorage.ts

const DB_NAME = 'MedChainKeyStore';
const DB_VERSION = 1;
const STORE_NAME = 'keys';

export interface StoredKey {
  id: string; // 'patientPrivateKey' or 'adminPrivateKey'
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
 * Store a private key handle in IndexedDB
 */
export async function storePrivateKey(id: string, key: CryptoKey): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const item: StoredKey = {
      id,
      key,
      createdAt: Date.now()
    };

    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieve a private key handle from IndexedDB
 */
export async function getPrivateKey(id: string): Promise<CryptoKey | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => {
      const result = request.result as StoredKey;
      resolve(result ? result.key : null);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Check if a key exists
 */
export async function hasPrivateKey(id: string): Promise<boolean> {
  const key = await getPrivateKey(id);
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
