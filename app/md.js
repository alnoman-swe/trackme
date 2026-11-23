import { split, tokens } from '../lib/markdown.js'
import { Gallery } from './ui.js'

// Renders entry/comment text with bold, italic and links. Attached images show as icon chips
// at the end; a click opens them all in a pop-up. Whitespace is kept by CSS (pre-wrap).
export function Md({ text }) {
  const { text: body, images } = split(text)
  return (
    <>
      {tokens(body.replace(/\n+$/, '')).map((k, i) =>
        k.t === 'b' ? <strong key={i}>{k.s}</strong>
        : k.t === 'i' ? <em key={i}>{k.s}</em>
        : k.t === 'a' ? <a key={i} href={k.href} target="_blank" rel="noopener noreferrer nofollow">{k.s}</a>
        : k.s,
      )}
      {images.length > 0 && <Gallery images={images} />}
    </>
  )
}
