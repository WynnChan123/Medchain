import { verifyToken } from "../middlewares/authJwt.js";
import { getUserProfile } from "../controllers/user.controller.js";
import express from 'express';

const router = express.Router();

router.get("/profile", verifyToken, getUserProfile);

export default router;