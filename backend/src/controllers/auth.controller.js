import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import authConfig from '../config/auth.config.js';

export const signUp = async (req, res) => {
  const { name, email, password, role, organizationName } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Validate role if provided
    if (role && !['Patient', 'HealthcareProvider', 'Insurer', 'Admin'].includes(role)) {
      return res.status(400).json({ message: "Invalid role. Must be one of: Patient, HealthcareProvider, Insurer, Admin" });
    }

    // Find organization by name
    const organization = await prisma.organization.findFirst({
      where: { name: organizationName }
    });

    if (!organization) {
      return res.status(400).json({
        message: "Organization not found. Please check the organization name."
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
        publicKey: 'temp-key' // You should generate this properly
      }
    });

    res.status(201).json({
      message: "User registered successfully",
      userId: newUser.id,
      organization: organization.name
    });
  } catch (error) {
    return res.status(500).json({ message: "Error creating user", error: error.message });
  }
}

export const logIn = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        organization: true // Include organization details
      }
    });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isPassWordValid = await bcrypt.compare(password, user.password);
    if (!isPassWordValid) {
      return res.status(401).json({ accessToken: null, message: "Invalid Password" });
    }

    const token = jwt.sign({
      id: user.id,
      role: user.role,
      organizationId: user.organizationId
    }, authConfig.secret, {
      expiresIn: '1h'
    });

    res.status(200).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organization: user.organization.name
      }
    });

  } catch (error) {
    return res.status(500).json({ message: "Error logging in", error: error.message });
  }
}