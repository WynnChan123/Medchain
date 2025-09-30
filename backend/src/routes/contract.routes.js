import express from 'express';
import { getContractABI } from '../controllers/contract.controller.js';

const router = express.Router();

// Backward-compatible route
router.get('/abi/:address', (req, res) => {
  getContractABI(req, res);
  console.log('Get contract ABI request received.');
});

export default router;