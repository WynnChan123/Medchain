import { readUpgradeContract, writeUpgradeContract } from "./integration";
import { generateRSAKeyPair, exportPublicKeyToPEM } from "./webCryptoUtils";
import { storePrivateKey } from "./keyStorage";

export async function generateAndRegisterPatientKey() {
  try {
    console.log('Generating RSA key pair for patient (WebCrypto)...');
    
    // 1. Generate RSA key pair (non-extractable private key)
    const keyPair = await generateRSAKeyPair();
    
    // 2. Export public key to PEM for on-chain registration
    const publicKeyPEM = await exportPublicKeyToPEM(keyPair.publicKey);
    
    console.log('Keys generated successfully');
    console.log('Public key preview:', publicKeyPEM.substring(0, 100) + '...');
    
    // 3. Store private key handle in IndexedDB
    await storePrivateKey("patientPrivateKey", keyPair.privateKey);
    console.log('Patient private key stored in IndexedDB (non-extractable)');
    
    // Clear any old keys from localStorage to avoid confusion
    localStorage.removeItem("patientPrivateKey");

    // 4. Register public key on-chain
    console.log('Registering public key on blockchain...');
    const contract = await writeUpgradeContract();
    const tx = await contract.registerAdminPublicKey(publicKeyPEM);
    console.log('Transaction sent, waiting for confirmation...');
    await tx.wait();

    console.log("✅ Patient public key registered on-chain successfully!");
    
    // Store public key locally to detect stale chain data
    localStorage.setItem('patientPublicKey', publicKeyPEM);
    
    return publicKeyPEM;
  } catch (error) {
    console.error('Error in generateAndRegisterPatientKey:', error);
    throw error;
  }
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