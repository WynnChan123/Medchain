import prisma from '../lib/prisma.js';

export const getUserById = async (userId)=> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
            }
        });
        return user;  
    }catch (error) {
        console.error("Error retrieving user by ID:", error);
        throw new Error("Error retrieving user");
    }
}