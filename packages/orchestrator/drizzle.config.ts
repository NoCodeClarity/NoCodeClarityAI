import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    connectionString: process.env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@localhost:5432/nocodeclarity',
  },
} satisfies Config
