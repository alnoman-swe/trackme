// Tiny inline Markdown: **bold**, *italic*, [text](https://url), ![alt](/files/name.png).
// Returns tokens; the page turns them into React elements, so no raw HTML is ever rendered.
const RE = /!\[([^\]]*)\]\((\/files\/[0-9a-f-]{36}\.(?:jpg|png|gif|webp))\)|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|\*\*(.+?)\*\*|\*(.+?)\*/g

export function tokens(text) {
  const out = []
  let last = 0
  for (const m of text.matchAll(RE)) {
    if (m.index > last) out.push({ t: 'text', s: text.slice(last, m.index) })
    if (m[2]) out.push({ t: 'img', alt: m[1], src: m[2] })
    else if (m[4]) out.push({ t: 'a', s: m[3], href: m[4] })
    else if (m[5]) out.push({ t: 'b', s: m[5] })
    else out.push({ t: 'i', s: m[6] })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ t: 'text', s: text.slice(last) })
  return out
}
