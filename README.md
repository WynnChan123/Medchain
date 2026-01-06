# MedChain - Decentralized Healthcare System

A blockchain-based healthcare management system built on Ethereum that enables secure medical record storage, role-based access control, and insurance claim processing.

## 🏗️ Project Architecture

This project consists of three main components:

1. **Smart Contracts** (Solidity) - Blockchain layer for data integrity and access control
2. **Backend API** (Node.js/Express) - Off-chain user management and authentication
3. **Frontend** (Next.js/React) - User interface for patients, doctors, insurers, and admins

### Smart Contracts

- **UserManagement.sol** - User registration and role management
- **MedicalRecords.sol** - Medical record storage with IPFS integration
- **AccessControl.sol** - Permission management for medical records
- **RoleUpgrade.sol** - Role upgrade request and approval system
- **ClaimRequest.sol** - Insurance claim submission and processing
- **HealthcareSystem.sol** - Main contract coordinating all modules
- **PatientProfile.sol** - Patient-specific profile data
- **Med2Chain.sol** - Legacy/utility contract

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MetaMask or similar Web3 wallet
- Infura/Alchemy account (for Sepolia deployment)
- Etherscan API key (for contract verification)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd FYP
```

### 2. Install Dependencies

```bash
# Install root dependencies (Hardhat & contracts)
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd medchain
npm install
cd ..
```

### 3. Environment Configuration

Create a `.env` file in the root directory:

```env
# Sepolia Network Configuration
SEPOLIA_RPC=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
SEPOLIA_PRIVATE_KEY=your_private_key_here

# Etherscan API Key (for contract verification)
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

> ⚠️ **Security Warning**: Never commit your `.env` file or expose private keys!

## 🧪 Testing

### Run All Tests

```bash
npm test
```

Or using Hardhat directly:

```bash
npx hardhat test
```

### Run Specific Test File

```bash
npx hardhat test test/med2chain-tests.js
```

### Run Tests with Gas Reporting

```bash
REPORT_GAS=true npx hardhat test
```

### Run Tests with Coverage

```bash
npx hardhat coverage
```

### Test on Local Network

```bash
# Terminal 1: Start local Hardhat node
npx hardhat node

# Terminal 2: Run tests against local network
npx hardhat test --network localhost
```

## 📦 Compilation

Compile all smart contracts:

```bash
npm run compile
```

Or:

```bash
npx hardhat compile
```

Clean and recompile:

```bash
npx hardhat clean
npx hardhat compile
```

## 🌐 Deployment

### Deploy to Sepolia Testnet

```bash
npm run deploy
```

Or using Hardhat directly:

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

### Deployment Order

The contracts are deployed in the following order (as defined in `scripts/deploy.js`):

1. UserManagement
2. MedicalRecordsManagement
3. AccessControlManagement
4. RoleUpgrade
5. ClaimRequest
6. HealthcareSystem

### Post-Deployment Scripts

After deployment, run authorization scripts:

```bash
# Authorize contracts to interact with each other
npx hardhat run scripts/authorize-contracts.js --network sepolia

# Verify contract deployments
npx hardhat run scripts/check-contracts.js --network sepolia
```

## ✅ Contract Verification

### Verify Single Contract on Etherscan

After deploying to Sepolia, verify your contracts:

```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

### Examples

**Verify UserManagement (no constructor args):**
```bash
npx hardhat verify --network sepolia 0xYourContractAddress
```

**Verify MedicalRecordsManagement (with constructor args):**
```bash
npx hardhat verify --network sepolia 0xYourContractAddress 0xUserManagementAddress
```

**Verify HealthcareSystem (multiple constructor args):**
```bash
npx hardhat verify --network sepolia 0xYourContractAddress \
  0xUserManagementAddress \
  0xMedicalRecordsAddress \
  0xAccessControlAddress \
  0xRoleUpgradeAddress \
  0xClaimRequestAddress
