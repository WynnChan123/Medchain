import { verifyToken } from "../middlewares/authJwt.js";
import { getUserProfile, updateProfile, changePassword, getUserByWallet, getAllUsersFromDB } from "../controllers/user.controller.js";
import express from 'express';

const router = express.Router();

router.get("/profile", verifyToken, getUserProfile);
router.get("/getByWallet/:walletAddress", verifyToken, getUserByWallet);
router.get("/all", verifyToken, getAllUsersFromDB);
router.put("/update-profile", verifyToken, updateProfile);
router.put("/change-password", verifyToken, changePassword);

export default router;
