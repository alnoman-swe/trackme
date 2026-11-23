'use server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { prisma, toDate } from '../lib/db.js'
import { canEditPeople, getMe } from '../lib/me.js'
import { REACTIONS, ROLES, fmtDay, isAdmin, isDay } from '../lib/logic.js'
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
  if (isAdmin(me)) {
    // Not awaited: the comment shouldn't wait on mail.
    const about = c.person.id === me.id ? 'their own' : `${c.person.name}'s`
    emailTeam(
      `${me.name} commented on ${about} update (${fmtDay(day, { day: 'numeric', month: 'short' })})`,
      `${me.name} left a comment on ${c.person.name}'s update for ${fmtDay(day)}:\n\n  "${body}"\n\nView it and reply: ${APP_URL()}/?d=${day}#p-${c.person.id}`,
    )
  }
  done()
}

// Add your reaction, or remove it if you already gave that one.
export async function toggleReaction(commentId, emoji) {
  const me = await getMe()
  if (!me) throw new Error('Sign in first')
  if (!REACTIONS.includes(emoji)) throw new Error('Bad reaction')
  const key = { comment_id: Number(commentId), person_id: me.id, emoji }
  const { count } = await prisma.reaction.deleteMany({ where: key })
  if (!count) await prisma.reaction.create({ data: key }).catch(() => {}) // double tap: already there
  done()
}

// Same, on someone's entry for a day.
export async function toggleEntryReaction(ownerId, day, emoji) {
  const me = await getMe()
  if (!me) throw new Error('Sign in first')
  if (!REACTIONS.includes(emoji) || !isDay(day)) throw new Error('Bad reaction')
  const key = { owner_id: Number(ownerId), day: toDate(day), person_id: me.id, emoji }
  const { count } = await prisma.entryReaction.deleteMany({ where: key })
  if (!count) await prisma.entryReaction.create({ data: key }).catch(() => {}) // double tap, or entry just deleted
  done()
}

const APP_URL = () => process.env.APP_URL || 'http://localhost:3000'

// Plain-text email to everyone on the team who has an address (admins included). Returns { sent, of }.
async function emailTeam(subject, message) {
  if (!process.env.RESEND_API_KEY) return { sent: 0, of: 0 }
  const people = await prisma.person.findMany({ where: { active: true, email: { not: '' } } })
  let sent = 0
  // ponytail: one send per person, sequential. Switch to Resend's batch endpoint if the team grows large.
  for (const p of people) {
    await send({ to: p.email, subject, text: `Hi ${p.name},\n\n${message}\n\nTrackMe · ${APP_URL()}\n` })
      .then(() => sent++, (err) => console.error(`[trackme] team email to ${p.email} failed:`, err.message))
  }
  return { sent, of: people.length }
}

// Admin-only: email the admin's text to everyone on the team (admins included).
// Returns a status line for the button instead of throwing.
export async function emailEveryone(text) {
  const me = await getMe()
  if (!isAdmin(me)) return 'Only admins can email everyone'
  const body = String(text ?? '').trim().slice(0, 5000)
  if (!body) return 'Write a message first'
  if (!process.env.RESEND_API_KEY) return 'Email is off: RESEND_API_KEY is not set'
  const { sent, of } = await emailTeam(`Message from ${me.name}`, `${body}\n\n${me.name}`)
  return sent === of ? `Sent to all ${sent}` : `Sent to ${sent} of ${of}. Check the server log for the failures.`
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
