//integration.ts
import { ethers } from 'ethers';
import { UserRole } from '../../utils/userRole';
import CryptoJS from 'crypto-js';
import { decryptAESKey } from './decryption';
import { getUserPublicKey } from './userKeys';
import { encryptAESKeyWithPublicKey } from './webCryptoUtils';
import { Notification, NotificationType } from "@/types/notification";
import { API_URL } from './config';


const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SMART_CONTRACT_ADDRESS!;
const UPGRADE_ADDRESS = process.env.NEXT_PUBLIC_ROLE_UPGRADE_ADDRESS!;
const USER_MANAGEMENT_ADDRESS = process.env.NEXT_PUBLIC_USER_MANAGEMENT!;
const MEDICAL_RECORDS_ADDRESS = process.env.NEXT_PUBLIC_MEDICAL_RECORDS!;
const ACCESS_CONTROL_ADDRESS = process.env.NEXT_PUBLIC_ACCESS_CONTROL!;
const CLAIM_REQUEST_ADDRESS = process.env.NEXT_PUBLIC_CLAIM_REQUEST!;

export interface User {
  role: UserRole;
  encryptedId: string;
  createdAt: Date;
  isActive: boolean;
  walletAddress: string;
  authorizedBy: string;
}

// ABI cache configuration
const ABI_CACHE_KEY_PREFIX = 'abi_cache_';
const ABI_CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

interface CachedABI {
  abi: any;
  timestamp: number;
}

