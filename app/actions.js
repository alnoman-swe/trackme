'use server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { prisma, toDate } from '../lib/db.js'
import { canEditPeople, getMe } from '../lib/me.js'
import { ROLES, fmtDay, isAdmin, isDay } from '../lib/logic.js'
import { send } from '../lib/cron.js'

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
  const c = await prisma.comment.create({ data: { person_id: Number(personId), day: toDate(day), author_id: me.id, body }, include: { person: true } })
  if (isAdmin(me)) notifyAll(me, c.person, day, body) // not awaited: the comment shouldn't wait on mail
  done()
}

// Admin comment → short email to the whole team, admin included.
async function notifyAll(me, about, day, body) {
  if (!process.env.RESEND_API_KEY) return
  const people = await prisma.person.findMany({ where: { active: true, email: { not: '' } } })
  const url = `${process.env.APP_URL || 'http://localhost:3000'}/?d=${day}#p-${about.id}`
  const subject = `${me.name} commented on ${about.id === me.id ? 'their own' : `${about.name}'s`} update (${fmtDay(day, { day: 'numeric', month: 'short' })})`
  // ponytail: one send per person, sequential. Switch to Resend's batch endpoint if the team grows large.
  for (const p of people) {
    await send({
      to: p.email,
      subject,
      text: `Hi ${p.name},\n\n${me.name} left a comment on ${about.name}'s update for ${fmtDay(day)}:\n\n  "${body}"\n\nView it and reply: ${url}\n\nTrackMe\n`,
    }).catch((err) => console.error(`[trackme] comment email to ${p.email} failed:`, err.message))
  }
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
