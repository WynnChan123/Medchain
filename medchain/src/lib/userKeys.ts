import { readUpgradeContract, writeUpgradeContract } from "./integration";
import { generateRSAKeyPair, exportPublicKeyToPEM } from "./webCryptoUtils";
import { storePrivateKey, deletePrivateKey, cleanupLegacyKeys } from "./keyStorage"; // Cleanup
import { ethers } from 'ethers';
import { verifyRSAKeyPair } from './integration'; // For post-gen validate

export async function generateAndRegisterUserKey(userAddress?: string): Promise<string> {
  try {
    const address = userAddress || await getSignerAddress();
    // Cleanup old keys first (prevents stale pair)
    await deletePrivateKey('userPrivateKey', address); // Delete existing unified
    await cleanupLegacyKeys(address); // Purge role-specific
    const keyPair = await generateRSAKeyPair();
    const publicKeyPEM = await exportPublicKeyToPEM(keyPair.publicKey);
    
    // Store new key
    await storePrivateKey("userPrivateKey", keyPair.privateKey, address);
    localStorage.setItem('userPublicKey', publicKeyPEM); // Unified LS (no prefix for simplicity)
    const contract = await writeUpgradeContract();
    const tx = await contract.registerAdminPublicKey(publicKeyPEM);
    const receipt = await tx.wait(1);
    if (receipt.status !== 1) {
      throw new Error(`Registration failed: ${tx.hash}`);
    }

    // Retry fetch on-chain (3x with delay for lag)
    let confirmedKey = await getUserPublicKey(address);
    for (let retry = 0; retry < 3 && confirmedKey.trim() !== publicKeyPEM.trim(); retry++) {
      console.warn(`⚠️ On-chain mismatch on attempt ${retry + 1}—retrying in 3s...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
      confirmedKey = await getUserPublicKey(address);
    }
    if (confirmedKey.trim() !== publicKeyPEM.trim()) {
      throw new Error('On-chain key not updated after tx—check RPC/indexer');
    }

    // NEW: Validate the new pair immediately (round-trip test)
    const isValid = await verifyRSAKeyPair(publicKeyPEM);
    if (!isValid) {
      throw new Error('Generated pair failed validation—retry generation');
    }
    return publicKeyPEM;
  } catch (error) {
    console.error('Error generating/registering user key:', error);
    throw error;
  }
}

async function getSignerAddress(): Promise<string> {
  if (!window.ethereum) throw new Error('No Web3 provider');
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  return await provider.getSigner().getAddress();
}

export async function getUserPublicKey(userAddress: string): Promise<string> {
  try {
    const contract = await readUpgradeContract();
    let publicKey = await contract.getAdminPublicKey(userAddress);
    
    if (!publicKey || publicKey === '0x' || publicKey === '') {
      return '';
    }
    
    publicKey = publicKey.trim();
    if (!publicKey.includes('-----BEGIN PUBLIC KEY-----')) {
      console.warn(`Malformed PEM for ${userAddress}`);
    }
    
    return publicKey;
  } catch (error) {
    console.error(`Failed to fetch key for ${userAddress}:`, error);
    return '';
  }
}