export async function fetchAbiFromEtherscan(address: string): Promise<any> {
  try {
    const addressLower = address.toLowerCase();
    const cacheKey = `${ABI_CACHE_KEY_PREFIX}${addressLower}`;

    // Check localStorage cache first
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const cachedData: CachedABI = JSON.parse(cached);
          if (Date.now() - cachedData.timestamp < ABI_CACHE_DURATION) {
            return cachedData.abi;
          } else {
            // Remove expired cache
            localStorage.removeItem(cacheKey);
          }
        } catch (e) {
          // Invalid cache data, remove it
          localStorage.removeItem(cacheKey);
        }
      }
    }

    const response = await fetch(
      `${API_URL}/api/etherscan/getABI/${address}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch ABI');
    }

    const data = await response.json();

    // Cache the ABI in localStorage
    if (typeof window !== 'undefined' && data.abi) {
      const cacheData: CachedABI = {
        abi: data.abi,
        timestamp: Date.now(),
      };
      localStorage.setItem(cacheKey, JSON.stringify(cacheData));
    }

    return data.abi;
  } catch (error) {
    console.error('Error fetching ABI from backend:', error);
    throw error;
  }
}

export async function writeContract() {
  if (!window.ethereum) throw new Error('MetaMask not found');
  await (window.ethereum as any).request({ method: 'eth_requestAccounts' });

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = await provider.getSigner();

  const abi = await fetchAbiFromEtherscan(CONTRACT_ADDRESS);
  return new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
}

export async function readContract() {
  if (!window.ethereum) throw new Error('MetaMask not found');
  await (window.ethereum as any).request({ method: 'eth_requestAccounts' });

  // const provider = new ethers.providers.JsonRpcProvider(process.env.SEPOLIA_RPC);
  const provider = new ethers.providers.Web3Provider(window.ethereum);

  const abi = await fetchAbiFromEtherscan(CONTRACT_ADDRESS);

  return new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
}

export async function readUpgradeContract() {
  if (!window.ethereum) throw new Error('MetaMask not found');
  await (window.ethereum as any).request({ method: 'eth_requestAccounts' });

  // const provider = new ethers.providers.JsonRpcProvider(process.env.SEPOLIA_RPC);
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const abi = await fetchAbiFromEtherscan(UPGRADE_ADDRESS);

  return new ethers.Contract(UPGRADE_ADDRESS, abi, provider);
}

export async function writeUpgradeContract() {
  if (!window.ethereum) throw new Error('MetaMask not found');
  await (window.ethereum as any).request({ method: 'eth_requestAccounts' });

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = await provider.getSigner();

  const abi = await fetchAbiFromEtherscan(UPGRADE_ADDRESS);
  return new ethers.Contract(UPGRADE_ADDRESS, abi, signer);
}

export async function readUserManagementContract() {
  if (!window.ethereum) throw new Error('MetaMask not found');
  await (window.ethereum as any).request({ method: 'eth_requestAccounts' });

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = await provider.getSigner();

  const abi = await fetchAbiFromEtherscan(USER_MANAGEMENT_ADDRESS);
  return new ethers.Contract(USER_MANAGEMENT_ADDRESS, abi, signer);
}

export async function writeMedicalRecordsContract() {
  if (!window.ethereum) throw new Error('MetaMask not found');
  await (window.ethereum as any).request({ method: 'eth_requestAccounts' });

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = await provider.getSigner();

  const abi = await fetchAbiFromEtherscan(MEDICAL_RECORDS_ADDRESS);
  return new ethers.Contract(MEDICAL_RECORDS_ADDRESS, abi, signer);
}

export async function readMedicalRecordsContract() {
  if (!window.ethereum) throw new Error('MetaMask not found');
  await (window.ethereum as any).request({ method: 'eth_requestAccounts' });

  const provider = new ethers.providers.Web3Provider(window.ethereum);

  const abi = await fetchAbiFromEtherscan(MEDICAL_RECORDS_ADDRESS);
  return new ethers.Contract(MEDICAL_RECORDS_ADDRESS, abi, provider);
}

export async function writeAccessControlContract() {
  if (!window.ethereum) throw new Error('MetaMask not found');
  await (window.ethereum as any).request({ method: 'eth_requestAccounts' });

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = await provider.getSigner();

  const abi = await fetchAbiFromEtherscan(ACCESS_CONTROL_ADDRESS);
  return new ethers.Contract(ACCESS_CONTROL_ADDRESS, abi, signer);
}

export async function readAccessControlContract() {
  if (!window.ethereum) throw new Error('MetaMask not found');
  await (window.ethereum as any).request({ method: 'eth_requestAccounts' });

  const provider = new ethers.providers.Web3Provider(window.ethereum);

  const abi = await fetchAbiFromEtherscan(ACCESS_CONTROL_ADDRESS);
  return new ethers.Contract(ACCESS_CONTROL_ADDRESS, abi, provider);
}

export async function writeClaimRequestContract() {
  if (!window.ethereum) throw new Error('MetaMask not found');
  await (window.ethereum as any).request({ method: 'eth_requestAccounts' });

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = await provider.getSigner();

  const abi = await fetchAbiFromEtherscan(CLAIM_REQUEST_ADDRESS);
  return new ethers.Contract(CLAIM_REQUEST_ADDRESS, abi, signer);
}

export async function readClaimRequestContract() {
  if (!window.ethereum) throw new Error('MetaMask not found');
  await (window.ethereum as any).request({ method: 'eth_requestAccounts' });

  const provider = new ethers.providers.Web3Provider(window.ethereum);

  const abi = await fetchAbiFromEtherscan(CLAIM_REQUEST_ADDRESS);
  return new ethers.Contract(CLAIM_REQUEST_ADDRESS, abi, provider);
}

export async function registerUser(
  wallet: string,
  encryptedId: string,
  role: number
) {
  try {
    const contract = await readUserManagementContract();
    const sender = await contract.signer.getAddress();
    const tx = await contract.registerUserFromSystem(
      sender,
      wallet,
      encryptedId,
      role
    );
    return await tx.wait();
  } catch (error: any) {
    console.error('Error in registering wallet on blockchain:', error);
    throw new Error(error.reason || error.message || 'Transaction failed');
  }
}

export async function createAdmin(walletAddress: string) {
  try {
    const encryptedId = ethers.utils.keccak256(
      ethers.utils.toUtf8Bytes(walletAddress)
    );
    // Role 4 is Admin
    return await registerUser(walletAddress, encryptedId, 4);
  } catch (error) {
    console.error('Error creating admin:', error);
    throw error;
  }
}

export async function getRole(address: string): Promise<UserRole> {
  const contract = await readUserManagementContract();
  const roleId: number = await contract.getUserRole(address);
  return roleId as UserRole;
}

export async function userExists(address: string): Promise<boolean> {
  const contract = await readContract();
  return await contract.userExists(address);
}

export async function requestRoleUpgrade(
  address: string,
  cid: string,
  admins: string[],
  newRole: UserRole,
  encryptedKeys: string[],
  companyName: string,
  doctorName: string
) {
  try {
    const contract = await writeUpgradeContract();
    const tx = await contract.submitUpgradeRequest(
      address,
      cid,
      newRole,
      admins,
      encryptedKeys,
      companyName,
      doctorName
    );
    return await tx.wait();
  } catch (error) {
    console.error('Error requesting role upgrade: ', error);
    throw error;
  }
}

// export async function shareDocuments(
//   patientAddress: string,
//   files: { name: string; cid: string}[],
//   recipientAddress: string
// ) {
//   try {
//   }catch(error){

//   }

// )

export async function shareMedicalRecord(
  patient: string,
  recordId: string,
  to: string,
  accessControlContractAddress: string,
  encryptedKeyForRecipient: string
) {
  try {
    const contract = await writeMedicalRecordsContract();

    // Ensure hex format
    const hex = encryptedKeyForRecipient.startsWith('0x')
      ? encryptedKeyForRecipient
      : '0x' + encryptedKeyForRecipient;

    const tx = await contract.shareMedicalRecord(
      patient,
      recordId,
      to,
      accessControlContractAddress,
      hex
    );
    return await tx.wait();
  } catch (error) {
    console.error('Error sharing medical record: ', error);
    throw error;
  }
}
//integration.ts
export async function submitRoleUpgradeRequest(
  patientAddress: string,
  files: { id: File; license: File; proof: File },
  metadata: {
    role: string;
    organization: string;
    additionalInfo: string;
    doctorName?: string;
  },
  selectedAdmins: string[],
  adminPublicKeys: string[],
  companyName: string,
  doctorName: string
) {
  try {
    //Take each file from the user's computer
    //Read each file and convert it to base64 text format
    // Validate files before processing
    if (!files.id || !files.license || !files.proof) {
      throw new Error(
        'One or more files are missing. Please ensure all files are selected.'
      );
    }

    if (!files.id.name || !files.license.name || !files.proof.name) {
      throw new Error(
        'One or more files are invalid. Please re-select the files.'
      );
    }
    const fileData = await Promise.all(
      [files.id, files.license, files.proof].map(async (file, index) => {
        try {
          const base64Result = await fileToBase64(file);
          return {
            name: file.name,
            type: file.type,
            base64: base64Result,
          };
        } catch (error) {
          console.error(`[File ${index}] Error processing:`, error);
          throw new Error(
            `Failed to process file: ${file.name}. Please try selecting the file again.`
          );
        }
      })
    );
    fileData.forEach((fd, i) => {
    });

    //generate aes key and encrypt
    // Validate CryptoJS is available
    if (!CryptoJS || !CryptoJS.lib || !CryptoJS.enc || !CryptoJS.AES) {
      throw new Error('CryptoJS library is not properly loaded');
    }

    const aesKey = CryptoJS.lib.WordArray.random(32);
    if (!aesKey) {
      throw new Error('Failed to generate AES key');
    }

    const aesKeyHex = aesKey.toString(CryptoJS.enc.Hex);
    if (!aesKeyHex || aesKeyHex.length === 0) {
      throw new Error('Failed to convert AES key to hex');
    }
    let uploadResults: any = [];

    //JSON stringify each file object
    for (let i = 0; i < fileData.length; i++) {
      const file = fileData[i];
      const fileObject = {
        name: file.name,
        type: file.type,
        base64: file.base64,
      };
      const individualFile = JSON.stringify({
        file: fileObject,
        metadata: {
          ...metadata,
          patient: patientAddress,
          timestamp: new Date().toISOString(),
        },
      });
      // Validate inputs
      if (!individualFile || individualFile.length === 0) {
        throw new Error(`[Encryption ${i}] Individual file is empty`);
      }

      if (!aesKeyHex || aesKeyHex.length === 0) {
        throw new Error(`[Encryption ${i}] AES key is empty`);
      }

      // Encrypt the data directly with the hex string key
      let encrypted;
      try {
        encrypted = CryptoJS.AES.encrypt(individualFile, aesKeyHex).toString();

        if (!encrypted || encrypted.length === 0) {
          throw new Error('Encryption resulted in empty string');
        }
      } catch (error) {
        console.error(`[Encryption ${i}] Encryption failed:`, error);
        throw new Error(`Failed to encrypt file data: ${error}`);
      }

      //upload to pinata
      const uploadResponse = await fetch(
        `${API_URL}/api/upload/uploadToPinata`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            encryptedData: encrypted,
            metadata: {
              patient: patientAddress,
              role: metadata.role,
              timestamp: new Date().toISOString(),
            },
          }),
        }
      );

      if (!uploadResponse.ok) {
        throw new Error(
          `Error uploading to Pinata: ${uploadResponse.statusText}`
        );
      }

      const result = await uploadResponse.json();
      const cidOfResult = result.cid;
      uploadResults.push({ name: file.name, cid: cidOfResult });
    }
    // Encrypt AES key with each admin's RSA public key
    const encryptedKeys = await Promise.all(selectedAdmins.map(async (_, i) => {
      if (!adminPublicKeys[i]) {
        throw new Error(`Missing admin public key at index ${i}`);
      }

      const encryptedKey = await encryptWithPublicKey(aesKeyHex, adminPublicKeys[i]);
      return encryptedKey;
    }));
    const role_to_enum: Record<string, UserRole> = {
      healthcare: UserRole.HealthcareProvider,
      insurance: UserRole.Insurer,
      admin: UserRole.Admin,
    };

    const roleEnum = role_to_enum[metadata.role];
    if (roleEnum === undefined) {
      throw new Error(`Invalid role: ${metadata.role}`);
    }

    // companyName and doctorName are already passed as parameters from the caller
    // No need to overwrite them here
    const receipt = await requestRoleUpgrade(
      patientAddress,
      JSON.stringify(uploadResults),
      selectedAdmins,
      roleEnum,
      encryptedKeys,
      companyName,  
      doctorName
    );
    return {
      success: true,
      cid: uploadResults,
      txHash: receipt.transactionHash,
    };

    // const payload = JSON.stringify({
    //   files: fileData,
    //   metadata: {
    //     ...metadata,
    //     patient: patientAddress,
    //     timestamp: new Date().toISOString(),
    //   }
    // })
  } catch (error) {
    console.error('Submit role upgrade request failed', error);
    throw error;
  }
}

export async function encryptWithPublicKey(
  aesKey: string,
  adminPublicKey: string
): Promise<string> {
  // Use WebCrypto utility
  const { encryptAESKeyWithPublicKey } = await import('./webCryptoUtils');
  const encryptedKeyHex = await encryptAESKeyWithPublicKey(aesKey, adminPublicKey);
  return encryptedKeyHex;
}

export async function approveUpgrade(requestId: number, userToUpgrade: string, roleName: string) {
  try {
    const contract = await writeUpgradeContract();
    const tx = await contract.approveRequest(requestId, userToUpgrade, roleName);
    return tx.wait();
  } catch (error) {
    console.error('Failed to approve upgrade request: ', error);
    throw error;
  }
}

export async function rejectRequest(requestId: number) {
  try {
    const contract = await writeUpgradeContract();
    const tx = await contract.rejectRequest(requestId);
    return tx.wait();
  } catch (error) {
    console.error('Failed to reject upgrade request: ', error);
    throw error;
  }
}

export async function getEncryptedKey(requestId: number): Promise<string> {
  try {
    const contract = await writeUpgradeContract();

    // Debug: Check which contract we're using
    // Get the current caller address
    const provider = new ethers.providers.Web3Provider(window.ethereum as any);
    const signer = await provider.getSigner();
    const callerAddress = await signer.getAddress();
    // Check if the request exists
    const request = await contract.requests(requestId);
    const adminAddresses = await contract.getRequestAdminAddresses(requestId);
    // Validate request exists
    if (!request || request.requestId.toString() === '0') {
      throw new Error(`Request with ID ${requestId} does not exist`);
    }
    // Try to get the encrypted key directly
    let key;
    try {
      key = await contract.getEncryptedKeyForCaller(requestId);
    } catch (error) {
      // Try as general admin if not specifically authorized
      key = await contract.getEncryptedKeyForAdmin(requestId, callerAddress);
    }
    // Check if key is valid
    if (!key || key === '0x') {
      if (!request.adminAddresses || request.adminAddresses.length === 0) {
        throw new Error(`Smart contract bug detected: Request ${requestId} has undefined adminAddresses field.
        
        This indicates the request was created with a buggy contract version.
        
        SOLUTIONS:
        1. Create a new request with the fixed contract
        2. Update your environment variables to point to the new contract
        3. Redeploy the smart contract if needed
        
        Current status:
        - Request exists: ✅
        - adminAddresses field: ❌ (undefined - smart contract bug)
        - Encrypted key stored: ❌ (cannot be retrieved due to bug)
        
        Please create a new request to resolve this issue.`);
      }

      throw new Error(`No encrypted key found for caller ${callerAddress} in request ${requestId}.
      
      This could mean:
      1. You are not authorized to access this request
      2. The encrypted key was not properly stored
      3. You are not one of the assigned admins for this request
      
      Debugging info:
      - Current caller: ${callerAddress}
      - Request adminAddresses: ${request.adminAddresses}
      - Is caller in adminAddresses: ${
        request.adminAddresses?.includes(callerAddress) || false
      }`);
    }

    return key;
  } catch (error) {
    console.error('Failed to get encrypted key: ', error);
    throw error;
  }
}

export async function getAdmins(): Promise<string[]> {
  try {
    const contract = await readUpgradeContract();
    const admins = await contract.getAdmins();
    return admins;
  } catch (error) {
    console.error('Error returning admin list: ', error);
    throw error;
  }
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('File is null or undefined'));
      return;
    }

    if (!file.name || file.size === 0) {
      reject(new Error('File is invalid or empty'));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      if (!base64) {
        reject(
          new Error(`Failed to read file: ${file.name} - result is empty`)
        );
        return;
      }
      const parts = base64.split(',');
      if (parts.length < 2) {
        reject(
          new Error(
            `Failed to parse file: ${file.name} - invalid data URL format`
          )
        );
        return;
      }
      resolve(parts[1]); // Remove data:image/png;base64, prefix
    };
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      reject(new Error(`Failed to read file: ${file.name}`));
    };
    reader.readAsDataURL(file);
  });
}

export async function getAdminPublicKey(adminAddress: string) {
  try {
    const contract = await readUpgradeContract();
    const tx = await contract.getAdminPublicKey(adminAddress);
    return tx;
  } catch (error) {
    throw error;
  }
}

export async function getProviders() {
  try {
    const contract = await readUpgradeContract();
    const result = await contract.getAllProviders();
    const providers = result[0].map((address: string, index: number) => ({
      address, 
      name: result[1][index]
    }));
    return providers;
  } catch (error) {
    console.error('Error fetching providers:', error);
    return [];
  }
}

// ==========================================
// CLAIMS INTEGRATION
// ==========================================

export async function getInsurers() {
  try {
    const contract = await readUpgradeContract();
    const result = await contract.getAllInsurers();
    // result is [addresses[], names[]]
    const insurers = result[0].map((address: string, index: number) => ({
      address,
      name: result[1][index]
    }));
    return insurers;
  } catch (error) {
    console.error('Error fetching insurers:', error);
    return [];
  }
}

export async function submitClaim(
  insurerAddress: string,
  recordId: string,
  requestedAmount: number,
  claimType: string,
  description: string,
  files: { photos: File[], documents: File[] }
) {
  try {
    // 1. Get Insurer's Public Key
    const insurerPublicKey = await getUserPublicKey(insurerAddress);
    if (!insurerPublicKey) {
      throw new Error('Selected insurer does not have a registered public key for encryption.');
    }

    // 2. Generate AES Key
    const aesKey = CryptoJS.lib.WordArray.random(32);
    const aesKeyHex = aesKey.toString(CryptoJS.enc.Hex);
    // 3. Process and Encrypt Files
    const allFiles = [...files.photos, ...files.documents];
    const encryptedFiles = [];

    for (const file of allFiles) {
      const base64 = await fileToBase64(file);
      const fileData = JSON.stringify({
        name: file.name,
        type: file.type,
        content: base64
      });
      
      const encryptedContent = CryptoJS.AES.encrypt(fileData, aesKeyHex).toString();
      encryptedFiles.push({
        name: file.name,
        type: file.type,
        category: files.photos.includes(file) ? 'photo' : 'document',
        encryptedContent
      });
    }

    // 4. Encrypt AES Key with Insurer's Public Key
    const encryptedAesKey = await encryptAESKeyWithPublicKey(aesKeyHex, insurerPublicKey);

    // 5. Upload to IPFS (Pinata)
    // We bundle everything into a single JSON for simplicity in this demo, 
    // but in production you might want individual pins or a directory.
    const payload = {
      files: encryptedFiles,
      encryptedAesKey: encryptedAesKey, // Store key with the data
      metadata: {
        description,
        claimType,
        timestamp: Date.now()
      }
    };

    const uploadResponse = await fetch(`${API_URL}/api/upload/uploadToPinata`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        encryptedData: JSON.stringify(payload), // The API expects encryptedData field, but here we are sending our 
        metadata: {
          type: 'claim',
          recordId
        }
      })
    });

    // RE-READING submitRoleUpgradeRequest:
    // It sends: { encryptedData: encrypted, metadata: ... }
    // And gets back { cid }.
    // So we should put our huge JSON string into `encryptedData`.
    
    const uploadResult = await uploadResponse.json();
    if (!uploadResult.cid) throw new Error('Failed to upload claim data to IPFS');
    const cid = uploadResult.cid;
    // 6. Submit to Blockchain
    const contract = await writeClaimRequestContract();
    const tx = await contract.submitClaim(
      insurerAddress,
      recordId,
      requestedAmount,
      claimType,
      description,
      cid
    );
    
    return tx;
  } catch (error) {
    console.error('Error submitting claim:', error);
    throw error;
  }
}

export async function getClaimsByInsurer(insurerAddress: string) {
  try {
    const contract = await readClaimRequestContract();
    const claimIds = await contract.getClaimsByInsurer(insurerAddress);
    // Convert BigNumbers to numbers
    return claimIds.map((id: any) => id.toNumber());
  } catch (error) {
    console.error('Error fetching insurer claims:', error);
    return [];
  }
}

export async function getClaimsByPatient(patientAddress: string) {
  try {
    const contract = await readClaimRequestContract();
    const claimIds = await contract.getClaimsByPatient(patientAddress);
    return claimIds.map((id: any) => id.toNumber());
  } catch (error) {
    console.error('Error fetching patient claims:', error);
    return [];
  }
}

export async function getClaimDetails(claimIds: number[]) {
  try {
    if (claimIds.length === 0) return [];
    const contract = await readClaimRequestContract();
    const claims = await contract.getClaimDetails(claimIds);
    return claims;
  } catch (error) {
    console.error('Error fetching claim details:', error);
    return [];
  }
}

export async function getInsurerStatistics(insurerAddress: string) {
  try {
    const contract = await readClaimRequestContract();
    const stats = await contract.getInsurerStatistics(insurerAddress);
    return stats;
  } catch (error) {
    console.error('Error fetching statistics:', error);
    return null;
  }
}

export async function approveClaim(claimId: number, approvedAmount: number, notes: string) {
  try {
    const contract = await writeClaimRequestContract();
    const tx = await contract.approveClaim(claimId, approvedAmount, notes);
    return await tx.wait();
  } catch (error) {
    console.error('Error approving claim:', error);
    throw error;
  }
}

export async function rejectClaim(claimId: number, reason: string) {
  try {
    const contract = await writeClaimRequestContract();
    const tx = await contract.rejectClaim(claimId, reason);
    return await tx.wait();
  } catch (error) {
    console.error('Error rejecting claim:', error);
    throw error;
  }
}

export async function getClaimFiles(cid: string, insurerAddress: string) {
  try {
    // 1. Fetch from IPFS
    // Use backend proxy to fetch from IPFS (handles private gateway/signed URLs)
    const response = await fetch(`${API_URL}/api/upload/fetchFromIPFS/${cid}`);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`IPFS fetch failed: ${response.status} ${response.statusText} - ${text}`);
    }
    const data = await response.json();
    
    let payload;
    if (data.encryptedData) {
       payload = JSON.parse(data.encryptedData);
    } else {
       // Maybe it was pinned directly? Fallback
       payload = data;
    }

    if (!payload.encryptedAesKey || !payload.files) {
        console.warn('Invalid claim data format', payload);
        return { photos: [], documents: [] };
    }

    // 2. Decrypt AES Key
    // decryptAESKey fetches the private key internally using the address
    const aesKeyHex = await decryptAESKey(payload.encryptedAesKey, insurerAddress);
    
    // 3. Decrypt Files
    const decryptedFiles = payload.files.map((file: any) => {
      const decryptedBytes = CryptoJS.AES.decrypt(file.encryptedContent, aesKeyHex);
      const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);
      const fileObj = JSON.parse(decryptedString);
      
      return {
        name: fileObj.name,
        type: fileObj.type,
        content: fileObj.content, // Base64
        category: file.category
      };
    });

    return {
      photos: decryptedFiles.filter((f: any) => f.category === 'photo'),
      documents: decryptedFiles.filter((f: any) => f.category === 'document')
    };

  } catch (error) {
    console.error('Error fetching/decrypting claim files:', error);
    throw error;
  }
}

export async function getPendingRequestByUser(userAddress: string) {
  try {
    const contract = await readUpgradeContract();
    const tx = await contract.getPendingRequestByUser(userAddress);
    return tx;
  } catch (error) {
    throw error;
  }
}

export async function getPendingRequestsByAdmin(adminAddress: string) {
  try {
    const contract = await readUpgradeContract();
    const tx = await contract.getPendingRequestsByAdmin(adminAddress);
    return tx;
  } catch (error) {
    throw error;
  }
}

export async function getAcknowledgedRequestsByAdmin(adminAddress: string) {
  try {
    const contract = await readUpgradeContract();
    const tx = await contract.getAcknowledgedRequestsByAdmin(adminAddress);
    return tx;
  } catch (error) {
    throw error;
  }
}

export async function getAllUsers() {
  try {
    const contract = await readUserManagementContract();
    const tx = await contract.getAllUsers();
    return tx;
  } catch (error) {
    throw error;
  }
}

export async function addMedicalRecord(
  patientAddress: string,
  medicalRecordID: string,
  cid: string,
  encryptedKeyForPatient: string,
  recordType: string
) {
  try {
    const contract = await writeMedicalRecordsContract();
    const tx = await contract.addMedicalRecord(
      patientAddress,
      medicalRecordID,
      cid,
      encryptedKeyForPatient,
      recordType
    );
    return await tx.wait();
  } catch (error) {
    throw error;
  }
}

export async function getPatientRecordIDs(patientAddress: string) {
  try {
    const contract = await readMedicalRecordsContract();
    const tx = await contract.getPatientRecordIDs(patientAddress);
    return tx;
  } catch (error) {
    console.error('Failed to get patient records', error);
    throw error;
  }
}

export async function getMedicalRecord(
  patientAddress: string,
  medicalRecordID: string
) {
  try {
    const contract = await readMedicalRecordsContract();
    const record = await contract.getMedicalRecord(
      patientAddress,
      medicalRecordID
    );
    return record;
  } catch (error) {
    console.error('Failed to get medical record details', error);
    throw error;
  }
}

export async function getEncryptedKeyForPatient(
  medicalRecordID: string,
  patientAddress: string
) {
  try {
    const contract = await writeMedicalRecordsContract();
    const encryptedKey = await contract.getEncryptedKeyForPatient(
      medicalRecordID,
      patientAddress
    );
    return encryptedKey;
  } catch (error) {
    console.error("❌ Failed to get patient's encrypted key", error);
    throw error;
  }
}

// Get encrypted key for authorized users (patients or doctors with access)
export async function getEncryptedKeyForRecord(
  medicalRecordID: string,
  patientAddress: string
) {
  try {
    const contract = await writeMedicalRecordsContract();
    const encryptedKey = await contract.getEncryptedKey(
      medicalRecordID,
      patientAddress,
      ACCESS_CONTROL_ADDRESS
    );
    return encryptedKey;
  } catch (error) {
    console.error('Failed to get encrypted key for record', error);
    throw error;
  }
}

export async function grantAccess(
  patientAddress: string,
  walletAddress: string,
  medicalRecordID: string
) {
  try {
    const contract = await writeAccessControlContract();
    const tx = await contract.grantAccess(
      patientAddress,
      walletAddress,
      medicalRecordID
    );
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Failed to grant access to other users', error);
    throw error;
  }
}

export async function storeEncryptedAESKey(
  patientAddress: string,
  recipient: string,
  recordId: string,
  encryptedAESKeyHex: string
) {
  try {
    const contract = await writeAccessControlContract();

    // Ensure it starts with 0x
    const hex = encryptedAESKeyHex.startsWith('0x')
      ? encryptedAESKeyHex
      : '0x' + encryptedAESKeyHex;
    const tx = await contract.storeEncryptedAESKey(
      patientAddress,
      recipient,
      recordId,
      hex
    );
    const receipt = await tx.wait();
    return receipt;
  } catch (error) {
    console.error('❌ Failed to store encrypted AES key:', error);
    throw error;
  }
}

export async function getSharedRecords(user: string) {
  try {
    const contract = await readAccessControlContract();
    const sharedRecordInfo = await contract.getSharedRecords(user);
    return sharedRecordInfo;
  } catch (error) {
    console.error('Failed to get shared records', error);
    throw error;
  }
}

export async function checkWhoHasAccess(recordId: string) {
  try {
    const contract = await writeAccessControlContract();
    const accessList = await contract.checkWhoHasAccess(recordId);
    return accessList;
  } catch (error) {
    console.error('Failed to check who has access', error);
    throw error;
  }
}
export async function getSharedRecordsWithDetails(userAddress: string) {
  try {
    // NEW: Verify unified private key exists FIRST (IndexedDB)
    const { hasPrivateKey } = await import('./keyStorage');
    const hasUserKey = await hasPrivateKey('userPrivateKey', userAddress);
    
    if (!hasUserKey) {
      console.warn('⚠️ No user private key found in IndexedDB');
      throw new Error('No private key available. Please generate keys first.');
    }

    // 1. Get list of shared records
    const sharedRecordInfos = await getSharedRecords(userAddress);
    if (sharedRecordInfos.length === 0) {
      return [];
    }

    // 2. For each shared record, fetch the full details
    const fullRecords = await Promise.all(
      sharedRecordInfos.map(async (info: any) => {
        try {
          const record = await fetchAndDecryptSharedRecord(
            info.patientAddress,
            info.recordId,
            userAddress
          );

          return {
            ...record,
            patientAddress: info.patientAddress,
            sharedTimestamp: info.timestamp,
          };
        } catch (error: any) {
          console.error(`❌ Error fetching record ${info.recordId}:`, error);
          
          // Return placeholder so it shows up in UI with error state
          return {
            recordId: info.recordId,
            patientAddress: info.patientAddress,
            sharedTimestamp: info.timestamp,
            file: {
              name: 'Decryption Failed',
              type: 'error',
              base64: ''
            },
            metadata: {
              recordType: 'Error',
              timestamp: new Date().toISOString(),
              error: error.message || 'Failed to decrypt - likely key mismatch'
            }
          };
        }
      })
    );

    const validRecords = fullRecords.filter((r) => r !== null);
    return fullRecords; // Return all records, including errors
  } catch (error) {
    console.error('❌ Error getting shared records with details:', error);
    throw error;
  }
}

export async function fetchAndDecryptSharedRecord(
  patientAddress: string,
  recordId: string,
  recipientAddress: string
) {
  try {
    // 1. Get the medical record metadata from blockchain
    const record = await getMedicalRecord(patientAddress, recordId);
    const contract = await readAccessControlContract();

    // 2. Get encrypted AES key for this recipient
    const encryptedAESKey = await contract.getEncryptedAESKey(
      patientAddress,
      recipientAddress,
      recordId
    );
    if (!encryptedAESKey || encryptedAESKey === '0x') {
      throw new Error('No encrypted key found for this record. Access might not have been granted correctly.');
    }

    // NEW: Decrypt AES key with unified user private key
    const { hasPrivateKey } = await import('./keyStorage');
    const hasUserKey = await hasPrivateKey('userPrivateKey', recipientAddress);
    if (!hasUserKey) {
      throw new Error('No user private key found. Please initialize keys in your dashboard.');
    }

    if (!encryptedAESKey || encryptedAESKey === '0x' || encryptedAESKey === '0x0') {
      throw new Error(`Invalid encrypted AES key received from contract: "${encryptedAESKey}". The key may not have been stored correctly when the patient shared the record.`);
    }

    let aesKey: string | null = null;
    let decryptionError: any = null;

    try {
      aesKey = await decryptAESKey(encryptedAESKey, recipientAddress); // Unified: No keyId needed
    } catch (err) {
      decryptionError = err;
    }

    if (!aesKey) {
      throw new Error(
        `Failed to decrypt AES key. Ensure your keys are registered and match the shared public key. Last error: ${
          decryptionError?.message || 'Unknown error'
        }`
      );
    }

    // 4. Fetch encrypted document from IPFS
    const response = await fetch(
      `${API_URL}/api/upload/fetchFromIPFS/${record.cid}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
    }

    const encryptedData = await response.text();
    // 5. Decrypt the document with AES key
    const decrypted = CryptoJS.AES.decrypt(encryptedData, aesKey).toString(
      CryptoJS.enc.Utf8
    );

    if (!decrypted) {
      throw new Error('Decryption failed - empty result');
    }

    const payload = JSON.parse(decrypted);
    // 6. Return the full decrypted record with proper structure
    return {
      recordId: record.medicalRecordID,
      cid: record.cid,
      patientAddress: patientAddress, // ← Ensure this is included!
      file: {
        name: payload.file?.fileName || payload.file?.name || recordId,
        type:
          payload.file?.fileType ||
          payload.file?.type ||
          'application/octet-stream',
        base64: payload.file?.base64 || '',
      },
      metadata: {
        recordType: payload.metadata?.recordType || 'Unknown',
        timestamp: payload.metadata?.timestamp || new Date().toISOString(),
        ...payload.metadata,
      },
    };
  } catch (error) {
    console.error('❌ Error fetching and decrypting shared record:', error);
    throw error;
  }
}

