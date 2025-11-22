import NodeRSA from 'node-rsa';
import { readUpgradeContract, writeUpgradeContract } from "./integration";

export async function generateAndRegisterPatientKey() {
  try {
    console.log('Generating RSA key pair for patient...');
    
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
    localStorage.setItem("patientPrivateKey", privateKeyPEM);
    console.log('Patient private key stored in localStorage');
    
    // Verify it was stored correctly
    const storedKey = localStorage.getItem("patientPrivateKey");
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

    console.log("✅ Patient public key registered on-chain successfully!");
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