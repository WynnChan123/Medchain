# 🔐 Encryption & Decryption Explained (Beginner-Friendly)

This document explains how MedChain protects sensitive medical data using encryption. We'll break it down step-by-step with real-world analogies!

## 📚 Table of Contents

1. [The Big Picture](#the-big-picture)
2. [Key Concepts](#key-concepts)
3. [How It Works: Step-by-Step](#how-it-works-step-by-step)
4. [Real Example: Sharing a Medical Record](#real-example-sharing-a-medical-record)
5. [Security Features](#security-features)
6. [Technical Details](#technical-details)

---

## The Big Picture

### 🎯 What Problem Are We Solving?

Medical records contain sensitive information that must be:
- **Private** - Only authorized people can read them
- **Secure** - Protected from hackers and unauthorized access
- **Shareable** - Patients can grant access to doctors, insurers, etc.

### 🔑 The Solution: Two-Layer Encryption

MedChain uses a **hybrid encryption system** combining two types of encryption:

1. **AES Encryption** (Symmetric) - Fast, for encrypting large files
2. **RSA Encryption** (Asymmetric) - Secure, for sharing access keys

Think of it like a **safe deposit box system**:
- The **AES key** is like the actual key to the box (fast to use)
- The **RSA keys** are like secure envelopes to safely share copies of that key

---

## Key Concepts

### 🔐 1. AES Encryption (Symmetric)

**What it is:** A single secret key that both encrypts and decrypts data.

**Analogy:** Like a padlock with one key. Anyone with that key can lock or unlock it.

```
Original File + AES Key → Encrypted File
Encrypted File + AES Key → Original File
```

**In MedChain:**
- Each medical record gets its own unique AES key (256-bit)
- The AES key encrypts the actual medical files (PDFs, images, etc.)
- Files are encrypted using **CryptoJS.AES** library

### 🔑 2. RSA Encryption (Asymmetric)

**What it is:** A pair of keys - one public (for encrypting) and one private (for decrypting).

**Analogy:** Like a mailbox:
- **Public Key** = Mailbox slot (anyone can drop mail in)
- **Private Key** = Mailbox key (only you can open and read mail)

```
Message + Public Key → Encrypted Message
Encrypted Message + Private Key → Original Message
```

**In MedChain:**
- Every user has an RSA key pair (2048-bit)
- **Public key** is stored on the blockchain (visible to everyone)
- **Private key** stays in your browser (never leaves your device!)
- RSA is used to encrypt/decrypt the AES keys

---

## How It Works: Step-by-Step

### 📤 Scenario 1: Doctor Creates a Medical Record

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Generate AES Key                                    │
│ ────────────────────────────────────────────────────────────│
│ • System generates random 256-bit AES key                   │
│ • Example: "a3f5b2c8d1e4f7a9..."                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Encrypt Medical File                                │
│ ────────────────────────────────────────────────────────────│
│ • Medical file (PDF/image) → Base64 text                   │
│ • Encrypt with AES key                                      │
│ • Result: Encrypted blob of data                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Upload to IPFS                                      │
│ ────────────────────────────────────────────────────────────│
│ • Encrypted file uploaded to Pinata (IPFS)                 │
│ • Returns CID (Content ID): "QmXyz123..."                  │
│ • Nobody can read it without the AES key!                  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Protect the AES Key                                 │
│ ────────────────────────────────────────────────────────────│
│ • Get Patient's PUBLIC key from blockchain                  │
│ • Encrypt AES key with Patient's public key (RSA)          │
│ • Store encrypted AES key on blockchain                    │
│ • Also encrypt AES key with Doctor's own public key        │
│   (so doctor can view it later)                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Store on Blockchain                                 │
│ ────────────────────────────────────────────────────────────│
│ • Record ID: "LAB_001"                                      │
│ • IPFS CID: "QmXyz123..."                                  │
│ • Encrypted AES Key (for patient): "0x3a4f..."            │
│ • Encrypted AES Key (for doctor): "0x7b2e..."             │
└─────────────────────────────────────────────────────────────┘
```

### 📥 Scenario 2: Patient Views Their Medical Record

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Fetch Record Info from Blockchain                   │
│ ────────────────────────────────────────────────────────────│
│ • Get IPFS CID: "QmXyz123..."                              │
│ • Get encrypted AES key: "0x3a4f..."                       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Decrypt the AES Key                                 │
│ ────────────────────────────────────────────────────────────│
│ • Use Patient's PRIVATE key (from browser storage)         │
│ • Decrypt: "0x3a4f..." → "a3f5b2c8d1e4f7a9..."           │
│ • Now we have the original AES key!                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Download from IPFS                                  │
│ ────────────────────────────────────────────────────────────│
│ • Fetch encrypted file using CID from Pinata               │
│ • Still encrypted at this point                            │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Decrypt the File                                    │
│ ────────────────────────────────────────────────────────────│
│ • Use decrypted AES key: "a3f5b2c8d1e4f7a9..."           │
│ • Decrypt file with CryptoJS.AES.decrypt()                 │
│ • Result: Original medical file!                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 5: Display to Patient                                  │
│ ────────────────────────────────────────────────────────────│
│ • Convert Base64 back to viewable format                   │
│ • Show PDF/image in browser                                │
└─────────────────────────────────────────────────────────────┘
```

### 🤝 Scenario 3: Patient Shares Record with Another Doctor

```
┌─────────────────────────────────────────────────────────────┐
│ Step 1: Patient Initiates Sharing                           │
│ ────────────────────────────────────────────────────────────│
│ • Patient selects record: "LAB_001"                        │
│ • Patient selects recipient: Dr. Smith                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 2: Get Doctor's Public Key                             │
│ ────────────────────────────────────────────────────────────│
│ • Fetch Dr. Smith's public key from blockchain             │
│ • Public keys are openly available                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 3: Re-encrypt AES Key for Doctor                       │
│ ────────────────────────────────────────────────────────────│
│ • Patient decrypts AES key with their private key          │
│ • Encrypt same AES key with Dr. Smith's public key         │
│ • New encrypted key: "0x9d8c..."                           │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│ Step 4: Grant Access on Blockchain                          │
│ ────────────────────────────────────────────────────────────│
│ • Store encrypted AES key for Dr. Smith                    │
│ • Update access control list                               │
│ • Dr. Smith can now decrypt and view!                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Real Example: Sharing a Medical Record

Let's follow a blood test result through the system:

### 🩸 The Journey of "BloodTest_2024.pdf"

**1. Doctor uploads the file:**
```javascript
// Generate random AES key
const aesKey = CryptoJS.lib.WordArray.random(32);
// Result: "a3f5b2c8d1e4f7a9b2c5d8e1f4a7b0c3..."

// Encrypt the PDF file
const encrypted = CryptoJS.AES.encrypt(pdfData, aesKey);
// Result: Unreadable encrypted blob

// Upload to IPFS
const cid = await uploadToPinata(encrypted);
// Result: "QmXyz123abc..."
```

**2. Protect the AES key:**
```javascript
// Get patient's public key from blockchain
const patientPublicKey = await getPublicKey(patientAddress);

// Encrypt AES key with patient's public key
const encryptedKey = await encryptAESKeyWithPublicKey(
  aesKey,
  patientPublicKey
);
// Result: "0x3a4f7b2e9d1c5a8f..."
```

**3. Store on blockchain:**
```solidity
// Smart contract stores:
encryptedKeys["LAB_001"][patientAddress] = "0x3a4f7b2e9d1c5a8f...";
```

**4. Patient views the file:**
```javascript
// Get encrypted key from blockchain
const encryptedKey = await getEncryptedAESKey("LAB_001");

// Decrypt with patient's private key (from browser)
const aesKey = await decryptAESKeyWithPrivateKey(
  encryptedKey,
  patientPrivateKey
);

// Download encrypted file from IPFS
const encryptedFile = await fetchFromIPFS("QmXyz123abc...");

// Decrypt file with AES key
const originalFile = CryptoJS.AES.decrypt(encryptedFile, aesKey);
// Result: Original "BloodTest_2024.pdf"!
```

**5. Patient shares with insurance company:**
```javascript
// Get insurer's public key
const insurerPublicKey = await getPublicKey(insurerAddress);

// Re-encrypt the AES key for insurer
const encryptedKeyForInsurer = await encryptAESKeyWithPublicKey(
  aesKey,
  insurerPublicKey
);

// Store on blockchain
await shareMedicalRecord(
  patientAddress,
  "LAB_001",
  insurerAddress,
  encryptedKeyForInsurer
);
```

---

## Security Features

### 🛡️ Why This System is Secure

#### 1. **Private Keys Never Leave Your Device**
- Your RSA private key is generated in your browser
- Stored in IndexedDB (local browser storage)
- **Never** transmitted to servers or blockchain
- Only you can decrypt data meant for you

#### 2. **Each File Has Unique Encryption**
- Every medical record gets a fresh AES key
- Even if one key is compromised, others are safe
- Keys are 256-bit (2^256 possible combinations!)

#### 3. **Blockchain Access Control**
- Who can access what is recorded on-chain
- Immutable audit trail
- Patient has full control over sharing

#### 4. **Encrypted Storage**
- Files stored on IPFS are encrypted
- Even IPFS operators can't read them
- Only people with the AES key can decrypt

#### 5. **No Single Point of Failure**
- Decentralized storage (IPFS)
- Blockchain for access control
- Client-side encryption/decryption

### 🚫 What Can't Be Done

- **Can't decrypt without private key** - Even we (developers) can't access your data
- **Can't forge access** - Blockchain prevents unauthorized access grants
- **Can't modify encrypted files** - IPFS content is immutable
- **Can't steal keys from blockchain** - Only encrypted keys are stored on-chain

---

## Technical Details

### 🔧 Encryption Algorithms Used

#### AES-256 (Advanced Encryption Standard)
- **Type:** Symmetric encryption
- **Key Size:** 256 bits
- **Library:** CryptoJS
- **Use Case:** Encrypting actual file data
- **Speed:** Very fast (can encrypt large files quickly)

```javascript
// Generate key
const aesKey = CryptoJS.lib.WordArray.random(32); // 32 bytes = 256 bits

// Encrypt
const encrypted = CryptoJS.AES.encrypt(data, aesKey).toString();

// Decrypt
const decrypted = CryptoJS.AES.decrypt(encrypted, aesKey).toString(CryptoJS.enc.Utf8);
```

#### RSA-OAEP-2048 (Rivest-Shamir-Adleman)
- **Type:** Asymmetric encryption
- **Key Size:** 2048 bits
- **Library:** Web Crypto API
- **Padding:** OAEP with SHA-256
- **Use Case:** Encrypting AES keys
- **Speed:** Slower (only used for small data like keys)

```javascript
// Generate key pair
const keyPair = await window.crypto.subtle.generateKey(
  {
    name: "RSA-OAEP",
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256",
  },
  false, // Private key is non-extractable
  ["encrypt", "decrypt"]
);

// Encrypt AES key with public key
const encrypted = await window.crypto.subtle.encrypt(
  { name: "RSA-OAEP" },
  publicKey,
  aesKeyBuffer
);

// Decrypt with private key
const decrypted = await window.crypto.subtle.decrypt(
  { name: "RSA-OAEP" },
  privateKey,
  encryptedBuffer
);
```

### 📦 Data Flow Architecture

```
┌──────────────┐
│   Browser    │
│              │
│ ┌──────────┐ │     ┌─────────────┐
│ │ Private  │ │     │  Blockchain │
│ │   Key    │◄├─────┤  (Sepolia)  │
│ │ (Local)  │ │     │             │
│ └──────────┘ │     │ • Public    │
│              │     │   Keys      │
│ ┌──────────┐ │     │ • Encrypted │
│ │ Decrypt  │ │     │   AES Keys  │
│ │ AES Key  │◄├─────┤ • Access    │
│ └──────────┘ │     │   Control   │
│      │       │     └─────────────┘
│      ↓       │
│ ┌──────────┐ │     ┌─────────────┐
│ │ Decrypt  │ │     │    IPFS     │
│ │   File   │◄├─────┤  (Pinata)   │
│ └──────────┘ │     │             │
│              │     │ • Encrypted │
└──────────────┘     │   Files     │
                     │ • CIDs      │
                     └─────────────┘
```

### 🔐 Key Storage Locations

| Key Type | Storage Location | Extractable? | Who Can Access? |
|----------|-----------------|--------------|-----------------|
| RSA Private Key | Browser IndexedDB | ❌ No | Only the user |
| RSA Public Key | Blockchain | ✅ Yes | Everyone |
| AES Key (plain) | Memory only | ⚠️ Temporary | Current session |
| AES Key (encrypted) | Blockchain | ✅ Yes | Only authorized users can decrypt |
| Encrypted Files | IPFS | ✅ Yes | Everyone (but can't read without key) |

### 🔄 Complete Encryption Flow

```javascript
// ============================================
// CREATING A MEDICAL RECORD
// ============================================

// 1. Doctor uploads file
const file = document.getElementById('fileInput').files[0];

// 2. Convert to Base64
const base64 = await fileToBase64(file);

// 3. Generate AES key
const aesKey = CryptoJS.lib.WordArray.random(32);
const aesKeyHex = aesKey.toString(CryptoJS.enc.Hex);

// 4. Encrypt file with AES
const encrypted = CryptoJS.AES.encrypt(
  JSON.stringify({
    file: { name: file.name, type: file.type, base64 },
    metadata: { timestamp: new Date().toISOString() }
  }),
  aesKeyHex
).toString();

// 5. Upload to IPFS
const { cid } = await uploadToPinata(encrypted);

// 6. Get patient's public key from blockchain
const patientPublicKey = await getUserPublicKey(patientAddress);

// 7. Encrypt AES key with patient's public key
const encryptedKeyForPatient = await encryptAESKeyWithPublicKey(
  aesKeyHex,
  patientPublicKey
);

// 8. Get doctor's own public key
const doctorPublicKey = await getUserPublicKey(doctorAddress);

// 9. Encrypt AES key with doctor's public key (so doctor can view later)
const encryptedKeyForDoctor = await encryptAESKeyWithPublicKey(
  aesKeyHex,
  doctorPublicKey
);

// 10. Store on blockchain
await medicalRecordsContract.addMedicalRecord(
  patientAddress,
  recordId,
  cid,
  encryptedKeyForPatient,
  recordType
);

// ============================================
// VIEWING A MEDICAL RECORD
// ============================================

// 1. Fetch record from blockchain
const record = await medicalRecordsContract.patientMedicalRecord(
  patientAddress,
  recordId
);

// 2. Get encrypted AES key
const encryptedKey = await medicalRecordsContract.getEncryptedAESKey(
  recordId
);

// 3. Get private key from browser storage
const privateKey = await getPrivateKeyFromIndexedDB();

// 4. Decrypt AES key
const aesKeyHex = await decryptAESKeyWithPrivateKey(
  encryptedKey,
  privateKey
);

// 5. Fetch encrypted file from IPFS
const encryptedFile = await fetchFromIPFS(record.cid);

// 6. Decrypt file with AES key
const decrypted = CryptoJS.AES.decrypt(
  encryptedFile,
  aesKeyHex
).toString(CryptoJS.enc.Utf8);

// 7. Parse and display
const fileData = JSON.parse(decrypted);
displayFile(fileData.file);
```

---

## 🎓 Summary for Beginners

### The Simple Version

1. **Medical files are locked with a secret code (AES key)**
2. **The secret code is locked in a special envelope (RSA encryption)**
3. **Only people with the right key can open the envelope**
4. **The locked file is stored in a public place (IPFS)**
5. **The locked envelope is stored on blockchain**
6. **Your private key never leaves your computer**

### Why It Matters

- ✅ **Privacy:** Your medical data is encrypted end-to-end
- ✅ **Control:** You decide who can access your records
- ✅ **Security:** Even if someone steals the encrypted files, they can't read them
- ✅ **Transparency:** All access is recorded on blockchain
- ✅ **Decentralized:** No single company controls your data

---

## 📚 Further Reading

- [AES Encryption Explained](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard)
- [RSA Encryption Explained](https://en.wikipedia.org/wiki/RSA_(cryptosystem))
- [Web Crypto API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [IPFS Documentation](https://docs.ipfs.tech/)
- [Hybrid Encryption Systems](https://en.wikipedia.org/wiki/Hybrid_cryptosystem)

---

**Questions?** Feel free to ask! This is a complex topic, and it's okay if it takes time to fully understand. 😊