export async function getCreatedRecords(doctorAddress: string) {
  try {
    const contract = await writeMedicalRecordsContract();
    const createdRecords = await contract.getCreatedRecords(doctorAddress);
    return createdRecords;
  } catch (error) {
    console.error('Failed to fetch created records by the doctor');
    throw error;
  }
}


export async function verifyRSAKeyPair(publicKey: string): Promise<boolean> {
  try {
    // Generate a valid hex string (32 chars / 16 bytes) to mimic an AES key
    const testValue = CryptoJS.lib.WordArray.random(16).toString();

    const encrypted = await encryptWithPublicKey(testValue, publicKey);
    const decrypted = await decryptAESKey(encrypted);

    return decrypted === testValue;
  } catch (err) {
    console.error("RSA keypair verification failed:", err);
    return false;
  }
}

export async function revokeAccess(
  patientAddress: string,
  walletAddress: string,
  medicalRecordID: string
){
  try {
    const contract = await writeAccessControlContract();
    const tx = await contract.revokeAccess(
      patientAddress,
      walletAddress,
      medicalRecordID
    );
    await tx.wait();
    return tx;
  } catch (error) {
    console.error('Failed to grant access to other users', error);
    throw error;
  }
}

export async function getAllPatientAddresses(): Promise<string[]> {
  try {
    const contract = await readUserManagementContract();
    const patientAddresses = await contract.getAllPatientAddresses();
    return patientAddresses;
  }catch(error){
    console.error('Failed to get all patient addresses', error);
    throw error;
  }
}

