import 'dotenv/config';

export default {
  secret: process.env.JWT_SECRET || 'c49d4ff64e709b0694a367bc35096e9e2471a8b78007b816cf59bda33d25e1e7',
};