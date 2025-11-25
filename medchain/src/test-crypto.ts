import { generateRSAKeyPair, exportPublicKeyToPEM, encryptAESKeyWithPublicKey, decryptAESKeyWithPrivateKey } from './lib/webCryptoUtils';
import { storePrivateKey, getPrivateKey } from './lib/keyStorage';

async function testCryptoSystem() {
  console.log("🚀 Starting Crypto System Test...");

  try {
    // 1. Generate Key Pair
    console.log("1️⃣ Generating Key Pair...");
    const keyPair = await generateRSAKeyPair();
    console.log("✅ Key Pair Generated");
    console.log("Private Key Extractable:", keyPair.privateKey.extractable); // Should be false

    if (keyPair.privateKey.extractable) {
      console.error("❌ FAIL: Private key should be non-extractable");
      return;
    }

    // 2. Export Public Key
    console.log("2️⃣ Exporting Public Key...");
    const publicKeyPEM = await exportPublicKeyToPEM(keyPair.publicKey);
    console.log("✅ Public Key PEM:\n", publicKeyPEM.substring(0, 50) + "...");

    // 3. Store Private Key
    console.log("3️⃣ Storing Private Key in IndexedDB...");
    await storePrivateKey("testKey", keyPair.privateKey);
    console.log("✅ Private Key Stored");

    // 4. Retrieve Private Key
    console.log("4️⃣ Retrieving Private Key...");
    const retrievedKey = await getPrivateKey("testKey");
    if (!retrievedKey) {
      console.error("❌ FAIL: Could not retrieve private key");
      return;
    }
    console.log("✅ Private Key Retrieved");

    // 5. Encrypt AES Key
    console.log("5️⃣ Encrypting AES Key...");
    const aesKeyHex = "0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const encryptedKey = await encryptAESKeyWithPublicKey(aesKeyHex, publicKeyPEM);
    console.log("✅ Encrypted Key:", encryptedKey.substring(0, 50) + "...");

    // 6. Decrypt AES Key
    console.log("6️⃣ Decrypting AES Key...");
    const decryptedKey = await decryptAESKeyWithPrivateKey(encryptedKey, retrievedKey);
    console.log("✅ Decrypted Key:", decryptedKey);

    if (decryptedKey === aesKeyHex.replace('0x', '')) {
      console.log("🎉 SUCCESS: Decrypted key matches original!");
    } else {
      console.error("❌ FAIL: Decrypted key mismatch!");
      console.log("Expected:", aesKeyHex.replace('0x', ''));
      console.log("Got:", decryptedKey);
    }

  } catch (error) {
    console.error("❌ Error during test:", error);
  }
}

// Expose to window for running in console
if (typeof window !== 'undefined') {
  (window as any).testCryptoSystem = testCryptoSystem;
}
