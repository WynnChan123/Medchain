import prisma from '../lib/prisma.js';

export const verifySignUp = {
  checkDuplicateUsernameOrEmail: async (req, res, next) => {
    try {
      const { username, email } = req.body;
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { username },
            { email }
          ]
        }
      });
      if (user) {
        return res.status(400).json({ message: `Email or username is already in use!` })
      }
      next();
    } catch (error) {
      res.status(500).json({ message: error.message })
    }
  }
};