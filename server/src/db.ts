import { PrismaClient } from '@prisma/client';

// Singleton Prisma client — reuse the same instance across the app.
const prisma = new PrismaClient();

export default prisma;
