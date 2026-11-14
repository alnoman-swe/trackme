'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveEntry } from './actions.js'
import { continueList } from '../lib/logic.js'

// Your own box for the day. Saves by itself shortly after you stop typing.
export function EntryEditor({ day, initial }) {
  const [value, setValue] = useState(initial)
  const [status, setStatus] = useState(initial ? 'Saved' : '')
  const timer = useRef()
  const latest = useRef(initial)

  async function save() {
    clearTimeout(timer.current)
    timer.current = null
    try {
      await saveEntry(day, latest.current)
      setStatus(latest.current.trim() ? 'Saved' : '')
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
      <small role="status">{status}</small>
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
