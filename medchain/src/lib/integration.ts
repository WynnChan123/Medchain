import { ethers } from 'ethers';
import { UserRole } from '../../utils/userRole';

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_SMART_CONTRACT_ADDRESS!;

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






