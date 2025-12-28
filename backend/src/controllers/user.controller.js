import prisma from "../lib/prisma.js";
import bcrypt from 'bcryptjs';

export const getUserProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
            }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json(user);
    } catch (error) {
        return res.status(500).json({ message: "Error retrieving user profile", error });
    }
}

export const updateProfile = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { name } = req.body;

        // Validation
        if (!name || name.trim() === '') {
            return res.status(400).json({ message: "Name cannot be empty" });
        }

        // Update user profile
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: { name: name.trim() },
            select: {
                id: true,
                name: true,
            }
        });

        res.status(200).json({ 
            message: "Profile updated successfully", 
            user: updatedUser 
        });
    } catch (error) {
        console.error("Error updating profile:", error);
        return res.status(500).json({ message: "Error updating profile", error: error.message });
    }
}

export const changePassword = async (req, res) => {
    // Password functionality disabled - using wallet-based authentication only
    return res.status(400).json({ 
        message: "Password authentication is disabled. This application uses wallet-based authentication only." 
    });
    
    /* DISABLED - Password field removed from schema
    try {
        const userId = req.user.userId;
        const { currentPassword, newPassword } = req.body;

        // Validation
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ message: "Current password and new password are required" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters long" });
        }

        // Get user with password
        const user = await prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Current password is incorrect" });
        }

        // Check if new password is same as current
        const isSamePassword = await bcrypt.compare(newPassword, user.password);
        if (isSamePassword) {
            return res.status(400).json({ message: "New password must be different from current password" });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await prisma.user.update({
            where: { id: userId },
            data: { password: hashedPassword }
        });

        res.status(200).json({ message: "Password changed successfully" });
    } catch (error) {
        console.error("Error changing password:", error);
        return res.status(500).json({ message: "Error changing password", error: error.message });
    }
    */
}

export const getUserByWallet = async (req, res) => {
    try {
        const { walletAddress } = req.params;

        if (!walletAddress) {
            return res.status(400).json({ message: "Wallet address is required" });
        }

        // First, try to find user by wallet address
        const walletAddressRecord = await prisma.walletAddress.findUnique({
            where: { walletAddress: walletAddress },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        createdAt: true
                    }
                }
            }
        });

        if (walletAddressRecord && walletAddressRecord.user) {
            return res.status(200).json(walletAddressRecord.user);
        }

        // If not found by wallet, return 404 (user hasn't logged in yet)
        return res.status(404).json({ 
            message: "User not found with this wallet address. User may not have logged in yet." 
        });
    } catch (error) {
        console.error("Error fetching user by wallet:", error);
        return res.status(500).json({ message: "Error fetching user", error: error.message });
    }
}

export const getAllUsersFromDB = async (req, res) => {
    try {
        // Fetch all users with their public keys (wallet addresses)
        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                createdAt: true,
                walletAddresses: {
                    select: {
                        walletAddress: true
                    }
                }
            }
        });

        // Transform the data to include wallet addresses
        const usersWithWallets = users.map(user => ({
            id: user.id,
            name: user.name,
            createdAt: user.createdAt,
            walletAddresses: user.walletAddresses.map(wa => wa.walletAddress)
        }));

        res.status(200).json(usersWithWallets);
    } catch (error) {
        console.error("Error fetching all users:", error);
        return res.status(500).json({ message: "Error fetching users", error: error.message });
    }
}
