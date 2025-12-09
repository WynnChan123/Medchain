import { verifyToken } from "../middlewares/authJwt.js";
import { getUserProfile, updateProfile, changePassword } from "../controllers/user.controller.js";
import express from 'express';

const router = express.Router();

router.get("/profile", verifyToken, getUserProfile);
router.put("/update-profile", verifyToken, updateProfile);
router.put("/change-password", verifyToken, changePassword);

export default router;
