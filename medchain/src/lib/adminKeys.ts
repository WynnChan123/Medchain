import { writeUpgradeContract } from "./integration";

export async function generateAndRegisterAdminKey() {
  // 1. Generate RSA key pair
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  );

  // 2. Export keys to base64
  const publicKey = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
  const privateKey = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

  const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(publicKey)));
  const privateKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(privateKey)));

  const publicKeyPEM = `-----BEGIN PUBLIC KEY-----\n${publicKeyBase64.match(/.{1,64}/g)!.join('\n')}\n-----END PUBLIC KEY-----`;
  const privateKeyPEM = `-----BEGIN PRIVATE KEY-----\n${privateKeyBase64.match(/.{1,64}/g)!.join('\n')}\n-----END PRIVATE KEY-----`;

  // 3. Store private key locally (browser only)
  localStorage.setItem("adminPrivateKey", privateKeyPEM);

  // 4. Register public key on-chain
  const contract = await writeUpgradeContract();
  const tx = await contract.registerAdminPublicKey(publicKeyPEM);
  await tx.wait();

  console.log("Public key registered on-chain!");
  return publicKeyPEM;
}