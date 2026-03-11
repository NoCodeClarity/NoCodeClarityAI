// drizzle.config.ts — Drizzle Kit migration config
// Uses defineConfig for proper type inference with the postgresql dialect

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql' as const,
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@localhost:5432/nocodeclarity',
  },
}
