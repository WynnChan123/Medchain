import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import authConfig from '../config/auth.config.js';
import { ethers, isAddress } from 'ethers';
import 'dotenv/config';

const DEPLOYED_CONTRACT = process.env.CONTRACT_ADDRESS;

export const signUp = async (req, res) => {
  const { name, publicKey } = req.body;

  try {
    // Validate required fields
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    if (!publicKey) {
      return res.status(400).json({ message: 'Wallet address (publicKey) is required' });
    }

    // Create user with linked wallet address
    const newUser = await prisma.user.create({
      data: { 
        name,
        publicKeys: {
          create: {
            publicKey: publicKey,
          },
        },
      },
    });

    res.status(201).json({
      message: 'User registered successfully',
      userId: newUser.id,
    });
  } catch (error) {
    console.error('Sign up error:', error);
    return res
      .status(500)
      .json({ message: 'Error creating user', error: error.message });
  }
};

export const logIn = async (req, res) => {
  const { publicKey } = req.body;

  try {
    if (!publicKey || !isAddress(publicKey)) {
      return res
        .status(400)
        .json({ message: 'Valid wallet address is required for login' });
    }

    // Check blockchain status before allowing login
    try {
      const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC);
      
      // Load UserManagement contract ABI
      const userManagementABI = [
        "function userExists(address user) external view returns (bool)"
      ];
      const userManagementContract = new ethers.Contract(
        process.env.USER_MANAGEMENT_ADDRESS,
        userManagementABI,
        provider
      );

      // Load RoleUpgrade contract ABI
      const roleUpgradeABI = [
        "function getPendingRequestByUser(address userAddress) external view returns (tuple(uint requestId, uint8 newRole, bool isProcessed, bool isApproved, address[] adminAddresses, address requester, uint256 timestamp, string cid)[])"
      ];
      const roleUpgradeContract = new ethers.Contract(
        process.env.ROLE_UPGRADE_ADDRESS,
        roleUpgradeABI,
        provider
      );

      // Check if user exists on blockchain
      const existsOnChain = await userManagementContract.userExists(publicKey);
      
      // Check if user has pending role upgrade requests
      let hasPendingRequest = false;
      try {
        const pendingRequests = await roleUpgradeContract.getPendingRequestByUser(publicKey);
        hasPendingRequest = pendingRequests && pendingRequests.length > 0;
      } catch (error) {
        console.log('Error checking pending requests:', error.message);
        // Continue - user might not have any requests
      }

      // If user doesn't exist on-chain AND has no pending requests, deny login
      // This is typically for patients who need to register first
      if (!existsOnChain && !hasPendingRequest) {
        return res.status(403).json({ 
          message: 'User not registered, please register an account first' 
        });
      }

      console.log('Blockchain validation passed:', {
        publicKey,
        existsOnChain,
        hasPendingRequest
      });

    } catch (blockchainError) {
      console.error('Blockchain validation error:', blockchainError);
      // If blockchain check fails, deny login for security
      return res.status(500).json({ 
        message: 'Unable to verify blockchain status. Please try again later.',
        error: blockchainError.message 
      });
    }

    // First, check if this publicKey already exists in database
    let keyRecord = await prisma.publicKey.findUnique({
      where: { publicKey },
      include: { user: true }, // Include the associated user
    });

    let user;
    
    if (keyRecord) {
      // PublicKey exists, use the associated user
      user = keyRecord.user;
    } else {
      // User doesn't exist in database yet, but is valid on blockchain
      // Create a user record to allow login
      // This allows users with pending role upgrade requests to login
      // and see their dashboard with unverified status
      console.log('Creating new user record for wallet:', publicKey);
      
      // Try to fetch the user's name from blockchain (for users with pending requests)
      let userName = 'User'; // Default fallback
      
      try {
        const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC);
        
        // Check if user has pending role upgrade request with their name
        const roleUpgradeABI = [
          "function getPendingRequestByUser(address userAddress) external view returns (tuple(uint requestId, uint8 newRole, bool isProcessed, bool isApproved, address[] adminAddresses, address requester, uint256 timestamp, string cid)[])",
          "function providerProfiles(address) external view returns (string doctorName, bool isRegistered, uint256 registrationTimestamp)",
          "function insurerProfiles(address) external view returns (string companyName, bool isRegistered, uint256 registrationTimestamp)"
        ];
        const roleUpgradeContract = new ethers.Contract(
          process.env.ROLE_UPGRADE_ADDRESS,
          roleUpgradeABI,
          provider
        );

        // Check if user is an approved provider/insurer with a profile
        try {
          const providerProfile = await roleUpgradeContract.providerProfiles(publicKey);
          if (providerProfile.isRegistered && providerProfile.doctorName) {
            userName = providerProfile.doctorName;
            console.log('Found doctor name from blockchain:', userName);
          }
        } catch (e) {
          // Not a provider, try insurer
          try {
            const insurerProfile = await roleUpgradeContract.insurerProfiles(publicKey);
            if (insurerProfile.isRegistered && insurerProfile.companyName) {
              userName = insurerProfile.companyName;
              console.log('Found company name from blockchain:', userName);
            }
          } catch (e2) {
            // Not an insurer either, keep default 'User'
            console.log('No profile found on blockchain, using default name');
          }
        }
      } catch (error) {
        console.log('Error fetching name from blockchain:', error.message);
        // Keep default 'User' name
      }
      
      user = await prisma.user.create({
        data: {
          name: userName,
          publicKeys: {
            create: {
              publicKey: publicKey,
            },
          },
        },
      });
      
      console.log('New user created with ID:', user.id, 'and name:', userName);
    }

    const token = jwt.sign(
      {
        id: user.id,
      },
      authConfig.secret,
      {
        expiresIn: '1h',
      }
    );

    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        publicKey: publicKey, // Use the publicKey from request, not keyRecord
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res
      .status(500)
      .json({ message: 'Error logging in', error: error.message });
  }
};
