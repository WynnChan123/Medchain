import prisma from '../lib/prisma.js';

// Function to validate Ethereum address format
const isValidEthereumAddress = (address) => {
  // Check if address starts with 0x and is 42 characters long (0x + 40 hex characters)
  return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const createOrganization = async (req, res) => {
  const { name, type, address } = req.body;

  try {
    // Validate organization type
    if (!['Hospital', 'Insurer', 'Laboratory'].includes(type)) {
      return res.status(400).json({
        message: "Invalid organization type. Must be one of: Hospital, Insurer, Laboratory"
      });
    }

    // Validate blockchain address
    if (!isValidEthereumAddress(address)) {
      return res.status(400).json({
        message: "Invalid blockchain address. Must be a valid Ethereum address (0x followed by 40 hexadecimal characters)"
      });
    }

    const organization = await prisma.organization.create({
      data: {
        name,
        Type: type,
        address
      }
    });

    res.status(201).json({
      message: "Organization created successfully",
      organization
    });
  } catch (error) {
    res.status(500).json({
      message: "Error creating organization",
      error: error.message
    });
  }
};

export const getOrganizations = async (req, res) => {
  try {
    const organizations = await prisma.organization.findMany();
    res.status(200).json(organizations);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching organizations",
      error: error.message
    });
  }
}; 