```

### Verify All Contracts

Create a verification script or verify each contract individually after deployment. Make sure to save all deployed contract addresses from the deployment output.

## 🔧 Development Commands

### Hardhat Console

Interact with deployed contracts:

```bash
# Local network
npx hardhat console

# Sepolia network
npx hardhat console --network sepolia
```

### Check Hardhat Configuration

```bash
npx hardhat config
```

### List Available Tasks

```bash
npx hardhat help
```

### Flatten Contracts (for verification)

```bash
npx hardhat flatten contracts/HealthcareSystem.sol > flattened/HealthcareSystem.sol
```

## 🏃 Running the Full Application

### 1. Start Backend Server

```bash
cd backend
npm start
```

Backend runs on `http://localhost:5000`

### 2. Start Frontend Development Server

```bash
cd medchain
npm run dev
```

Frontend runs on `http://localhost:3000`

## 📁 Project Structure

```
FYP/
├── contracts/              # Solidity smart contracts
│   ├── UserRegistry.sol
│   ├── MedicalRecords.sol
│   ├── AccessControl.sol
│   ├── RoleUpgrade.sol
│   ├── ClaimRequest.sol
│   ├── HealthcareSystem.sol
│   ├── PatientProfile.sol
│   └── Med2Chain.sol
├── scripts/               # Deployment and utility scripts
│   ├── deploy.js
│   ├── authorize-contracts.js
│   └── check-contracts.js
├── test/                  # Contract tests
│   └── med2chain-tests.js
├── backend/               # Express.js backend
│   └── src/
├── medchain/              # Next.js frontend
│   └── src/
├── hardhat.config.ts      # Hardhat configuration
├── package.json           # Root dependencies
└── .env                   # Environment variables (not committed)
```

## 🧑‍💻 User Roles

1. **Patient** - Can view their medical records and grant/revoke access
2. **Healthcare Provider (Doctor)** - Can create and view medical records
3. **Insurer** - Can process insurance claims
4. **Admin** - Can approve role upgrade requests

## 🔐 Security Features

- Role-based access control (RBAC)
- Encrypted medical records stored on IPFS
- On-chain access permissions
- Multi-signature approval for role upgrades
- Secure key management with Web Crypto API

## 🛠️ Technology Stack

- **Blockchain**: Ethereum (Sepolia Testnet)
- **Smart Contracts**: Solidity 0.8.28
- **Development Framework**: Hardhat
- **Frontend**: Next.js 15, React, TypeScript, TailwindCSS
- **Backend**: Node.js, Express.js
- **Storage**: IPFS (Pinata)
- **Testing**: Chai, Mocha, Hardhat Toolbox

## 📝 Available NPM Scripts

```bash
npm run compile    # Compile smart contracts
npm run test       # Run contract tests
npm run deploy     # Deploy to Sepolia network
```

## 🐛 Troubleshooting

### Common Issues

**Issue: "Error: insufficient funds for gas"**
- Solution: Ensure your wallet has enough Sepolia ETH. Get testnet ETH from [Sepolia Faucet](https://sepoliafaucet.com/)

**Issue: "Error: network does not support ENS"**
- Solution: This is expected on Sepolia. The contracts will work normally.

**Issue: Contract verification fails**
- Solution: Ensure you're using the exact constructor arguments from deployment
- Try using the `--constructor-args` flag with a separate arguments file

**Issue: Tests timeout**
- Solution: Increase timeout in `hardhat.config.ts` network settings (currently 120000ms)

## 📄 License

This project is licensed under the ISC License.

## 👥 Contributors

- Wynn Chan

## 🔗 Useful Links

- [Hardhat Documentation](https://hardhat.org/docs)
- [Sepolia Testnet Explorer](https://sepolia.etherscan.io/)
- [Sepolia Faucet](https://sepoliafaucet.com/)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts/)
- [IPFS Documentation](https://docs.ipfs.tech/)

---

**Note**: This is a educational/prototype project. For production use, conduct thorough security audits and follow best practices for handling sensitive medical data.
