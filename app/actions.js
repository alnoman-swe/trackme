'use server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { prisma, toDate } from '../lib/db.js'
import { canEditPeople, getMe } from '../lib/me.js'
import { ROLES, isDay } from '../lib/logic.js'

const done = () => revalidatePath('/', 'layout')

export async function signOut() {
  ;(await cookies()).delete('me')
  done()
}

export async function saveEntry(day, body) {
  const me = await getMe()
  if (!me) throw new Error('Sign in first')
  if (!isDay(day) || typeof body !== 'string') throw new Error('Bad entry')
  body = body.slice(0, 20000)
  const key = { person_id: me.id, day: toDate(day) }
  // Only empty list numbers ("1.") counts as not written
  if (!body.replace(/^\s*\d+\.\s*$/gm, '').trim()) await prisma.entry.deleteMany({ where: key })
  else await prisma.entry.upsert({ where: { person_id_day: key }, create: { ...key, body }, update: { body } })
  done()
}

export async function addComment(personId, day, formData) {
  const me = await getMe()
  const body = String(formData.get('body') ?? '').trim().slice(0, 2000)
  if (!me) throw new Error('Sign in first')
  if (!isDay(day) || !body) return
  await prisma.comment.create({ data: { person_id: Number(personId), day: toDate(day), author_id: me.id, body } })
  done()
}

export async function savePerson(formData) {
  if (!canEditPeople(await getMe())) throw new Error('Only admins can edit people')
  const id = Number(formData.get('id')) || null
  const name = String(formData.get('name') ?? '').trim().slice(0, 80)
  const role = String(formData.get('role'))
  const email = String(formData.get('email') ?? '').trim().slice(0, 200)
  if (!name || !ROLES.includes(role) || (email && !/^\S+@\S+\.\S+$/.test(email))) throw new Error('Check the name, role and email')
  if (id) {
    await prisma.person.update({ where: { id }, data: { name, role, email, active: formData.get('active') === 'on' } })
  } else {
    await prisma.person.create({ data: { name, role, email } })
  }
  done()
}

// Deletes the person and everything they wrote or got commented on. Untick "On the team" to keep history instead.
export async function deletePerson(formData) {
  const me = await getMe()
  if (!canEditPeople(me)) throw new Error('Only admins can delete people')
  const id = Number(formData.get('id'))
  if (!id || id === me.id) throw new Error("You can't delete yourself")
  await prisma.$transaction([
    prisma.comment.deleteMany({ where: { OR: [{ person_id: id }, { author_id: id }] } }),
    prisma.entry.deleteMany({ where: { person_id: id } }),
    prisma.person.delete({ where: { id } }),
  ])
  done()
}
