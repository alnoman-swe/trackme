import { cache } from 'react'
import { cookies } from 'next/headers'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { prisma } from './db.js'
import { isAdmin } from './logic.js'

// The "me" cookie is "<personId>.<hmac>", set after Google sign-in (app/auth/callback).
const sig = (id) => createHmac('sha256', process.env.AUTH_SECRET).update(String(id)).digest('base64url')

export const signId = (id) => `${id}.${sig(id)}`

export function readId(value) {
  const [id, mac] = String(value ?? '').split('.')
  if (!id || !mac || !process.env.AUTH_SECRET) return null
  const a = Buffer.from(mac), b = Buffer.from(sig(id))
  return a.length === b.length && timingSafeEqual(a, b) ? Number(id) : null
}

export const getMe = cache(async () => {
  const id = readId((await cookies()).get('me')?.value)
  if (!id) return null
  return prisma.person.findFirst({ where: { id, active: true } })
})

// Admins (ADMIN_EMAILS in .env) edit people.
export const canEditPeople = (me) => isAdmin(me)
