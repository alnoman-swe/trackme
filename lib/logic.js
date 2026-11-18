// Pure helpers: no database, no Next. Tested in logic.test.js.
export const ROLES = ['Dev', 'QA', 'Manager', 'Leader', 'Admin']

export function config(env = process.env) {
  return {
    tz: env.APP_TZ || undefined, // undefined = server timezone
    workDays: (env.WORK_DAYS || '1,2,3,4,5').split(',').map(Number),
    // padded so '9:00' compares correctly against '09:30'
    remindAt: (env.REMIND_AT || '18:00').padStart(5, '0'),
    summaryAt: (env.SUMMARY_AT || '20:00').padStart(5, '0'),
  }
}

// { day: 'YYYY-MM-DD', hhmm: 'HH:MM' } in the given timezone
export function nowParts(tz, now = new Date()) {
  const s = now.toLocaleString('sv-SE', { timeZone: tz }) // "2026-11-14 09:13:05"
  return { day: s.slice(0, 10), hhmm: s.slice(11, 16) }
}

// Round-trip check: V8 rolls '2026-02-31' over to March 3 instead of rejecting it.
export const isDay = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s
export const weekday = (day) => new Date(day + 'T00:00:00Z').getUTCDay()
export const isWorkDay = (day, workDays) => workDays.includes(weekday(day))

export function addDays(day, n) {
  const d = new Date(day + 'T00:00:00Z')
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

// A day off: not a working day, or a past day on which nobody wrote (holiday).
export function isOff(day, today, wroteCount, workDays) {
  return !isWorkDay(day, workDays) || (day < today && wroteCount === 0)
}

// Which emails should have gone out by now today.
export function dueEmails(day, hhmm, cfg) {
  if (!isWorkDay(day, cfg.workDays)) return []
  return [hhmm >= cfg.remindAt && 'remind', hhmm >= cfg.summaryAt && 'summary'].filter(Boolean)
}

export const fmtDay = (day, opts = { weekday: 'long', day: 'numeric', month: 'long' }) =>
  new Date(day + 'T00:00:00Z').toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' })

// Enter inside a "1. " list: continue with "2. ". Enter on an empty item ends the list.
// Returns { text, caret } or null to let the textarea do a normal newline.
export function continueList(text, caret) {
  const start = text.lastIndexOf('\n', caret - 1) + 1
  const m = /^(\s*)(\d+)\.(?!\d)( *)(.*)$/.exec(text.slice(start, caret))
  if (!m) return null
  if (!m[4].trim() && !text.slice(caret).split('\n')[0].trim()) {
    return { text: text.slice(0, start) + text.slice(caret), caret: start }
  }
  const add = `\n${m[1]}${Number(m[2]) + 1}.${m[3]}`
  return { text: text.slice(0, caret) + add + text.slice(caret), caret: caret + add.length }
}

// Admins: role Admin, or email listed in ADMIN_EMAILS (comma-separated).
export const isAdmin = (p) => {
  if (p?.role === 'Admin') return true
  const email = p?.email?.trim().toLowerCase()
  return !!email && (process.env.ADMIN_EMAILS ?? '').toLowerCase().split(',').map((s) => s.trim()).includes(email)
}
