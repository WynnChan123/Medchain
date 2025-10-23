import NodeRSA from 'node-rsa';
import { writeUpgradeContract } from "./integration";

export async function generateAndRegisterAdminKey() {
  try {
    console.log('Generating RSA key pair...');
    
    // 1. Generate RSA key pair using node-rsa (same library used for encryption/decryption)
    // Use pkcs1-oaep padding scheme for better security
    const key = new NodeRSA({ b: 2048 }, { encryptionScheme: 'pkcs1' });
    
    // 2. Export keys in PEM format
    const publicKeyPEM = key.exportKey('public');
    const privateKeyPEM = key.exportKey('private');
    
    console.log('Keys generated successfully');
    console.log('Public key preview:', publicKeyPEM.substring(0, 100) + '...');

    // 3. Store private key locally
    localStorage.setItem("adminPrivateKey", privateKeyPEM);
    console.log('Private key stored in localStorage');

    // 4. Register public key on-chain
    console.log('Registering public key on blockchain...');
    const contract = await writeUpgradeContract();
    const tx = await contract.registerAdminPublicKey(publicKeyPEM);
    console.log('Transaction sent, waiting for confirmation...');
    await tx.wait();

    console.log("✅ Public key registered on-chain successfully!");
    return publicKeyPEM;
  } catch (error) {
    console.error('Error in generateAndRegisterAdminKey:', error);
    throw error;
  }
}