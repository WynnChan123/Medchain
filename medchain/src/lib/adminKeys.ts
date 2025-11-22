import NodeRSA from 'node-rsa';
import { writeUpgradeContract } from "./integration";

export async function generateAndRegisterAdminKey() {
  try {
    console.log('Generating RSA key pair for admin...');
    
    // 1. Generate RSA key pair
    const key = new NodeRSA({ b: 2048 });
    key.setOptions({ encryptionScheme: 'pkcs1' });
    
    // 2. Export keys in PEM format WITH PROPER LINE BREAKS
    const publicKeyPEM = key.exportKey('pkcs8-public-pem');   // ← Changed
    const privateKeyPEM = key.exportKey('pkcs1-private-pem'); // ← Changed
    
    console.log('Keys generated successfully');
    console.log('Public key preview:', publicKeyPEM.substring(0, 100) + '...');
    console.log('Private key preview:', privateKeyPEM.substring(0, 100) + '...');
    
    // Verify the format includes newlines
    if (!privateKeyPEM.includes('\n')) {
      console.error('ERROR: Private key is missing line breaks!');
      throw new Error('Private key format is incorrect - missing line breaks');
    }
    
    console.log('✅ Private key format verified (contains newlines)');

    // 3. Store private key locally
    localStorage.setItem("adminPrivateKey", privateKeyPEM);
    console.log('Admin private key stored in localStorage');
    
    // Verify it was stored correctly
    const storedKey = localStorage.getItem("adminPrivateKey");
    if (storedKey && !storedKey.includes('\n')) {
      console.error('ERROR: Stored key lost its line breaks!');
      throw new Error('localStorage corrupted the key format');
    }
    console.log('✅ Stored key format verified');

    // 4. Register public key on-chain
    console.log('Registering public key on blockchain...');
    const contract = await writeUpgradeContract();
    const tx = await contract.registerAdminPublicKey(publicKeyPEM);
    console.log('Transaction sent, waiting for confirmation...');
    await tx.wait();

    console.log("✅ Admin public key registered on-chain successfully!");
    return publicKeyPEM;
  } catch (error) {
    console.error('Error in generateAndRegisterAdminKey:', error);
    throw error;
  }
}