// lib/decryption.ts
import CryptoJS from 'crypto-js';
import {
  getEncryptedKey,
  getEncryptedKeyForPatient,
  getMedicalRecord,
  readUpgradeContract,
} from './integration';
import { getPrivateKey } from './keyStorage';
import { decryptAESKeyWithPrivateKey } from './webCryptoUtils';
import { ethers } from 'ethers';

/**
 * Decrypt the AES key using user's private RSA key
 * Now uses unified 'userPrivateKey' for all roles
 */
export async function decryptAESKey(
  encryptedKeyHex: string,
  address?: string // Optional: Fetches current signer if not provided
): Promise<string> {
  try {
    if (!encryptedKeyHex || encryptedKeyHex === '0x') {
      throw new Error('Encrypted AES key is empty or invalid');
    }
    
    // Fetch address if not provided
    let currentAddress = address;
    if (!currentAddress && window.ethereum) {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      currentAddress = await provider.getSigner().getAddress();
    }
    if (!currentAddress) {
      throw new Error('No wallet address available for key fetch');
    }
    
    console.log('🔓 Decrypting AES key for address:', currentAddress);
    console.log('Raw encrypted key hex:', encryptedKeyHex);
    
    // Get unified private key (address-aware)
    const privateKey = await getPrivateKey('userPrivateKey', currentAddress);
    if (!privateKey) {
      throw new Error(`Private key not found for ${currentAddress}. Please generate keys first.`);
    }

    console.log('✅ Private key retrieved from IndexedDB');
    
    // Decrypt using WebCrypto
    const decryptedAESKey = await decryptAESKeyWithPrivateKey(encryptedKeyHex, privateKey);
    console.log('✅ AES Key decrypted successfully');
    return decryptedAESKey;
  } catch (error) {
    console.error('❌ Error decrypting AES key:', error);
    throw error;
  }
}

/**
 * Decrypt document content using AES key
 */
export function decryptDocumentContent(
  encryptedContent: string,
  aesKeyHex: string
): any {
  try {
    // Decrypt with AES using the key string directly
    const decrypted = CryptoJS.AES.decrypt(encryptedContent, aesKeyHex);
    const decryptedStr = decrypted.toString(CryptoJS.enc.Utf8);

    if (!decryptedStr) {
      throw new Error('Decryption failed - empty result');
    }

    // Parse JSON
    return JSON.parse(decryptedStr);
  } catch (error) {
    console.error('Error decrypting document:', error);
    throw error;
  }
}

/**
 * Fetch and decrypt documents for a specific request (Admin/Healthcare Provider)
 */
export async function fetchAndDecryptDocuments(requestId: number) {
  try {
    console.log('Starting decryption for request:', requestId);

    // 1. Get encrypted AES key from contract
    console.log('Fetching encrypted key from contract...');
    const encryptedKeyHex = await getEncryptedKey(requestId);
    console.log('Encrypted key (hex):', encryptedKeyHex);

    // 2. Decrypt the AES key (using unified userPrivateKey)
    console.log('Decrypting AES key...');
    const aesKeyHex = await decryptAESKey(encryptedKeyHex);
    console.log('AES key decrypted successfully');

    // 3. Get the CID from the request
    console.log('Fetching request data...');
    const request = await getRequestById(requestId);
    console.log('Admin addresses', request.adminAddresses);
    console.log('Request CID:', request.cid);

    const cids = JSON.parse(request.cid); // Array of {name, cid}
    console.log('Parsed CIDs:', cids);

    // 4. Fetch and decrypt each document from IPFS
    const decryptedDocuments = await Promise.all(
      cids.map(async (cidObj: { name: string; cid: string }) => {
        try {
          console.log(`Fetching document from IPFS: ${cidObj.cid}`);

          // Fetch encrypted content from IPFS via backend proxy
          const response = await fetch(
            `http://localhost:8080/api/upload/fetchFromIPFS/${cidObj.cid}`
          );

          if (!response.ok) {
            throw new Error(
              `Failed to fetch from IPFS: ${response.statusText}`
            );
          }

          const encryptedContent = await response.text();
          console.log(`Fetched encrypted content for ${cidObj.name}`);

          // Decrypt the content
          console.log(`Decrypting content for ${cidObj.name}...`);
          const decryptedData = decryptDocumentContent(
            encryptedContent,
            aesKeyHex
          );
          console.log(`Successfully decrypted ${cidObj.name}`);

          return {
            name: cidObj.name,
            ...decryptedData,
          };
        } catch (error) {
          console.error(`Error processing document ${cidObj.name}:`, error);
          throw error;
        }
      })
    );

    console.log('All documents decrypted successfully');
    return decryptedDocuments;
  } catch (error) {
    console.error('Error fetching and decrypting documents:', error);
    throw error;
  }
}

/**
 * Fetch and decrypt patient record (Patient viewing their own records)
 */
export async function fetchAndDecryptPatientRecord(
  patientAddress: string,
  recordId: string
) {
  try {
    if (!patientAddress) {
      throw new Error('Patient address is required to fetch records');
    }

    console.log('🔐 Fetching encrypted key for record:', recordId);
    const encryptedKeyHex = await getEncryptedKeyForPatient(recordId, patientAddress);
    console.log('🔐 Encrypted key received:', {
      value: encryptedKeyHex,
      type: typeof encryptedKeyHex,
      length: encryptedKeyHex?.length
    });

    if (!encryptedKeyHex || encryptedKeyHex === '0x') {
      throw new Error(
        'No encrypted key found for this record. The record might not have been shared correctly.'
      );
    }

    console.log('🔓 Attempting to decrypt AES key...');
    // Decrypt using unified userPrivateKey
    const aesKeyHex = await decryptAESKey(encryptedKeyHex);

    const record = await getMedicalRecord(patientAddress, recordId);
    const cid = record?.cid;

    if (!cid) {
      throw new Error('Unable to locate the record CID on-chain.');
    }

    const response = await fetch(
      `http://localhost:8080/api/upload/fetchFromIPFS/${cid}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch encrypted record: ${response.statusText}`);
    }

    const encryptedContent = await response.text();
    const decryptedData = decryptDocumentContent(encryptedContent, aesKeyHex);

    const file = decryptedData?.file || {};
    const metadata = decryptedData?.metadata || {};

    return {
      recordId,
      cid,
      file: {
        name: file.fileName || file.name || recordId,
        type: file.fileType || file.type || 'application/octet-stream',
        base64: file.base64 || '',
      },
      metadata: {
        ...metadata,
        recordType: metadata.recordType || 'Unknown',
        timestamp: metadata.timestamp || new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('Error fetching and decrypting patient record:', error);
    throw error;
  }
}

/**
 * Get request by ID
 */
export async function getRequestById(requestId: number) {
  const contract = await readUpgradeContract();
  const request = await contract.requests(requestId);
  const adminAddresses = await contract.getRequestAdminAddresses(requestId);
  return {
    requestId: request.requestId,
    newRole: request.newRole,
    isProcessed: request.isProcessed,
    isApproved: request.isApproved,
    adminAddresses,
    requester: request.requester,
    timestamp: request.timestamp,
    cid: request.cid,
  };
}

/**
 * Convert base64 to downloadable file
 */
export function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
}

/**
 * Download a file
 */
export function downloadFile(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}