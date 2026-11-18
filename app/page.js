import Link from 'next/link'
import { prisma, toDate } from '../lib/db.js'
import { getMe } from '../lib/me.js'
import { ROLES, addDays, config, fmtDay, isDay, nowParts } from '../lib/logic.js'
import Shell, { Avatar, Icon, Thread, Tile } from './shell.js'
import { EntryEditor } from './ui.js'

const HEADINGS = { Dev: 'Developers', QA: 'QA', Manager: 'Managers', Leader: 'Leaders', Admin: 'Admins' }

export default async function Board({ searchParams }) {
  const { d, error } = await searchParams
  const cfg = config()
  const today = nowParts(cfg.tz).day
  const day = isDay(d) ? d : today
  const me = await getMe()

  const [people, entries, comments] = await Promise.all([
    prisma.person.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
    prisma.entry.findMany({ where: { day: toDate(day) } }),
    prisma.comment.findMany({ where: { day: toDate(day) }, include: { author: true }, orderBy: { id: 'asc' } }),
  ])
  const entryOf = Object.fromEntries(entries.map((e) => [e.person_id, e]))
  const wrote = people.filter((p) => entryOf[p.id]).length

  const time = (ts) => ts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: cfg.tz })
  // Entries filled in on a later day show the date too, so late updates are visible.
  const savedAt = (ts) => {
    const on = nowParts(cfg.tz, ts).day
    return on === day ? time(ts) : `added ${fmtDay(on, { day: 'numeric', month: 'short' })}, ${time(ts)}`
  }

  return (
    <Shell active="board" day={day} error={error}>
      <header className="top">
        <div>
          <h1>{fmtDay(day)}</h1>
          <p className="count">
            {people.length ? `${wrote} of ${people.length} have written` : 'No people yet'}
            {day !== today && <>. <Link href="/">Back to today</Link></>}
            {people.length > 0 && <progress value={wrote} max={people.length} aria-label="Share of the team that has written" />}
          </p>
        </div>
        <div className="pager">
          <Link href={`/?d=${addDays(day, -1)}`} aria-label="Previous day"><Icon name="left" /></Link>
          {day < today && <Link href={`/?d=${addDays(day, 1)}`} aria-label="Next day"><Icon name="right" /></Link>}
        </div>
      </header>

      <div className="roster" aria-label="Who has written">
        {people.map((p) => (
          <a key={p.id} href={`#p-${p.id}`} className={entryOf[p.id] ? 'in' : 'out'} title={`${p.name}: ${entryOf[p.id] ? 'written' : 'not written yet'}`}>
            <Avatar person={p} />
          </a>
        ))}
      </div>

      {ROLES.map((role) => {
        const group = people.filter((p) => p.role === role)
        if (!group.length) return null
        return (
          <section key={role} data-role={role}>
            <h2 className="group"><Tile icon={role} />{HEADINGS[role]} <small>{group.filter((p) => entryOf[p.id]).length} of {group.length} written</small></h2>
            {group.map((p) => {
              const entry = entryOf[p.id]
              const isMe = p.id === me?.id
              return (
                <article key={p.id} id={`p-${p.id}`} className="msg">
                  <Avatar person={p} />
                  <div>
                    <div className="who">
                      <b>{p.name}</b>
                      {isMe && <span className="you">you</span>}
                      {entry && <time><Icon name="clock" />{savedAt(entry.updated_at)}</time>}
                    </div>
                    {isMe ? (
                      <EntryEditor key={day} day={day} initial={entry?.body ?? ''} />
                    ) : entry ? (
                      <p className="body">{entry.body}</p>
                    ) : (
                      <p className="missing"><Icon name="clock" />Not written yet</p>
                    )}
                    <Thread person={p} day={day} isMe={isMe} comments={comments} when={savedAt} />
                  </div>
                </article>
              )
            })}
          </section>
        )
      })}
    </Shell>
  )
}
