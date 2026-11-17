import Link from 'next/link'
import { prisma, toDate, toDay } from '../lib/db.js'
import { getMe } from '../lib/me.js'
import { ROLES, addDays, config, fmtDay, isWorkDay, nowParts } from '../lib/logic.js'
import { signOut } from './actions.js'
import { Refresher } from './ui.js'

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
}

export const Icon = ({ name }) => (
  <svg className="icon" viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS[name]} /></svg>
)

// An icon on a coloured square. Colour comes from `tint` or the surrounding data-role.
export const Tile = ({ icon, tint }) => (
  <span className="tile" style={tint && { '--tint': tint }}><Icon name={icon} /></span>
)

// Microsoft Fluent 3D emoji (MIT). Picked by id (not name) so it's stable and no personal data leaves the app.
const FACES = '1f60e 1f929 1f973 1f913 1f920 1f607 1f604 1f61c 1f917 1f60a 1f98a 1f43c 1f981 1f42f 1f428 1f438 1f435 1f984 1f427 1f989 1f419 1f430 1f436 1f431'.split(' ')

export const Avatar = ({ person }) => (
  <span className="avatar" data-role={person.role} aria-hidden="true">
    <img src={`https://cdn.jsdelivr.net/npm/@lobehub/fluent-emoji-3d@1.1.0/assets/${FACES[person.id % FACES.length]}.webp`} alt="" loading="lazy" />
  </span>
)

export function PersonFields({ person }) {
  return (
    <>
      <input name="name" defaultValue={person?.name} placeholder="Name" aria-label="Name" required maxLength={80} />
      <select name="role" defaultValue={person?.role ?? 'Dev'} aria-label="Role">
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
              {d === today ? 'Today' : fmtDay(d, { weekday: 'short', day: 'numeric', month: 'short' })}
            </Link>
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
