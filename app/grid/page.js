import Link from 'next/link'
import { connection } from 'next/server'
import { prisma, toDate, toDay } from '../../lib/db.js'
import { addDays, config, fmtDay, isOff, nowParts } from '../../lib/logic.js'
import Shell, { Avatar } from '../shell.js'

export default async function Grid() {
  await connection() // render per request: needs today's date + live DB, not build-time data
  const cfg = config()
  const today = nowParts(cfg.tz).day
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13))
  const [people, rows] = await Promise.all([
    // role sorts in the order the Role enum is declared: Dev, QA, Manager, Leader, Admin
    prisma.person.findMany({ where: { active: true }, orderBy: [{ role: 'asc' }, { name: 'asc' }] }),
    prisma.entry.findMany({ where: { day: { gte: toDate(days[0]) } }, select: { person_id: true, day: true } }),
  ])
  const entries = rows.map((e) => ({ person_id: e.person_id, day: toDay(e.day) }))
  const has = new Set(entries.map((e) => `${e.person_id}|${e.day}`))
  const off = Object.fromEntries(days.map((d) => [d, isOff(d, today, entries.filter((e) => e.day === d).length, cfg.workDays)]))

  return (
    <Shell active="grid">
      <header className="top">
        <div>
          <h1>Who wrote</h1>
          <p className="count">Last 14 days. Greyed days are days off.</p>
        </div>
      </header>
      <div className="scroll">
        <table className="grid">
          <thead>
            <tr>
              <th />
              {days.map((d) => (
                <th key={d} className={off[d] ? 'off' : ''}>
                  <Link href={`/?d=${d}`}>
                    <small>{fmtDay(d, { weekday: 'short' })}</small>
                    {fmtDay(d, { day: 'numeric' })}
                  </Link>
                </th>
              ))}
              <th>Missed</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p) => {
              const missed = days.filter((d) => !off[d] && !has.has(`${p.id}|${d}`)).length
              return (
                <tr key={p.id}>
                  <th><Avatar person={p} /> {p.name}</th>
                  {days.map((d) => {
                    const wrote = has.has(`${p.id}|${d}`)
                    return (
                      <td key={d} className={off[d] ? 'off' : ''}>
                        <Link href={`/?d=${d}#p-${p.id}`} className={`dot ${wrote ? 'on' : off[d] ? '' : 'off'}`} title={`${p.name}, ${fmtDay(d)}: ${wrote ? 'written' : 'not written'}`} />
                      </td>
                    )
                  })}
                  <td className={missed ? 'missed' : ''}>{missed || ''}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </Shell>
  )
}
