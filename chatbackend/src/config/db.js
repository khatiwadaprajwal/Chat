import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Prisma connected to PostgreSQL');
  } catch (err) {
    console.error('❌ DB connection error:', err);
    process.exit(1);
  }
};

export const closeDB = async () => {
  try {
    await prisma.$disconnect();
    console.log('🔌 Database connection closed');
  } catch (err) {
    console.error('❌ Error closing DB connection:', err);
  }
};

export { prisma };
