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
                email: true,
                // role: true,
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
                email: true,
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
}
