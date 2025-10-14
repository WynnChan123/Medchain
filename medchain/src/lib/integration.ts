//integration.ts
import { ethers } from 'ethers';
import { UserRole } from '../../utils/userRole';
import CryptoJS from 'crypto-js';
import NodeRSA from 'node-rsa';
import { read } from 'node:fs';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SMART_CONTRACT_ADDRESS!;
const UPGRADE_ADDRESS = process.env.NEXT_PUBLIC_ROLE_UPGRADE_ADDRESS!;

export interface User{
  role: UserRole;
  encryptedId: string;
  createdAt: Date;
  isActive: boolean;
  walletAddress: string;
  authorizedBy: string;
}

export async function writeContract() {
  
  if (!window.ethereum) throw new Error("MetaMask not found");
  await (window.ethereum as any).request({ method: "eth_requestAccounts" });

  const provider = new ethers.providers.Web3Provider(window.ethereum);
  const signer = await provider.getSigner();

  const res = await fetch(
    `https://api-sepolia.etherscan.io/api?module=contract&action=getabi&address=${process.env.NEXT_PUBLIC_SMART_CONTRACT_ADDRESS}&apikey=${process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY}`
  );
  const data = await res.json();
  const abi = JSON.parse(data.result);

  return new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
}


export async function readContract() {
  if (!window.ethereum) throw new Error("MetaMask not found");
  await (window.ethereum as any).request({ method: "eth_requestAccounts" });

  // const provider = new ethers.providers.JsonRpcProvider(process.env.SEPOLIA_RPC);
    const provider = new ethers.providers.Web3Provider(window.ethereum);

  const res = await fetch(
    `https://api-sepolia.etherscan.io/api?module=contract&action=getabi&address=${process.env.NEXT_PUBLIC_SMART_CONTRACT_ADDRESS}&apikey=${process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY}`
  );
  const data = await res.json();
  const abi = JSON.parse(data.result);
  console.log("ABI fetch response:", data);


  return new ethers.Contract(CONTRACT_ADDRESS, abi, provider);
}

export async function readUpgradeContract() {
  if (!window.ethereum) throw new Error("MetaMask not found");
  await (window.ethereum as any).request({ method: "eth_requestAccounts" });

  // const provider = new ethers.providers.JsonRpcProvider(process.env.SEPOLIA_RPC);
    const provider = new ethers.providers.Web3Provider(window.ethereum);

  const res = await fetch(
    `https://api-sepolia.etherscan.io/api?module=contract&action=getabi&address=${process.env.NEXT_PUBLIC_ROLE_UPGRADE_ADDRESS}&apikey=${process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY}`
  );
  const data = await res.json();
  const abi = JSON.parse(data.result);
  console.log("ABI fetch response:", data);


  return new ethers.Contract(UPGRADE_ADDRESS, abi, provider);
}

