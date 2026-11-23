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

const IMG = /!\[([^\]]*)\]\((\/files\/[0-9a-f-]{36}\.(?:jpg|png|gif|webp))\)\n?/g

// Pulls attached images out of the text: { text, images: [{ alt, src }] }. join() puts them back, at the end.
export function split(md) {
  const images = []
  const text = md.replace(IMG, (_, alt, src) => (images.push({ alt, src }), ''))
  return { text: images.length ? text.replace(/\n+$/, '') : text, images }
}
export function join(text, images) {
  if (!images.length) return text
  return [text.replace(/\n+$/, ''), ...images.map((i) => `![${i.alt.replace(/[[\]]/g, '')}](${i.src})`)].filter(Boolean).join('\n')
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Markdown → HTML for the rich editor. Every piece of text goes through esc(), so no raw HTML gets through.
export function toHtml(text) {
  return tokens(text).map((k) => {
    const s = esc(k.s ?? '').replace(/\n/g, '<br>')
    return k.t === 'b' ? `<b>${s}</b>`
      : k.t === 'i' ? `<i>${s}</i>`
      : k.t === 'a' ? `<a href="${esc(k.href)}">${s}</a>`
      : k.t === 'img' ? `<img src="${esc(k.src)}" alt="${esc(k.alt)}">`
      : s
  }).join('') + (text.endsWith('\n') ? '<br>' : '') // a trailing <br> alone shows no empty line
}

// Editor DOM → Markdown. Works on any node with nodeType/nodeName/childNodes (browser DOM in practice).
// A final <br> is the browser's invisible placeholder for an empty last line, so it doesn't count.
export function fromDom(node) {
  const out = walk(node)
  return lastLeaf(node)?.nodeName === 'BR' ? out.replace(/\n$/, '') : out
}
const lastLeaf = (n) => { const k = n.childNodes?.[n.childNodes.length - 1]; return k ? (k.nodeType === 1 && k.childNodes?.length ? lastLeaf(k) : k) : null }

function walk(node) {
  let out = ''
  for (const n of node.childNodes) {
    if (n.nodeType === 3) { out += n.textContent.replace(/ /g, ' '); continue }
    if (n.nodeType !== 1) continue
    const tag = n.nodeName
    if (tag === 'BR') { out += '\n'; continue }
    if (tag === 'IMG') { out += `![${(n.getAttribute('alt') ?? '').replace(/[[\]]/g, '')}](${n.getAttribute('src')})`; continue }
    if ((tag === 'DIV' || tag === 'P') && out && !out.endsWith('\n')) out += '\n' // a new block is a new line
    const inner = walk(n)
    const w = Number(n.style?.fontWeight) >= 600 || n.style?.fontWeight === 'bold'
    const mark = tag === 'B' || tag === 'STRONG' || w ? '**' : tag === 'I' || tag === 'EM' || n.style?.fontStyle === 'italic' ? '*' : ''
    if (tag === 'A' && /^https?:\/\//.test(n.getAttribute('href') ?? '')) out += `[${inner}](${n.getAttribute('href')})`
    else if (mark && inner.trim()) {
      // marks hug the words: " hi " → " **hi** ", or the parser won't see them
      const [, lead, mid, tail] = /^(\s*)([\s\S]*?)(\s*)$/.exec(inner)
      out += `${lead}${mark}${mid}${mark}${tail}`
    } else out += inner
  }
  return out
}
