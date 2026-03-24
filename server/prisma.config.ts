import 'dotenv/config';
import { defineConfig } from 'prisma/config';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('[prisma.config] DATABASE_URL is not set; Prisma CLI commands that talk to Postgres will fail.');
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: {
    url: databaseUrl ?? '',
  },
});

