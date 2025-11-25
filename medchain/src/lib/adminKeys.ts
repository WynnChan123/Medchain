import { writeUpgradeContract } from "./integration";
import { generateRSAKeyPair, exportPublicKeyToPEM } from "./webCryptoUtils";
import { storePrivateKey } from "./keyStorage";

export async function generateAndRegisterAdminKey() {
  try {
    console.log('Generating RSA key pair for admin (WebCrypto)...');
    
    // 1. Generate RSA key pair (non-extractable private key)
    const keyPair = await generateRSAKeyPair();
    
    // 2. Export public key to PEM for on-chain registration
    const publicKeyPEM = await exportPublicKeyToPEM(keyPair.publicKey);
    
    console.log('Keys generated successfully');
    console.log('Public key preview:', publicKeyPEM.substring(0, 100) + '...');
    
    // 3. Store private key handle in IndexedDB
    await storePrivateKey("adminPrivateKey", keyPair.privateKey);
    console.log('Admin private key stored in IndexedDB (non-extractable)');
    
    // Clear any old keys from localStorage to avoid confusion
    localStorage.removeItem("adminPrivateKey");

    // 4. Register public key on-chain
    console.log('Registering public key on blockchain...');
    const contract = await writeUpgradeContract();
    const tx = await contract.registerAdminPublicKey(publicKeyPEM);
    console.log('Transaction sent, waiting for confirmation...');
    await tx.wait();

    console.log("✅ Admin public key registered on-chain successfully!");
    
    // Store public key locally to detect stale chain data
    localStorage.setItem('adminPublicKey', publicKeyPEM);
    
    return publicKeyPEM;
  } catch (error) {
    console.error('Error in generateAndRegisterAdminKey:', error);
    throw error;
  }
}