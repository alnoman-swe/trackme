'use client'
import { useEffect, useOptimistic, useRef, useState, useTransition } from 'react'
import { toggleReaction } from './actions.js'
import { REACTIONS } from '../lib/logic.js'

const NAMES = { like: 'Like', love: 'Love', haha: 'Haha', party: 'Celebrate', fire: 'Fire', eyes: 'Looking' }
// Animated Noto emoji (WebP); static PNG for reduced motion and for the tiny burst particles.
const Emoji = ({ k, still, ...rest }) => (
  <picture>
    {!still && <source srcSet={`/emoji/${k}.webp`} type="image/webp" media="(prefers-reduced-motion: no-preference)" />}
    <img src={`/emoji/${k}.png`} alt="" width="128" height="128" draggable="false" {...rest} />
  </picture>
)

// Reaction pills under a comment + a "+" that opens the picker. Taps update instantly (optimistic).
// list: [{ e: emoji key, p: person id, n: person name }]
export function Reactions({ commentId, meId, list }) {
  const [shown, flip] = useOptimistic(list, (cur, e) =>
    cur.some((r) => r.e === e && r.p === meId) ? cur.filter((r) => !(r.e === e && r.p === meId)) : [...cur, { e, p: meId, n: 'You' }],
  )
  const [, start] = useTransition()
  const [open, setOpen] = useState(false)
  const [pop, setPop] = useState({ e: '', n: 0 }) // last emoji added, drives the bounce + burst
  const box = useRef()

  useEffect(() => {
    if (!open) return
    const away = (ev) => box.current && !box.current.contains(ev.target) && setOpen(false)
    const esc = (ev) => ev.key === 'Escape' && setOpen(false)
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc) }
  }, [open])

  function react(e) {
    if (!meId) return
    if (!shown.some((r) => r.e === e && r.p === meId)) setPop((p) => ({ e, n: p.n + 1 }))
    setOpen(false)
    start(async () => {
      flip(e)
      await toggleReaction(commentId, e).catch(() => {}) // the next refresh shows the real state
    })
  }

  const groups = REACTIONS.map((e) => [e, shown.filter((r) => r.e === e)]).filter(([, g]) => g.length)
  return (
    <div className="reacts" ref={box}>
      {groups.map(([e, g]) => {
        const mine = g.some((r) => r.p === meId)
        return (
          <button key={e} type="button" className={`pill${mine ? ' mine' : ''}`} onClick={() => react(e)} aria-pressed={mine}
            title={`${NAMES[e]}: ${g.map((r) => r.n).join(', ')}`} aria-label={`${NAMES[e]}, ${g.length}`}>
            <span className="face">
              <Emoji key={pop.e === e ? pop.n : 0} k={e} className={pop.e === e ? 'bounce' : ''} />
              {pop.e === e && (
                <span className="burst" key={pop.n} aria-hidden="true">
                  {[0, 1, 2, 3, 4, 5].map((i) => <i key={i} style={{ '--a': `${i * 60 - 90}deg`, '--d': `${i % 2 ? 30 : 40}px` }}><Emoji k={e} still /></i>)}
                </span>
              )}
            </span>
            <span className="num"><b key={g.length}>{g.length}</b></span>
          </button>
        )
      })}
      {meId && (
        <span className="add">
          <button type="button" className="plus" aria-label="Add reaction" aria-expanded={open} onClick={() => setOpen(!open)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8.5 14c.9 1.4 2 2 3.5 2s2.6-.6 3.5-2M9 9.5h.01M15 9.5h.01" /></svg>
            <i>+</i>
          </button>
          {open && (
            <div className="picker" role="menu">
              {REACTIONS.map((e, i) => (
                <button key={e} type="button" role="menuitem" style={{ '--i': i }} aria-label={NAMES[e]} title={NAMES[e]} onClick={() => react(e)}>
                  <Emoji k={e} />
                </button>
              ))}
            </div>
          )}
        </span>
      )}
    </div>
  )
}
