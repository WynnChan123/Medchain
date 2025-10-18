import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client'; // Import PrismaClient
import authRoutes from './src/routes/auth.routes.js';
import userRoutes from './src/routes/user.routes.js';
import organizationRoutes from './src/routes/organization.routes.js';
import contractRoutes from './src/routes/contract.routes.js';
import uploadRoutes from './src/routes/upload.routes.js';
import etherscanRoutes from './src/routes/upload.routes.js';

const app = express();
const prisma = new PrismaClient(); // Initialize PrismaClient

const corsOptions = {
  origin: '*',
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true
};

app.use(cors(corsOptions));

// Parse requests of content-type - application/json
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));
// // Parse requests of content-type - application/x-www-form-urlencoded

// Simple route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the Node.js JWT Authentication application.',
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/contract', contractRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/etherscan', etherscanRoutes);

// Set port, listen for requests
const PORT = process.env.PORT || 8080;

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}.`);
  try {
    // Test Prisma connection
    await prisma.$connect();
    console.log('Prisma connected to the database.');
  } catch (error) {
    console.error('Prisma connection error:', error);
    process.exit(1); // Exit if connection fails
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
