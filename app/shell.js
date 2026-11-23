import Link from 'next/link'
import { prisma, toDate, toDay } from '../lib/db.js'
import { getMe } from '../lib/me.js'
import { ROLES, addDays, config, fmtDay, isWorkDay, nowParts } from '../lib/logic.js'
import { addComment, signOut } from './actions.js'
import { Refresher, Unread } from './ui.js'
import { Md } from './md.js'
import { Reactions } from './reactions.js'

const ICONS = {
  columns: 'M3 3h18v18H3zM9 3v18M15 3v18',
  grid: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z',
  people: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  check: 'M20 6 9 17l-5-5',
  clock: 'M12 6v6l4 2M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z',
  chat: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z',
  send: 'M22 2 11 13M22 2l-7 20-4-9-9-4z',
  left: 'M15 18l-6-6 6-6',
  right: 'M9 18l6-6-6-6',
  swap: 'M16 3l4 4-4 4M20 7H4M8 21l-4-4 4-4M4 17h16',
  plus: 'M12 5v14M5 12h14',
  Dev: 'M16 18l6-6-6-6M8 6l-6 6 6 6',
  QA: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4',
  Manager: 'M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16M4 6h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z',
  Leader: 'M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7',
  Admin: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
}

export const Icon = ({ name }) => (
  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS[name]} /></svg>
)

// An icon on a coloured square. Colour comes from `tint` or the surrounding data-role.
export const Tile = ({ icon, tint }) => (
  <span className="tile" style={tint && { '--tint': tint }}><Icon name={icon} /></span>
)

// 3D people from Microsoft Fluent Emoji (MIT), stored in public/avatars/0..31.png.
// Picked by id so each person keeps the same face. backgroundColor (not background) so the CSS gloss gradient survives.
const AVATAR_COUNT = 32
const AVATAR_BG = ['#ffd166', '#8ecae6', '#ff9f9f', '#b8e986', '#cdb4ff', '#ffb3d9', '#7ee0c3', '#ffc285']

export const Avatar = ({ person }) => (
  <span className="avatar" data-role={person.role} style={{ backgroundColor: AVATAR_BG[person.id % AVATAR_BG.length] }} aria-hidden="true">
    <img src={`/avatars/${person.id % AVATAR_COUNT}.png`} alt="" loading="lazy" />
  </span>
)

export function PersonFields({ person }) {
  return (
    <>
      <input name="name" defaultValue={person?.name} placeholder="Name" aria-label="Name" required maxLength={80} />
      {/* key remounts on save: React won't update a select's default, so the post-action form reset would restore the old role */}
      <select key={person?.role} name="role" defaultValue={person?.role ?? 'Dev'} aria-label="Role">
        {ROLES.map((r) => <option key={r}>{r}</option>)}
      </select>
      <input name="email" type="email" defaultValue={person?.email} placeholder="Email for reminders" aria-label="Email" maxLength={200} />
    </>
  )
}

function SignIn({ error }) {
  return (
    <main className="join">
      <h1 className="brand"><Tile icon="check" />TrackMe</h1>
      <p>Sign in to write what you got done.</p>
      {error && <p className="missing" role="alert">{error}</p>}
      <a className="primary" href="/auth/google">Sign in with Google</a>
    </main>
  )
}

export default async function Shell({ active, day, error, children }) {
  const me = await getMe()
  if (!me) return <SignIn error={error} />

  const cfg = config()
  const today = nowParts(cfg.tz).day
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, -i))
  const written = await prisma.entry.findMany({ where: { person_id: me.id, day: { gte: toDate(days[6]) } }, select: { day: true } })
  const mine = new Set(written.map((e) => toDay(e.day)))

  return (
    <div className="shell">
      <Refresher />
      <nav className="side">
        <div className="brand"><Tile icon="check" />TrackMe</div>
        <Link href="/doc" aria-current={active === 'doc' ? 'page' : undefined}><Tile icon="columns" tint="#7fd1ff" />Doc view</Link>
        <Link href="/grid" aria-current={active === 'grid' ? 'page' : undefined}><Tile icon="grid" tint="#b9a8ff" />Who wrote</Link>
        <Link href="/people" aria-current={active === 'people' ? 'page' : undefined}><Tile icon="people" tint="#ff9fcb" />People</Link>
        <div className="days">
          <h2><Icon name="calendar" />Days</h2>
          {days.map((d) => (
            <Link key={d} href={d === today ? '/' : `/?d=${d}`} aria-current={active === 'board' && day === d ? 'page' : undefined}>
              <span
                className={`dot ${mine.has(d) ? 'on' : isWorkDay(d, cfg.workDays) ? 'off' : ''}`}
                title={mine.has(d) ? 'You wrote' : 'You did not write'}
              />
              {d === today ? 'Today' : fmtDay(d, { weekday: 'short', day: 'numeric', month: 'short' })}            </Link>
          ))}
        </div>
        <form className="me" action={signOut}>
          <Avatar person={me} />
          <span>{me.name}</span>
          <button title="Sign out" aria-label="Sign out"><Icon name="swap" /></button>
        </form>
      </nav>
      <main>{children}</main>
    </div>
  )
}

// Comments on one person's day, plus the box to add one. Used by the board and the doc.
export function Thread({ person, day, isMe, meId, comments, when }) {
  const mine = comments.filter((c) => c.person_id === person.id)
  const fromOthers = mine.filter((c) => c.author_id !== meId).map((c) => c.id)
  // Collapsed behind a chat icon + count; it pulses while there are comments you haven't opened.
  return (
    <details className="thread">
      <summary aria-label={`${mine.length} comment${mine.length === 1 ? "" : "s"} on ${person.name}'s day`}>
        <Unread thread={`${person.id}:${day}`} ids={fromOthers} total={mine.length} />
      </summary>
      {mine.map((c) => (
        <div key={c.id} className="cmt">
          <p><b>{c.author.name}</b> <Md text={c.body} /> <time>{when(c.created_at)}</time></p>
          <Reactions commentId={c.id} meId={meId} list={c.reactions.map((r) => ({ e: r.emoji, p: r.person_id, n: r.person.name }))} />
        </div>
      ))}
      <form action={addComment.bind(null, person.id, day)}>
        <input name="body" placeholder={isMe ? 'Reply' : `Comment on ${person.name}'s day`} aria-label={`Comment on ${person.name}'s day`} required maxLength={2000} autoComplete="off" />
        <button aria-label="Send comment"><Icon name="send" /></button>
      </form>
    </details>
  )
}
