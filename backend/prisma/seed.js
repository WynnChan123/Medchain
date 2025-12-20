import { PrismaClient } from '@prisma/client';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Get admin wallet address from environment variable
  const adminWallet = process.env.ADMIN_WALLET_ADDRESS;

  if (!adminWallet) {
    console.warn('⚠️  ADMIN_WALLET_ADDRESS not set in .env file');
    console.warn('⚠️  Skipping admin seed. Please set ADMIN_WALLET_ADDRESS in your .env file');
    console.warn('⚠️  Example: ADMIN_WALLET_ADDRESS=0x1234567890abcdef...');
    return;
  }

  console.log(`📝 Admin wallet address: ${adminWallet}`);

  // Check if admin already exists in database
  const existingPublicKey = await prisma.publicKey.findUnique({
    where: { publicKey: adminWallet },
    include: { user: true },
  });

  if (existingPublicKey) {
    console.log('✅ Admin wallet already registered in database');
    console.log(`   User ID: ${existingPublicKey.user.id}`);
    console.log(`   User Name: ${existingPublicKey.user.name}`);
    return;
  }

  // Create admin user
  console.log('🔨 Creating admin user in database...');
  
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin',
      publicKeys: {
        create: {
          publicKey: adminWallet,
        },
      },
    },
    include: {
      publicKeys: true,
    },
  });

  console.log('✅ Admin user created successfully!');
  console.log(`   User ID: ${adminUser.id}`);
  console.log(`   User Name: ${adminUser.name}`);
  console.log(`   Wallet Address: ${adminUser.publicKeys[0].publicKey}`);
  console.log('');
  console.log('🎉 Database seed completed!');
  console.log('💡 You can now login with your admin wallet address');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });