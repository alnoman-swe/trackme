import Link from 'next/link'
import { prisma, toDate } from '../../lib/db.js'
import { getMe } from '../../lib/me.js'
import { addDays, config, fmtDay, isAdmin, isDay, nowParts } from '../../lib/logic.js'
import { Md } from '../md.js'
import Shell, { Avatar, Icon, Thread } from '../shell.js'
import { EntryEditor } from '../ui.js'

// Google-Docs-style: one column per person, side by side. Live via the Shell's Refresher.
export default async function Doc({ searchParams }) {
  const { d } = await searchParams
  const cfg = config()
  const today = nowParts(cfg.tz).day
  const day = isDay(d) ? d : today
  const me = await getMe()

  const [people, entries, comments] = await Promise.all([
    prisma.person.findMany({ where: { active: true }, orderBy: [{ role: 'asc' }, { name: 'asc' }] }),
    prisma.entry.findMany({ where: { day: toDate(day) } }),
    prisma.comment.findMany({ where: { day: toDate(day) }, include: { author: true, reactions: { include: { person: true } } }, orderBy: { id: 'asc' } }),
  ])
  people.sort((a, b) => (b.id === me?.id) - (a.id === me?.id)) // your column first
  const entryOf = Object.fromEntries(entries.map((e) => [e.person_id, e]))
  const time = (ts) => ts.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: cfg.tz })

  return (
    <Shell active="doc" day={day}>
      <header className="top">
        <div>
          <h1>{fmtDay(day)}</h1>
          <p className="count">
            {people.filter((p) => entryOf[p.id]).length} of {people.length} have written. Updates every few seconds.
            {day !== today && <> <Link href="/doc">Back to today</Link></>}
          </p>
        </div>
        <div className="pager">
          <Link href={`/doc?d=${addDays(day, -1)}`} aria-label="Previous day"><Icon name="left" /></Link>
          {day < today && <Link href={`/doc?d=${addDays(day, 1)}`} aria-label="Next day"><Icon name="right" /></Link>}
        </div>
      </header>

      <div className="cols">
        {people.map((p) => {
          const entry = entryOf[p.id]
          const isMe = p.id === me?.id
          return (
            <section key={p.id} className="col" data-role={p.role}>
              <div className="who">
                <Avatar person={p} />
                <b>{p.name}</b>
                {isMe && <span className="you">you</span>}
                {entry && <time><Icon name="clock" />{time(entry.updated_at)}</time>}
              </div>
              {isMe ? (
                <EntryEditor key={day} day={day} initial={entry?.body ?? ''} canEmail={isAdmin(me)} />
              ) : entry ? (
                <p className="body"><Md text={entry.body} /></p>
              ) : (
                <p className="missing"><Icon name="clock" />Not written yet</p>
              )}
              <Thread person={p} day={day} isMe={isMe} meId={me?.id} comments={comments} when={time} />
            </section>
          )
        })}
      </div>
    </Shell>
  )
}