/**
 * Fetch notifications for a user based on their role
 * @param userAddress - The wallet address of the user
 * @param role - The role of the user (Admin, Patient, HealthcareProvider, Insurer)
 * @returns Array of notifications
 */
export async function getNotificationsByUser(
  userAddress: string,
  role: UserRole
): Promise<Notification[]> {
  const notifications: Notification[] = [];

  try {
    if (role === UserRole.Admin) {
      // Admin: Get pending role upgrade requests
      const pendingRequests = await getPendingRequestsByAdmin(userAddress);
      
      for (let i = 0; i < pendingRequests.length; i++) {
        const req = pendingRequests[i];
        const roleNames: Record<number, string> = {
          [UserRole.HealthcareProvider]: "Healthcare Provider",
          [UserRole.Insurer]: "Insurer",
          [UserRole.Admin]: "Admin"
        };
        
        notifications.push({
          id: `admin-${req.requestId.toString()}`,
          type: NotificationType.PendingAdminRequest,
          message: `User ${req.requester.slice(0, 6)}...${req.requester.slice(-4)} requested ${roleNames[req.newRole] || "Unknown"} role upgrade`,
          createdAt: Number(req.timestamp) * 1000, // Convert to milliseconds
          metadata: {
            requestId: req.requestId.toString(),
            requester: req.requester,
            newRole: req.newRole
          }
        });
      }
    } else if (role === UserRole.Patient) {
      // Patient: Get medical records created for them and shared with them
      try {
        const recordIds = await getPatientRecordIDs(userAddress);
        
        // Get details for each record to show creation notifications
        for (const recordId of recordIds) {
          try {
            const record = await getMedicalRecord(userAddress, recordId);
            // Handle timestamp - use createdAt field from medical record
            let timestamp = Date.now();
            if (record.createdAt) {
              const timestampNum = Number(record.createdAt);
              if (!isNaN(timestampNum) && timestampNum > 0) {
                // If timestamp is in seconds (typical blockchain timestamp), convert to milliseconds
                timestamp = timestampNum > 10000000000 ? timestampNum : timestampNum * 1000;
              }
            }
            
            notifications.push({
              id: `patient-record-${recordId}`,
              type: NotificationType.MedicalRecordCreated,
              message: `A new ${record.recordType || "medical"} record was created for you`,
              createdAt: timestamp,
              metadata: {
                recordId: recordId,
                recordType: record.recordType
              }
            });
          } catch (error) {
            console.error(`Error fetching record ${recordId}:`, error);
          }
        }
      } catch (error) {
        console.error("Error fetching patient records:", error);
      }

      // Get shared records
      try {
        const sharedRecords = await getSharedRecords(userAddress);
        for (const shared of sharedRecords) {
          // Handle timestamp - use current time if timestamp is invalid
          let timestamp = Date.now();
          if (shared.timestamp) {
            const timestampNum = Number(shared.timestamp);
            if (!isNaN(timestampNum) && timestampNum > 0) {
              // If timestamp is in seconds (typical blockchain timestamp), convert to milliseconds
              timestamp = timestampNum > 10000000000 ? timestampNum : timestampNum * 1000;
            }
          }
          
          notifications.push({
            id: `patient-shared-${shared.recordId}`,
            type: NotificationType.MedicalRecordShared,
            message: `A medical record was shared with you by ${shared.patientAddress.slice(0, 6)}...${shared.patientAddress.slice(-4)}`,
            createdAt: timestamp,
            metadata: {
              recordId: shared.recordId,
              patientAddress: shared.patientAddress
            }
          });
        }
      } catch (error) {
        console.error("Error fetching shared records:", error);
      }

    } else if (role === UserRole.HealthcareProvider) {
      // Doctor: Get medical records shared with them
      try {
        const sharedRecords = await getSharedRecords(userAddress);
        
        for (const shared of sharedRecords) {
          // Handle timestamp - use current time if timestamp is invalid
          let timestamp = Date.now();
          if (shared.timestamp) {
            const timestampNum = Number(shared.timestamp);
            if (!isNaN(timestampNum) && timestampNum > 0) {
              timestamp = timestampNum > 10000000000 ? timestampNum : timestampNum * 1000;
            }
          }
          
          notifications.push({
            id: `doctor-shared-${shared.recordId}`,
            type: NotificationType.MedicalRecordShared,
            message: `Patient ${shared.patientAddress.slice(0, 6)}...${shared.patientAddress.slice(-4)} shared a medical record with you`,
            createdAt: timestamp,
            metadata: {
              recordId: shared.recordId,
              patientAddress: shared.patientAddress
            }
          });
        }
      } catch (error) {
        console.error("Error fetching shared records for doctor:", error);
      }
    } else if (role === UserRole.Insurer) {
      // Insurer: Get pending claim requests
      try {
        const claimIds = await getClaimsByInsurer(userAddress);
        
        for (const claimId of claimIds) {
          try {
            const claims = await getClaimDetails([claimId]);
            if (claims && claims.length > 0) {
              const claim = claims[0];

              if (!claim) {
                console.warn(`Claim ${claimId} has no data`);
                continue;
              }
              // Only show pending claims (status 0)
              if (claim.status === 0) {
                // Handle timestamp - use current time if timestamp is invalid
                let timestamp = Date.now();
                if (claim.submittedAt) {
                  const timestampNum = Number(claim.submittedAt);
                  if (!isNaN(timestampNum) && timestampNum > 0) {
                    timestamp = timestampNum > 10000000000 ? timestampNum : timestampNum * 1000;
                  }
                }
                
                notifications.push({
                  id: `insurer-claim-${claimId}`,
                  type: NotificationType.PendingInsurerRequest,
                  message: `Claim #${claimId} from ${claim.patientAddress.slice(0, 6)}...${claim.patientAddress.slice(-4)} requires your review`,
                  createdAt: timestamp,
                  metadata: {
                    claimId: claimId,
                    patient: claim.patientAddress,
                    amount: claim.requestedAmount
                  }
                });
              }
            }
          } catch (error) {
            console.error(`Error fetching claim ${claimId}:`, error);
          }
        }
      } catch (error) {
        console.error("Error fetching insurer claims:", error);
      }
    }

    // Sort notifications by timestamp (newest first)
    notifications.sort((a, b) => b.createdAt - a.createdAt);

    return notifications;
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}
