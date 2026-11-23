import { tokens } from '../lib/markdown.js'

// Renders entry/comment text with bold, italic, links and images. Whitespace is kept by CSS (pre-wrap).
export function Md({ text }) {
  return tokens(text).map((k, i) =>
    k.t === 'b' ? <strong key={i}>{k.s}</strong>
    : k.t === 'i' ? <em key={i}>{k.s}</em>
    : k.t === 'a' ? <a key={i} href={k.href} target="_blank" rel="noopener noreferrer nofollow">{k.s}</a>
    : k.t === 'img' ? <a key={i} href={k.src} target="_blank" rel="noopener" className="shot"><img src={k.src} alt={k.alt} loading="lazy" /></a>
    : k.s,
  )
}
