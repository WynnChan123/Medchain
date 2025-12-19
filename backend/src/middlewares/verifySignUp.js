import prisma from '../lib/prisma.js';

export const verifySignUp = {
  checkDuplicateUsername: async (req, res, next) => {
    try {
      const { name } = req.body;
      
      // Validate that name is provided
      if (!name || name.trim() === '') {
        return res.status(400).json({ message: 'Username is required!' });
      }
      
      // Check for duplicate username
      let user = await prisma.user.findFirst({
        where: {
          name: name.trim(),
        }
      });
      
      if (user) {
        return res.status(400).json({ message: `Username is already in use!` })
      }
      
      next();
    } catch (error) {
      res.status(500).json({ message: error.message })
    }
  }
};