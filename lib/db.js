import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../generated/prisma/client'

export const prisma = (globalThis.__prisma ??= new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
}))

// Days are 'YYYY-MM-DD' strings in the app and DATE columns (UTC-midnight Dates) in Prisma.
export const toDate = (day) => new Date(day)
export const toDay = (date) => date.toISOString().slice(0, 10)
