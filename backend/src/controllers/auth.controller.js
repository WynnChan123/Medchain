import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import authConfig from '../config/auth.config.js';
import { isAddress } from 'ethers';

export const signUp = async (req, res) => {
  const { name, email, password, role, organizationName } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Validate role if provided
    if (
      role &&
      !['Patient', 'HealthcareProvider', 'Insurer', 'Admin'].includes(role)
    ) {
      return res
        .status(400)
        .json({
          message:
            'Invalid role. Must be one of: Patient, HealthcareProvider, Insurer, Admin',
        });
    }

    // Find organization by name
    let organization = await prisma.organization.findFirst({
      where: { name: organizationName },
    });

    // If organization doesn't exist, create it
    if (!organization) {
      console.log(`Creating new organization: ${organizationName}`);
      organization = await prisma.organization.create({
        data: {
          name: organizationName,
          Type: 'Hospital', // Default type
          address: '0x0000000000000000000000000000000000000000', // Default address
        },
      });
    }

    const hashedPassword = await bcrypt.hash(password, 8);
    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: role || 'Patient', // Default to Patient if not provided
        organizationId: organization.id,
      },
    });

    res.status(201).json({
      message: 'User registered successfully',
      userId: newUser.id,
      organization: organization.name,
    });
  } catch (error) {
    console.error('Sign up error:', error);
    return res
      .status(500)
      .json({ message: 'Error creating user', error: error.message });
  }
};

export const logIn = async (req, res) => {
  const { email, password, publicKey } = req.body;

  try {
    if (!email || !password || !publicKey || !isAddress(publicKey)) {
      return res
        .status(400)
        .json({ message: 'Email, password, and publicKey are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organization: true,
      },
    });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isPassWordValid = await bcrypt.compare(password, user.password);
    if (!isPassWordValid) {
      return res
        .status(401)
        .json({ accessToken: null, message: 'Invalid Password' });
    }

    let keyRecord;
    try {
      keyRecord = await prisma.publicKey.findUnique({
        where: { publicKey }
      });

      if (!keyRecord) {
        keyRecord = await prisma.publicKey.create({
          data: {
            userId: user.id,
            publicKey: publicKey,
          },
        });
      } else if (keyRecord.userId !== user.id) {
        // This publicKey is already associated with another user
        return res.status(400).json({
          message: 'This wallet address is already associated with another user.'
        });
      }
    } catch (error) {
      return res.status(500).json({
        message: 'Failed to register a new public key',
        error: error.message,
      });
    }

    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        organizationId: user.organizationId,
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
        email: user.email,
        role: user.role,
        organization: user.organization.name,
        publicKey: keyRecord.publicKey,
      },
    });
  } catch (error) {
    return res
      .status(500)
      .json({ message: 'Error logging in', error: error.message });
  }
};
