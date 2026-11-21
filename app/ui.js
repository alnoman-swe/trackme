'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { emailEveryone, saveEntry } from './actions.js'
import { continueList } from '../lib/logic.js'

// Your own box for the day. Saves by itself shortly after you stop typing.
// Admins (canEmail) also get a button that emails the text to the whole team.
export function EntryEditor({ day, initial, canEmail }) {
  const [value, setValue] = useState(initial)
  const [status, setStatus] = useState(initial ? 'Saved' : '')
  const [mail, setMail] = useState('')

  async function emailAll() {
    if (!confirm('Email this to everyone on the team?')) return
    setMail('Sending…')
    setMail(await emailEveryone(latest.current).catch(() => 'Not sent. Check your connection.'))
  }
  const timer = useRef()
  const latest = useRef(initial)

  async function save() {
    clearTimeout(timer.current)
    timer.current = null
    try {
      await saveEntry(day, latest.current)
      if (!timer.current) setStatus(latest.current.trim() ? 'Saved' : '') // still 'Saving…' if typed meanwhile
    } catch {
      setStatus('Not saved. Check your connection and keep typing to retry.')
    }
  }

  function change(text) {
    setValue((latest.current = text))
    setStatus('Saving…')
    clearTimeout(timer.current)
    timer.current = setTimeout(save, 700)
  }

  return (
    <div className="editor">
      <textarea
        value={value}
        rows={4}
        aria-label="What you got done"
        placeholder="What did you get done today?"
        onFocus={() => value || setValue((latest.current = '1. '))}
        onChange={(e) => change(e.target.value)}
        onKeyDown={(e) => {
          const box = e.currentTarget
          if (e.key !== 'Enter' || e.shiftKey || box.selectionStart !== box.selectionEnd) return
          const next = continueList(box.value, box.selectionStart)
          if (!next) return
          e.preventDefault()
          change(next.text)
          requestAnimationFrame(() => box.setSelectionRange(next.caret, next.caret))
        }}
        onBlur={() => {
          if (timer.current) save()
          if (value === '1. ') setValue((latest.current = '')) // untouched starter goes away
        }}
      />
      <div className="editor-foot">
        <small role="status">{status}</small>
        {canEmail && (
          <>
            <button type="button" className="primary" onClick={emailAll} disabled={mail === 'Sending…' || !value.replace(/^\s*\d+\.\s*$/gm, '').trim()}>
              Email to everyone
            </button>
            <small role="status">{mail}</small>
          </>
        )}
      </div>
    </div>
  )
}

// ponytail: polling every 5s. Switch to websockets/SSE if the team outgrows it.
export function Refresher() {
  const router = useRouter()
  useEffect(() => {
    const id = setInterval(() => document.hidden || router.refresh(), 5000)
    return () => clearInterval(id)
  }, [router])
  return null
}

// Soft oval speech bubble with a code glyph. Colours come from CSS (grey when empty, blue when commented).
const Bubble = () => (
  <svg className="bubble" viewBox="0 0 32 32" aria-hidden="true">
    <g className="b">
      <ellipse cx="16" cy="15.6" rx="12" ry="10.4" />
      <path d="M6.9 21.6c-.2 2-1.2 3.7-2.6 5-.4.4-.1 1 .4 1 2.7.1 5.2-.6 7.2-2.3z" />
    </g>
    <path className="c" d="M13.7 12.8l-2.8 2.8 2.8 2.8M18.3 12.8l2.8 2.8-2.8 2.8" />
  </svg>
)

// Bubble on every thread, plus the comment count when there is one.
// It wiggles once there is a comment, and turns deep blue while some by others are unopened.
// Opening the <details> marks them read. Remembered per browser in localStorage, no database.
export function Unread({ thread, ids, total }) {
  const ref = useRef()
  const [n, setN] = useState(0)
  const key = `seen:${thread}`
  const idList = ids.join()
  useEffect(() => {
    const box = ref.current.closest('details')
    const seen = () => { try { return Number(localStorage.getItem(key)) || 0 } catch { return 0 } }
    const update = () => {
      if (box.open) {
        try { localStorage.setItem(key, String(Math.max(seen(), 0, ...ids))) } catch {}
        setN(0)
      } else setN(ids.filter((id) => id > seen()).length)
    }
    update()
    box.addEventListener('toggle', update)
    return () => box.removeEventListener('toggle', update)
  }, [key, idList]) // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <span ref={ref} className={`count-chat${total ? ' has' : ''}${n ? ' unread' : ''}`} title={n ? `${n} new comment${n === 1 ? '' : 's'}` : undefined}>
      <Bubble />{total || ''}
    </span>
  )
}

// Submit button that asks first. For destructive actions.
export function ConfirmButton({ message, ...props }) {
  return <button {...props} onClick={(e) => { if (!confirm(message)) e.preventDefault() }} />
}
