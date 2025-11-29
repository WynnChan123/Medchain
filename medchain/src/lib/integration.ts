//integration.ts
import { ethers } from 'ethers';
import { UserRole } from '../../utils/userRole';
import CryptoJS from 'crypto-js';
import NodeRSA from 'node-rsa';
import { read } from 'node:fs';
import { decryptAESKey } from './decryption';
import { getPrivateKey } from './keyStorage';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SMART_CONTRACT_ADDRESS!;
const UPGRADE_ADDRESS = process.env.NEXT_PUBLIC_ROLE_UPGRADE_ADDRESS!;
const USER_MANAGEMENT_ADDRESS = process.env.NEXT_PUBLIC_USER_MANAGEMENT!;
const MEDICAL_RECORDS_ADDRESS = process.env.NEXT_PUBLIC_MEDICAL_RECORDS!;
const ACCESS_CONTROL_ADDRESS = process.env.NEXT_PUBLIC_ACCESS_CONTROL!;

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
            console.log(`✅ Using cached ABI for ${address}`);
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
      `http://localhost:8080/api/etherscan/getABI/${address}`
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
      console.log(`💾 Cached ABI for ${address} in localStorage`);
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

export async function registerUser(
  wallet: string,
  encryptedId: string,
  role: number
) {
  try {
    const contract = await readUserManagementContract();

    console.log('Contract signer:', await contract.signer.getAddress());
    console.log('Wallet param:', wallet);
    console.log('MetaMask signer address:', await contract.signer.getAddress());
    console.log(
      'Same? ',
      (await contract.signer.getAddress()).toLowerCase() ===
        wallet.toLowerCase()
    );

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
  encryptedKeys: string[]
) {
  try {
    const contract = await writeUpgradeContract();
    const tx = await contract.submitUpgradeRequest(
      address,
      cid,
      newRole,
      admins,
      encryptedKeys
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

export async function submitRoleUpgradeRequest(
  patientAddress: string,
  files: { id: File; license: File; proof: File },
  metadata: {
    role: string;
    organization: string;
    additionalInfo: string;
  },
  selectedAdmins: string[],
  adminPublicKeys: string[]
) {
  try {
    //Take each file from the user's computer
    //Read each file and convert it to base64 text format
    console.log('=== DEBUGGING submitRoleUpgradeRequest ===');
    console.log('patientAddress:', patientAddress);
    console.log('selectedAdmins:', selectedAdmins);
    console.log('selectedAdmins length:', selectedAdmins?.length);
    console.log('adminPublicKeys:', adminPublicKeys);
    console.log('adminPublicKeys length:', adminPublicKeys?.length);
    console.log('metadata:', metadata);

    // Validate files before processing
    console.log('=== [CHECKPOINT 1] Files validation ===');
    console.log('files.id:', files.id);
    console.log('files.license:', files.license);
    console.log('files.proof:', files.proof);

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

    console.log('=== [CHECKPOINT 2] Starting file processing ===');
    const fileData = await Promise.all(
      [files.id, files.license, files.proof].map(async (file, index) => {
        try {
          console.log(
            `[File ${index}] Processing:`,
            file.name,
            file.type,
            `Size: ${file.size} bytes`
          );
          const base64Result = await fileToBase64(file);
          console.log(
            `[File ${index}] Successfully converted to base64, length: ${base64Result.length}`
          );
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

    console.log('=== [CHECKPOINT 3] File processing complete ===');
    console.log('FileData array length:', fileData.length);
    fileData.forEach((fd, i) => {
      console.log(
        `FileData[${i}]:`,
        fd.name,
        fd.type,
        `base64 length: ${fd.base64?.length || 0}`
      );
    });

    //generate aes key and encrypt
    console.log('=== [CHECKPOINT 4] Generating AES key ===');

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

    console.log('AES KEY(plain)', aesKeyHex);
    console.log('AES KEY length:', aesKeyHex.length);
    let uploadResults: any = [];

    //JSON stringify each file object
    console.log('=== [CHECKPOINT 5] Starting encryption loop ===');
    for (let i = 0; i < fileData.length; i++) {
      const file = fileData[i];
      console.log(`[Encryption ${i}] Processing file:`, file.name);

      const fileObject = {
        name: file.name,
        type: file.type,
        base64: file.base64,
      };

      console.log(`[Encryption ${i}] Creating file object...`);
      const individualFile = JSON.stringify({
        file: fileObject,
        metadata: {
          ...metadata,
          patient: patientAddress,
          timestamp: new Date().toISOString(),
        },
      });

      console.log(`[Encryption ${i}] Encrypting with AES...`);
      console.log(
        `[Encryption ${i}] AES Key:`,
        aesKeyHex.substring(0, 16) + '...'
      );
      console.log(
        `[Encryption ${i}] Individual File length:`,
        individualFile.length
      );

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
        console.log(`[Encryption ${i}] Starting encryption...`);
        encrypted = CryptoJS.AES.encrypt(individualFile, aesKeyHex).toString();

        if (!encrypted || encrypted.length === 0) {
          throw new Error('Encryption resulted in empty string');
        }

        console.log(
          `[Encryption ${i}] Encryption successful, encrypted length:`,
          encrypted.length
        );
      } catch (error) {
        console.error(`[Encryption ${i}] Encryption failed:`, error);
        throw new Error(`Failed to encrypt file data: ${error}`);
      }

      //upload to pinata
      console.log(`[Encryption ${i}] Uploading to Pinata...`);
      const uploadResponse = await fetch(
        'http://localhost:8080/api/upload/uploadToPinata',
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

      console.log(`[Encryption ${i}] CID returned:`, cidOfResult);

      uploadResults.push({ name: file.name, cid: cidOfResult });
    }

    console.log('=== [CHECKPOINT 6] All files uploaded ===');
    console.log('Upload results:', uploadResults);

    // Encrypt AES key with each admin's RSA public key
    console.log('=== [CHECKPOINT 7] Encrypting AES keys for admins ===');
    console.log('Admin public keys:', adminPublicKeys);
    console.log('Number of admins:', selectedAdmins.length);

    const encryptedKeys = await Promise.all(selectedAdmins.map(async (_, i) => {
      console.log(`[Admin ${i}] Encrypting AES key...`);
      console.log(
        `[Admin ${i}] Public Key:`,
        adminPublicKeys[i]?.substring(0, 50) + '...'
      );

      if (!adminPublicKeys[i]) {
        throw new Error(`Missing admin public key at index ${i}`);
      }

      const encryptedKey = await encryptWithPublicKey(aesKeyHex, adminPublicKeys[i]);
      console.log(
        `[Admin ${i}] Encrypted AES Key (hex):`,
        encryptedKey.substring(0, 20) + '...'
      );
      return encryptedKey;
    }));
    console.log('=== [CHECKPOINT 8] All AES keys encrypted ===');
    console.log('Encrypted keys count:', encryptedKeys.length);

    console.log('=== [CHECKPOINT 9] Preparing role upgrade submission ===');
    const role_to_enum: Record<string, UserRole> = {
      healthcare: UserRole.HealthcareProvider,
      insurance: UserRole.Insurer,
      admin: UserRole.Admin,
    };

    const roleEnum = role_to_enum[metadata.role];
    if (roleEnum === undefined) {
      throw new Error(`Invalid role: ${metadata.role}`);
    }

    console.log('Role enum:', roleEnum);
    console.log('Submitting to blockchain...');

    const receipt = await requestRoleUpgrade(
      patientAddress,
      JSON.stringify(uploadResults),
      selectedAdmins,
      roleEnum,
      encryptedKeys
    );

    console.log(
      '=== [CHECKPOINT 10] Role upgrade request submitted successfully ==='
    );
    console.log('Transaction hash:', receipt.transactionHash);

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
  console.log('🔐 encryptWithPublicKey called (WebCrypto)');
  console.log('AES Key to encrypt:', aesKey);
  console.log('Public key length:', adminPublicKey.length);
  
  // Use WebCrypto utility
  const { encryptAESKeyWithPublicKey } = await import('./webCryptoUtils');
  const encryptedKeyHex = await encryptAESKeyWithPublicKey(aesKey, adminPublicKey);

  console.log('Encrypted Key Hex:', encryptedKeyHex);
  return encryptedKeyHex;
}

export async function approveUpgrade(requestId: number, userToUpgrade: string) {
  try {
    const contract = await writeUpgradeContract();
    const tx = await contract.approveRequest(requestId, userToUpgrade);
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
    console.log('Contract address being used:', contract.address);
    console.log(
      'Environment variable UPGRADE_ADDRESS:',
      process.env.NEXT_PUBLIC_ROLE_UPGRADE_ADDRESS
    );

    // Get the current caller address
    const provider = new ethers.providers.Web3Provider(window.ethereum as any);
    const signer = await provider.getSigner();
    const callerAddress = await signer.getAddress();
    console.log('Current caller address:', callerAddress);

    // Check if the request exists
    const request = await contract.requests(requestId);
    const adminAddresses = await contract.getRequestAdminAddresses(requestId);
    console.log('Full request object:', request);
    console.log('Request object length:', Object.keys(request).length);
    console.log('Request array length:', request.length);
    console.log('Admins', adminAddresses);

    // Validate request exists
    if (!request || request.requestId.toString() === '0') {
      throw new Error(`Request with ID ${requestId} does not exist`);
    }

    console.log('Request details:', {
      requestId: request.requestId.toString(),
      requester: request.requester,
      isProcessed: request.isProcessed,
      isApproved: request.isApproved,
      adminAddresses: adminAddresses,
    });

    // Try to get the encrypted key directly
    console.log('Attempting to get encrypted key...');
    let key;
    try {
      key = await contract.getEncryptedKeyForCaller(requestId);
    } catch (error) {
      console.log(
        'Failed to get key as authorized admin, trying as general admin...'
      );
      // Try as general admin if not specifically authorized
      key = await contract.getEncryptedKeyForAdmin(requestId, callerAddress);
    }
    console.log('Raw key from contract:', key);

    // Check if key is valid
    if (!key || key === '0x') {
      console.log(
        'No encrypted key found - checking if adminAddresses is undefined...'
      );

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
    console.log("Failed to get admin's public key", error);
    throw error;
  }
}

export async function getPendingRequestByUser(patientAddress: string) {
  try {
    const contract = await readUpgradeContract();
    const tx = await contract.getPendingRequestByUser(patientAddress);
    return tx;
  } catch (error) {
    console.log("Failed to return the user's request", error);
    throw error;
  }
}

export async function getPendingRequestsByAdmin(adminAddress: string) {
  try {
    const contract = await readUpgradeContract();
    const tx = await contract.getPendingRequestsByAdmin(adminAddress);
    return tx;
  } catch (error) {
    console.log('Failed to return the pending requests for admin', error);
    throw error;
  }
}

export async function getAcknowledgedRequestsByAdmin(adminAddress: string) {
  try {
    const contract = await readUpgradeContract();
    const tx = await contract.getAcknowledgedRequestsByAdmin(adminAddress);
    return tx;
  } catch (error) {
    console.log('Failed to return the pending requests for admin', error);
    throw error;
  }
}

export async function getAllUsers() {
  try {
    const contract = await readUserManagementContract();
    const tx = await contract.getAllUsers();
    return tx;
  } catch (error) {
    console.log('Failed to return all users', error);
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
    console.log('Failed to add medical record', error);
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
    console.log('🔍 getEncryptedKeyForPatient called with:', {
      medicalRecordID,
      patientAddress,
    });

    const contract = await writeMedicalRecordsContract();

    console.log('📝 Contract address:', contract.address);
    console.log('📝 Signer address:', await contract.signer.getAddress());

    const encryptedKey = await contract.getEncryptedKeyForPatient(
      medicalRecordID,
      patientAddress
    );

    console.log('🔑 Encrypted key returned:', {
      value: encryptedKey,
      type: typeof encryptedKey,
      length: encryptedKey?.length,
      isNull: encryptedKey === null,
      isEmpty: encryptedKey === '0x' || encryptedKey === '',
    });

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
    console.log('💾 storeEncryptedAESKey called');
    console.log('Patient:', patientAddress);
    console.log('Recipient:', recipient);
    console.log('Record ID:', recordId);
    console.log('Encrypted key (input):', encryptedAESKeyHex);
    console.log('Encrypted key length:', encryptedAESKeyHex?.length);
    
    const contract = await writeAccessControlContract();

    // Ensure it starts with 0x
    const hex = encryptedAESKeyHex.startsWith('0x')
      ? encryptedAESKeyHex
      : '0x' + encryptedAESKeyHex;

    console.log('Encrypted key (final):', hex);
    console.log('Final length:', hex.length);
    console.log('Preview:', hex.substring(0, 52) + '...');

    const tx = await contract.storeEncryptedAESKey(
      patientAddress,
      recipient,
      recordId,
      hex
    );
    console.log('✅ Transaction sent, waiting for confirmation...');
    const receipt = await tx.wait();
    console.log('✅ Encrypted key stored successfully');
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
    console.log('📋 Getting shared records for:', userAddress);

    // NEW: Verify unified private key exists FIRST (IndexedDB)
    const { hasPrivateKey } = await import('./keyStorage');
    const hasUserKey = await hasPrivateKey('userPrivateKey', userAddress);
    
    if (!hasUserKey) {
      console.warn('⚠️ No user private key found in IndexedDB');
      throw new Error('No private key available. Please generate keys first.');
    }

    // 1. Get list of shared records
    const sharedRecordInfos = await getSharedRecords(userAddress);
    console.log('📋 Raw shared record infos:', sharedRecordInfos);

    if (sharedRecordInfos.length === 0) {
      console.log('ℹ️ No records have been shared with this address yet');
      return [];
    }

    // 2. For each shared record, fetch the full details
    const fullRecords = await Promise.all(
      sharedRecordInfos.map(async (info: any) => {
        try {
          console.log('🔄 Processing record:', {
            patient: info.patientAddress,
            recordId: info.recordId,
          });

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
    console.log('✅ Total records (including errors):', fullRecords.length);
    console.log('✅ Successfully decrypted:', validRecords.filter(r => r.metadata.recordType !== 'Error').length);

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
    console.log('=== FETCHING AND DECRYPTING SHARED RECORD ===');
    console.log('Patient:', patientAddress);
    console.log('Record ID:', recordId);
    console.log('Recipient:', recipientAddress);

    // 1. Get the medical record metadata from blockchain
    const record = await getMedicalRecord(patientAddress, recordId);
    console.log('📦 Medical record:', record);

    const contract = await readAccessControlContract();

    // 2. Get encrypted AES key for this recipient
    console.log('🔑 Getting encrypted AES key...');
    const encryptedAESKey = await contract.getEncryptedAESKey(
      patientAddress,
      recipientAddress,
      recordId
    );
    console.log(
      '🔑 Encrypted AES key:',
      encryptedAESKey?.substring(0, 20) + '...'
    );

    if (!encryptedAESKey || encryptedAESKey === '0x') {
      throw new Error('No encrypted key found for this record. Access might not have been granted correctly.');
    }

    // NEW: Decrypt AES key with unified user private key
    const { hasPrivateKey } = await import('./keyStorage');
    const hasUserKey = await hasPrivateKey('userPrivateKey', recipientAddress);

    console.log('🔍 Debug - Available keys (IndexedDB):', {
      hasUserKey,
      encryptedAESKeyValue: encryptedAESKey,
      encryptedAESKeyType: typeof encryptedAESKey,
      encryptedAESKeyLength: encryptedAESKey?.length
    });

    if (!hasUserKey) {
      throw new Error('No user private key found. Please initialize keys in your dashboard.');
    }

    if (!encryptedAESKey || encryptedAESKey === '0x' || encryptedAESKey === '0x0') {
      throw new Error(`Invalid encrypted AES key received from contract: "${encryptedAESKey}". The key may not have been stored correctly when the patient shared the record.`);
    }

    let aesKey: string | null = null;
    let decryptionError: any = null;

    try {
      console.log('🔓 Trying to decrypt with user private key...');
      aesKey = await decryptAESKey(encryptedAESKey, recipientAddress); // Unified: No keyId needed
      console.log('✅ AES key decrypted with user key');
    } catch (err) {
      console.log('❌ Failed to decrypt with user key:', err);
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
    console.log('📥 Fetching from IPFS, CID:', record.cid);
    const response = await fetch(
      `http://localhost:8080/api/upload/fetchFromIPFS/${record.cid}`
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch from IPFS: ${response.statusText}`);
    }

    const encryptedData = await response.text();
    console.log('📥 Encrypted data fetched, length:', encryptedData.length);

    // 5. Decrypt the document with AES key
    console.log('🔓 Decrypting document...');
    const decrypted = CryptoJS.AES.decrypt(encryptedData, aesKey).toString(
      CryptoJS.enc.Utf8
    );

    if (!decrypted) {
      throw new Error('Decryption failed - empty result');
    }

    const payload = JSON.parse(decrypted);
    console.log('✅ Document decrypted successfully');
    console.log('📄 Payload structure:', {
      hasFile: !!payload.file,
      hasMetadata: !!payload.metadata,
      fileKeys: payload.file ? Object.keys(payload.file) : [],
    });

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
    console.log("Doctor's address: ", doctorAddress);

    const contract = await writeMedicalRecordsContract();
    const createdRecords = await contract.getCreatedRecords(doctorAddress);
    console.log('Created Records: ', createdRecords);
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
