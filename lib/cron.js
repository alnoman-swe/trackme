import { prisma, toDate } from './db.js'
import { config, dueEmails, fmtDay, nowParts } from './logic.js'

export async function tick() {
  if (!process.env.RESEND_API_KEY) return
  const cfg = config()
  const { day, hhmm } = nowParts(cfg.tz)
  for (const kind of dueEmails(day, hhmm, cfg)) {
    // The insert is the lock: only the first tick of the day creates the row.
    const { count } = await prisma.sentEmail.createMany({ data: [{ day: toDate(day), kind }], skipDuplicates: true })
    if (!count) continue

    const rows = await prisma.person.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
      include: { entries: { where: { day: toDate(day) } } },
    })
    const people = rows.map((p) => ({ ...p, wrote: p.entries.length > 0 }))
    const url = `${process.env.APP_URL || 'http://localhost:3000'}/?d=${day}`
    const missing = people.filter((p) => !p.wrote)
    const names = (list) => list.map((p) => `  - ${p.name}`).join('\n') || '  (nobody)'

    const mails = kind === 'remind'
      ? missing.filter((p) => p.email).map((p) => ({
          to: p.email,
          subject: "Please write today's work update",
          text: `Hi ${p.name},\n\nYou haven't written what you got done today (${fmtDay(day)}).\nIt takes a minute: ${url}\n`,
        }))
      : people.filter((p) => p.is_admin && p.email).map((p) => ({
          to: p.email,
          subject: `Daily updates for ${fmtDay(day)}: ${people.length - missing.length} of ${people.length} written`,
          text: `Written:\n${names(people.filter((p) => p.wrote))}\n\nNot written:\n${names(missing)}\n\n${url}\n`,
        }))

    // ponytail: a failed email is logged, not retried. Add a retry queue if mail proves flaky.
    for (const mail of mails) {
      await send(mail).catch((err) => console.error(`[trackme] ${kind} email to ${mail.to} failed:`, err.message))
    }
    console.log(`[trackme] ${kind} for ${day}: ${mails.length} email(s)`)
  }
}

async function send(mail) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: process.env.MAIL_FROM, ...mail }),
  })
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`)
}

export async function start() {
  if (globalThis.__trackmeStarted) return
  globalThis.__trackmeStarted = true
  if (!process.env.RESEND_API_KEY) console.warn('[trackme] RESEND_API_KEY is empty: emails are off')
  // ponytail: in-process timer, needs one always-on server. Use a cron-triggered route on serverless.
  setInterval(() => tick().catch((err) => console.error('[trackme] tick failed:', err)), 60_000)
}
