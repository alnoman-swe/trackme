import { defineConfig } from 'prisma/config'

try {
  process.loadEnvFile() // .env in development; real env vars in production
} catch {}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL },
})