export async function registerUser(wallet: string, encryptedId: string, role: number) {
  try{
      const contract = await writeContract();

      console.log("Contract signer:", await contract.signer.getAddress());
      console.log("Wallet param:", wallet);
      console.log("MetaMask signer address:", await contract.signer.getAddress());
      console.log("Same? ", (await contract.signer.getAddress()).toLowerCase() === wallet.toLowerCase());


      const tx = await contract.registerUser(wallet, encryptedId, role);
      return await tx.wait();
  }catch(error: any){
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

export async function requestRoleUpgrade(address: string, cid: string, admins: string[], newRole: UserRole, encryptedKeys: string[]){
  try{
    const contract = await writeContract();
    const tx = await contract.submitUpgradeRequest(address, cid, newRole, admins, encryptedKeys);
    return await tx.wait();
  }catch(error){
    console.error("Error requesting role upgrade: ", error);
    throw error;
  }
}

export async function submitRoleUpgradeRequest(
  patientAddress: string, 
  files: { id: File, license: File, proof: File }, 
  metadata: {
    role: string,
    organization: string,
    additionalInfo: string
  },
  selectedAdmins: string[],
  adminPublicKeys: string[],
){
  try{
    //Take each file from the user's computer
    //Read each file and convert it to base64 text format
    
    const fileData = await Promise.all(
      [files.id, files.license, files.proof].map(async(file)=> ({
        name: file.name,
        type: file.type,
        base64: await fileToBase64(file)
      }))
    )

    const payload = JSON.stringify({
      files: fileData,
      metadata: {
        ...metadata,
        patient: patientAddress,
        timestamp: new Date().toISOString(),
      }
    })

    //generate aes key and encrypt
    const aesKey = CryptoJS.lib.WordArray.random(32);
    const aesKeyHex = aesKey.toString(CryptoJS.enc.Hex);
    const encrypted = CryptoJS.AES.encrypt(payload, aesKeyHex).toString();

    //upload to pinata
    const uploadResponse = await fetch('http://localhost:8080/api/upload/uploadToPinata', {
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
    });

    if(!uploadResponse.ok){
      throw new Error("Error uploading to Pinata");
    }

    const result = await uploadResponse.json();
    const cidOfResult = result.cid;

    console.log("CID returned: ", cidOfResult);

    const encryptedKeys = selectedAdmins.map((_, i) =>
      encryptWithPublicKey(aesKeyHex, adminPublicKeys[i])
    );

    const role_to_enum: Record<string, UserRole> = {
      'healthcare': UserRole.HealthcareProvider,
      'insurance': UserRole.Insurer,
      'admin': UserRole.Admin,
    }

    const roleEnum = role_to_enum[metadata.role];
    if (roleEnum === undefined) {
      throw new Error(`Invalid role: ${metadata.role}`);
    }

    const receipt = await requestRoleUpgrade(
      patientAddress,
      cidOfResult,
      selectedAdmins,
      roleEnum,
      encryptedKeys
    );

    console.log('Role upgrade request submitted successfully');
    return { success: true, cid: cidOfResult, txHash: receipt.transactionHash };

    
  }catch(error){
    console.error("Submit role upgrade request failed", error);
    throw error;
  }
}

export function encryptWithPublicKey(aesKey: string, adminPublicKey: string){
  const rsaPublicKey = new NodeRSA(adminPublicKey);
  const encryptedAesKey = rsaPublicKey.encrypt(aesKey,'base64');
  return encryptedAesKey;
}

export async function approveUpgrade(requestId: number, userToUpgrade: string){
  try{
    const contract = await writeContract();
    const tx = await contract.approveRequest(requestId, userToUpgrade);
    return tx.wait();
  }catch(error){
    console.error("Failed to approve upgrade request: ", error);
    throw error;
  }
}

export async function rejectRequest(requestId: number){
  try{
    const contract = await writeContract();
    const tx = await contract.rejectRequest(requestId);
    return tx.wait();
  }catch(error){
    console.error("Failed to reject upgrade request: ",error);
    throw error;
  }
}

export async function getEncryptedKey(requestId: number):Promise<string>{
  try{
    const contract = await readContract();
    const key = await contract.getEncryptedKeyForCaller(requestId);
    return key;
  }catch(error){
    console.error("Failed to get encrypted key: ", error);
    throw error;
  }
}

export async function getAdmins():Promise<string[]>{
  try{
    const contract = await readUpgradeContract();
    const admins = await contract.getAdmins();
    return admins;
  }catch(error){
    console.error("Error returning admin list: ", error);
    throw error;
  }
}

export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      resolve(base64.split(',')[1]); // Remove data:image/png;base64, prefix
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}


export async function getAdminPublicKey(adminAddress: string){
  try{
    const contract = await readUpgradeContract();
    const tx = await contract.getAdminPublicKey(adminAddress);
    return tx;
  }catch(error){
    console.log("Failed to get admin's public key", error);
    throw error;
  }

}





