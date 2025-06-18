import express from 'express';
import { verifySignUp } from '../middlewares/verifySignUp.js';
import { signUp } from '../controllers/auth.controller.js';
import { logIn } from '../controllers/auth.controller.js';

const router = express.Router();

router.post('/signUp', verifySignUp.checkDuplicateUsernameOrEmail, (req, res) => {
  console.log("SignUp request received");
  signUp(req, res);
});

router.post('/logIn', (req, res) => {
  console.log("Login request received");
  logIn(req, res);
});
export default router;
