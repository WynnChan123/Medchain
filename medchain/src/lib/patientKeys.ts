import { readUpgradeContract, writeUpgradeContract } from "./integration";
import { generateRSAKeyPair, exportPublicKeyToPEM } from "./webCryptoUtils";
import { storePrivateKey } from "./keyStorage";
import { ethers } from "ethers";

export async function generateAndRegisterPatientKey(userAddress?: string): Promise<string> {
  try {
    const address = userAddress || await getSignerAddress(); // Use signer if not passed
    console.log(`Generating RSA key pair for patient ${address}...`);
    
    // 1-3. Unchanged: Gen pair, export PEM, store private
    const keyPair = await generateRSAKeyPair();
    const publicKeyPEM = await exportPublicKeyToPEM(keyPair.publicKey);
    await storePrivateKey("patientPrivateKey", keyPair.privateKey, address);
    localStorage.removeItem("patientPublicKey"); // Clear old

    console.log('Keys generated/stored. Public preview:', publicKeyPEM.substring(0, 100) + '...');
    
    // 4. Register on-chain (reuse admin method—works for any addr)
    console.log('Registering public key on-chain...');
    const contract = await writeUpgradeContract();
    const tx = await contract.registerAdminPublicKey(publicKeyPEM);
    console.log('Tx sent:', tx.hash);
    const receipt = await tx.wait(1);
    if (receipt.status !== 1) {
      throw new Error(`Registration failed: ${tx.hash}`);
    }

    // NEW: Immediate re-fetch to confirm on-chain update
    const confirmedKey = await getPatientPublicKey(address);
    if (confirmedKey.trim() !== publicKeyPEM.trim()) {
      console.warn('⚠️ On-chain confirmation mismatch—possible indexer lag. Retrying fetch...');
      await new Promise(resolve => setTimeout(resolve, 3000)); // 3s delay
      const retryKey = await getPatientPublicKey(address);
      if (retryKey.trim() !== publicKeyPEM.trim()) {
        throw new Error('On-chain key not updated after tx—check RPC/indexer');
      }
    }

    console.log("✅ Public key confirmed on-chain!");
    localStorage.setItem('patientPublicKey', publicKeyPEM); // Sync local
    return publicKeyPEM;
  } catch (error) {
    console.error('Error generating/registering patient key:', error);
    throw error;
  }
}

async function getSignerAddress(): Promise<string> {
  if (!window.ethereum) throw new Error('No Web3 provider');
  const provider = new ethers.providers.Web3Provider(window.ethereum);
  return await provider.getSigner().getAddress();
}

export async function getPatientPublicKey(patientAddress: string): Promise<string> {
  try {
    const contract = await readUpgradeContract();
    const publicKey = await contract.getAdminPublicKey(patientAddress);
    
    // Verify the retrieved key has proper format
    if (publicKey && !publicKey.includes('\n')) {
      console.warn('Retrieved public key is missing line breaks');
    }
    
    return publicKey;
  } catch (error) {
    console.error("Failed to get patient's key:", error);
    throw error;
  }
}