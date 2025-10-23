//integration.ts
import { ethers } from 'ethers';
import { UserRole } from '../../utils/userRole';
import CryptoJS from 'crypto-js';
import NodeRSA from 'node-rsa';
import { read } from 'node:fs';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SMART_CONTRACT_ADDRESS!;
const UPGRADE_ADDRESS = process.env.NEXT_PUBLIC_ROLE_UPGRADE_ADDRESS!;

export interface User {
  role: UserRole;
  encryptedId: string;
  createdAt: Date;
  isActive: boolean;
  walletAddress: string;
  authorizedBy: string;
}

async function fetchAbiFromEtherscan(address: string): Promise<any> {
  try {
    const response = await fetch(
      `http://localhost:8080/api/etherscan/getABI/${address}`
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch ABI');
    }

    const data = await response.json();
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

export async function writeUpgradeContract(){
  if (!window.ethereum) throw new Error('MetaMask not found');
  await (window.ethereum as any).request({ method: 'eth_requestAccounts' });

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = await provider.getSigner();

  const abi = await fetchAbiFromEtherscan(UPGRADE_ADDRESS);
  return new ethers.Contract(UPGRADE_ADDRESS, abi, signer);
}

export async function registerUser(
  wallet: string,
  encryptedId: string,
  role: number
) {
  try {
    const contract = await writeContract();

    console.log('Contract signer:', await contract.signer.getAddress());
    console.log('Wallet param:', wallet);
    console.log('MetaMask signer address:', await contract.signer.getAddress());
    console.log(
      'Same? ',
      (await contract.signer.getAddress()).toLowerCase() ===
        wallet.toLowerCase()
    );

    const tx = await contract.registerUser(wallet, encryptedId, role);
    return await tx.wait();
  } catch (error: any) {
    console.error('Error in registering wallet on blockchain:', error);
    throw new Error(error.reason || error.message || 'Transaction failed');
  }
}

export async function getRole(address: string): Promise<UserRole> {
  const contract = await readContract();
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
      throw new Error('One or more files are missing. Please ensure all files are selected.');
    }

    if (!files.id.name || !files.license.name || !files.proof.name) {
      throw new Error('One or more files are invalid. Please re-select the files.');
    }

    console.log('=== [CHECKPOINT 2] Starting file processing ===');
    const fileData = await Promise.all(
      [files.id, files.license, files.proof].map(async (file, index) => {
        try {
          console.log(`[File ${index}] Processing:`, file.name, file.type, `Size: ${file.size} bytes`);
          const base64Result = await fileToBase64(file);
          console.log(`[File ${index}] Successfully converted to base64, length: ${base64Result.length}`);
          return {
            name: file.name,
            type: file.type,
            base64: base64Result,
          };
        } catch (error) {
          console.error(`[File ${index}] Error processing:`, error);
          throw new Error(`Failed to process file: ${file.name}. Please try selecting the file again.`);
        }
      })
    );

    console.log('=== [CHECKPOINT 3] File processing complete ===');
    console.log('FileData array length:', fileData.length);
    fileData.forEach((fd, i) => {
      console.log(`FileData[${i}]:`, fd.name, fd.type, `base64 length: ${fd.base64?.length || 0}`);
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
    let uploadResults: any= [];

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
      console.log(`[Encryption ${i}] AES Key:`, aesKeyHex.substring(0, 16) + '...');
      console.log(`[Encryption ${i}] Individual File length:`, individualFile.length);
      
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
        
        console.log(`[Encryption ${i}] Encryption successful, encrypted length:`, encrypted.length);
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
        throw new Error(`Error uploading to Pinata: ${uploadResponse.statusText}`);
      }

      const result = await uploadResponse.json();
      const cidOfResult = result.cid;

      console.log(`[Encryption ${i}] CID returned:`, cidOfResult);

      uploadResults.push({ name: file.name, cid:cidOfResult});
    }
    
    console.log('=== [CHECKPOINT 6] All files uploaded ===');
    console.log('Upload results:', uploadResults);

    // Encrypt AES key with each admin's RSA public key
    console.log('=== [CHECKPOINT 7] Encrypting AES keys for admins ===');
    console.log("Admin public keys:", adminPublicKeys);
    console.log("Number of admins:", selectedAdmins.length);
    
    const encryptedKeys = selectedAdmins.map((_, i) => {
      console.log(`[Admin ${i}] Encrypting AES key...`);
      console.log(`[Admin ${i}] Public Key:`, adminPublicKeys[i]?.substring(0, 50) + '...');
      
      if(!adminPublicKeys[i]){
        throw new Error(`Missing admin public key at index ${i}`);
      }
      
      const encryptedKey = encryptWithPublicKey(aesKeyHex, adminPublicKeys[i]);
      console.log(`[Admin ${i}] Encrypted Key (base64 length):`, encryptedKey.length);
      
      // Convert base64 to bytes properly
      const binary = atob(encryptedKey);
      const bytes = ethers.utils.hexlify(
        Uint8Array.from(binary, (c) => c.charCodeAt(0))
      );
      console.log(`[Admin ${i}] Encrypted AES Key (hex):`, bytes.substring(0, 20) + '...');
      return bytes;
    });
    console.log('=== [CHECKPOINT 8] All AES keys encrypted ===');
    console.log("Encrypted keys count:", encryptedKeys.length);

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
    
    console.log('=== [CHECKPOINT 10] Role upgrade request submitted successfully ===');
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

export function encryptWithPublicKey(aesKey: string, adminPublicKey: string) {
  const rsaPublicKey = new NodeRSA(adminPublicKey);
  // Set encryption scheme to PKCS1 padding (default, but explicit for clarity)
  rsaPublicKey.setOptions({ encryptionScheme: 'pkcs1' });
  const encryptedAesKey = rsaPublicKey.encrypt(aesKey, 'base64');
  return encryptedAesKey;
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
    console.log('Environment variable UPGRADE_ADDRESS:', process.env.NEXT_PUBLIC_ROLE_UPGRADE_ADDRESS);
    
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
      adminAddresses: adminAddresses
    });
    
    // Try to get the encrypted key directly
    console.log('Attempting to get encrypted key...');
    let key;
    try {
      key = await contract.getEncryptedKeyForCaller(requestId);
    } catch (error) {
      console.log('Failed to get key as authorized admin, trying as general admin...');
      // Try as general admin if not specifically authorized
      key = await contract.getEncryptedKeyForAdmin(requestId, callerAddress);
    }
    console.log('Raw key from contract:', key);
    
    // Check if key is valid
    if (!key || key === '0x') {
      console.log('No encrypted key found - checking if adminAddresses is undefined...');
      
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
      - Is caller in adminAddresses: ${request.adminAddresses?.includes(callerAddress) || false}`);
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
        reject(new Error(`Failed to read file: ${file.name} - result is empty`));
        return;
      }
      const parts = base64.split(',');
      if (parts.length < 2) {
        reject(new Error(`Failed to parse file: ${file.name} - invalid data URL format`));
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

export async function getPendingRequestByUser(patientAddress: string){
  try{
    const contract = await readUpgradeContract();
    const tx = await contract.getPendingRequestByUser(patientAddress);
    return tx;
  } catch (error){
    console.log("Failed to return the user's request", error);
    throw error;
  }
}

export async function getPendingRequestsByAdmin(adminAddress: string){
  try{
    const contract = await readUpgradeContract();
    const tx = await contract.getPendingRequestsByAdmin(adminAddress);
    return tx;
  }catch(error){
    console.log("Failed to return the pending requests for admin", error);
    throw error;
  }
}

export async function getAcknowledgedRequestsByAdmin(adminAddress: string){
  try{
    const contract = await readUpgradeContract();
    const tx = await contract.getAcknowledgedRequestsByAdmin(adminAddress);
    return tx;
  }catch(error){
    console.log("Failed to return the pending requests for admin", error);
    throw error;
  }
}
