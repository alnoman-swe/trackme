'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { emailEveryone, saveEntry } from './actions.js'
import { continueList } from '../lib/logic.js'
import { fromDom, join, split, toHtml } from '../lib/markdown.js'

const TOOL = {
  bold: 'M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z',
  italic: 'M19 4h-9M14 20H5M15 4 9 20',
  image: 'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8.5 10a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3M21 15l-5-5L5 21',
}
// onMouseDown preventDefault keeps the editor focused, so the selection survives the click.
const Tool = ({ icon, label, onClick }) => (
  <button type="button" title={label} aria-label={label} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d={TOOL[icon]} /></svg>
  </button>
)
const cmd = (name, arg) => document.execCommand(name, false, arg) // ponytail: deprecated but universal; swap for a rich-text lib if it ever breaks

// Your own box for the day: real bold/italic/images on screen, stored as Markdown.
// Saves by itself shortly after you stop typing. Admins (canEmail) can also email the text to the whole team.
export function EntryEditor({ day, initial, canEmail }) {
  const [value, setValue] = useState(initial)
  const [status, setStatus] = useState(initial ? 'Saved' : '')
  const [mail, setMail] = useState('')
  const timer = useRef()
  const latest = useRef(initial)
  const box = useRef()
  const picker = useRef()
  const [images, setImages] = useState(() => split(initial).images)
  const imgs = useRef(images) // the editor box holds only text; images live here and are joined on save

  useEffect(() => { box.current.innerHTML = toHtml(split(initial).text) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function emailAll() {
    if (!confirm('Email this to everyone on the team?')) return
    setMail('Sending…')
    setMail(await emailEveryone(latest.current).catch(() => 'Not sent. Check your connection.'))
  }

  // Markdown from the start of the editor up to the caret.
  function textBefore() {
    const r = getSelection().getRangeAt(0).cloneRange()
    r.setStart(box.current, 0)
    const tmp = document.createElement('div')
    tmp.append(r.cloneContents())
    return fromDom(tmp)
  }

  async function upload(files) {
    const list = [...files].filter((f) => f.type.startsWith('image/'))
    if (!list.length) return
    setStatus('Uploading image…')
    for (const file of list) {
      const body = new FormData()
      body.set('file', file)
      try {
        const res = await fetch('/api/upload', { method: 'POST', body })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error)
        setImgs([...imgs.current, { src: data.url, alt: file.name.replace(/[[\]]/g, '') }])
      } catch (err) {
        setStatus(`Image not added: ${err.message || 'check your connection'}`)
        return
      }
    }
  }

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

  // ponytail: removed images stay in the bucket; add a cleanup job if storage cost matters.
  function setImgs(list) {
    setImages((imgs.current = list))
    changed()
  }

  function changed() {
    const text = join(fromDom(box.current), imgs.current)
    if (text === latest.current) return
    setValue((latest.current = text))
    setStatus('Saving…')
    clearTimeout(timer.current)
    timer.current = setTimeout(save, 700)
  }

  function setText(text) {
    box.current.innerHTML = toHtml(text) // text only; images are kept separately
    changed()
  }

  return (
    <div className="editor">
      <div className="toolbar" role="toolbar" aria-label="Formatting">
        <Tool icon="bold" label="Bold (Ctrl/⌘ B)" onClick={() => cmd('bold')} />
        <Tool icon="italic" label="Italic (Ctrl/⌘ I)" onClick={() => cmd('italic')} />
        <Tool icon="image" label="Attach image (or paste / drop one)" onClick={() => picker.current.click()} />
        <input ref={picker} type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple hidden onChange={(e) => { upload(e.target.files); e.target.value = '' }} />
      </div>
      <div
        ref={box}
        className="rich"
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="What you got done"
        data-placeholder="What did you get done today?"
        onInput={changed}
        onFocus={() => {
          if (fromDom(box.current)) return
          setText('1. ')
          getSelection().selectAllChildren(box.current) // caret after the starter
          getSelection().collapseToEnd()
        }}
        onBlur={() => {
          if (timer.current) save()
          if (fromDom(box.current) === '1. ') setText('') // untouched starter goes away
        }}
        onPaste={(e) => {
          e.preventDefault() // never paste foreign HTML; images upload, everything else goes in as plain text
          if (e.clipboardData.files.length) upload(e.clipboardData.files)
          else cmd('insertText', e.clipboardData.getData('text/plain'))
        }}
        onDrop={(e) => { e.preventDefault(); upload(e.dataTransfer.files) }} // files only; no dragged-in HTML
        onKeyDown={(e) => {
          if (e.key !== 'Enter' || e.shiftKey || !getSelection().isCollapsed) return
          const before = textBefore() // decides whether to continue a "1. " list
          const next = continueList(before, before.length)
          if (!next) return
          e.preventDefault()
          if (next.text.length < before.length) { // empty item: Enter ends the list
            for (let i = before.length - next.text.length; i--;) cmd('delete')
          } else cmd('insertText', next.text.slice(before.length))
        }}
      />
      {images.length > 0 && <Gallery images={images} onRemove={(i) => setImgs(images.filter((_, j) => j !== i))} />}
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

const ImgIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d={TOOL.image} /></svg>

// Image chips under a text; a click opens every image in a pop-up (native <dialog>: Esc closes, focus is trapped).
export function Gallery({ images, onRemove }) {
  const dlg = useRef()
  const [at, setAt] = useState(0)
  const [shown, setShown] = useState(false) // nothing loads until the pop-up opens
  const n = images.length
  const go = (i) => setAt((i + n) % n)
  const open = (i) => { setAt(i); setShown(true); dlg.current.showModal() }
  const img = images[Math.min(at, n - 1)]
  return (
    <span className="gallery">
      {images.map((im, i) => (
        <span key={im.src + i} className="chip">
          <button type="button" onClick={() => open(i)} title={`View ${im.alt || 'image'}`}>
            <ImgIcon /><span>{im.alt || `Image ${i + 1}`}</span>
          </button>
          {onRemove && <button type="button" className="x" aria-label={`Remove ${im.alt || 'image'}`} title="Remove image" onClick={() => onRemove(i)}>✕</button>}
        </span>
      ))}
      <dialog ref={dlg} className="lightbox" aria-label="Images" onClose={() => setShown(false)}
        onClick={(e) => e.target === dlg.current && dlg.current.close()} // backdrop click
        onKeyDown={(e) => { if (e.key === 'ArrowRight') go(at + 1); if (e.key === 'ArrowLeft') go(at - 1) }}>
        {shown && <>
        <header>
          <b>{img.alt || `Image ${at + 1}`}</b>
          <small>{at + 1} / {n}</small>
          <a href={img.src} target="_blank" rel="noopener">Open original</a>
          <button type="button" aria-label="Close" onClick={() => dlg.current.close()}>✕</button>
        </header>
        <figure>
          {n > 1 && <button type="button" className="nav prev" aria-label="Previous image" onClick={() => go(at - 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg></button>}
          <img src={img.src} alt={img.alt} />
          {n > 1 && <button type="button" className="nav next" aria-label="Next image" onClick={() => go(at + 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18l6-6-6-6" /></svg></button>}
        </figure>
        {n > 1 && (
          <nav>
            {images.map((im, i) => (
              <button key={i} type="button" aria-label={`Image ${i + 1}`} aria-current={i === at || undefined} onClick={() => setAt(i)}>
                <img src={im.src} alt="" loading="lazy" />
              </button>
            ))}
          </nav>
        )}
        </>}
      </dialog>
    </span>
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
