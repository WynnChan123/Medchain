import express from 'express';
import {
  createOrganization,
  getOrganizations,
} from '../controllers/organization.controller.js';

const router = express.Router();

router.post('/createOrganization', (res, req) => {
  try {
    createOrganization(res, req);
    console.log('Created organization successfully.');
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/getOrganizations', (res, req) => {
  getOrganizations(res, req);
  console.log('Get organizations received.');
});

export default router;
