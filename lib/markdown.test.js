import test from 'node:test'
import assert from 'node:assert/strict'
import { fromDom, join, split, toHtml, tokens } from './markdown.js'

const id = '0123456789abcdef0123456789abcdef0123'
test('tokenizes bold, italic, links and images', () => {
  const t = tokens(`a **b** *c* [d](https://x.io) ![e](/files/${id}.png)`)
  assert.deepEqual(t.filter((x) => x.t !== 'text').map((x) => x.t), ['b', 'i', 'a', 'img'])
})
test('rejects javascript: links and foreign image urls', () => {
  assert.deepEqual(tokens('[x](javascript:alert(1))').map((x) => x.t), ['text'])
  assert.deepEqual(tokens('![x](https://evil.io/a.png)').map((x) => x.t).includes('img'), false)
})
test('plain numbered lists pass through untouched', () => {
  assert.deepEqual(tokens('1. one\n2. two'), [{ t: 'text', s: '1. one\n2. two' }])
})

// Minimal stand-ins for DOM nodes, enough for fromDom.
const txt = (s) => ({ nodeType: 3, textContent: s })
const el = (nodeName, kids = [], attrs = {}, style = {}) => ({ nodeType: 1, nodeName, childNodes: kids, style, getAttribute: (k) => attrs[k] ?? null })
test('editor DOM turns back into Markdown', () => {
  const dom = el('DIV', [txt('1. '), el('B', [txt('hi ')]), el('I', [txt('there')]), el('BR'), el('DIV', [txt('2. x'), el('IMG', [], { src: `/files/${id}.png`, alt: 'a[b]' })])])
  assert.equal(fromDom(dom), `1. **hi** *there*\n2. x![ab](/files/${id}.png)`)
  assert.equal(fromDom(el('DIV', [el('SPAN', [txt('w')], {}, { fontWeight: '700' })])), '**w**')
})
test('Markdown → HTML escapes text and round-trips', () => {
  assert.equal(toHtml('<b>x</b> **y**\n'), '&lt;b&gt;x&lt;/b&gt; <b>y</b><br><br>')
})

test('the final <br> placeholder is not a newline', () => {
  assert.equal(fromDom(el('DIV', [txt('a'), el('BR'), el('BR')])), 'a\n')
  assert.equal(fromDom(el('DIV', [txt('a'), el('BR')])), 'a')
})

test('images split out of the text and join back at the end', () => {
  const img = `![a.png](/files/${id}.png)`
  assert.deepEqual(split(`1. x\n${img}\n2. y`), { text: '1. x\n2. y', images: [{ alt: 'a.png', src: `/files/${id}.png` }] })
  assert.equal(join('1. x\n2. y\n\n', [{ alt: 'a[1].png', src: `/files/${id}.png` }]), `1. x\n2. y\n![a1.png](/files/${id}.png)`)
  assert.equal(join('', [{ alt: 'a', src: `/files/${id}.png` }]), `![a](/files/${id}.png)`)
  assert.equal(join('1. ', []), '1. ') // the starter survives
  assert.equal(split(`1. x\n${img}`).text, '1. x') // no stray blank line where images were
  const t = `1. **x**\n${img}`
  assert.equal(join(split(t).text, split(t).images), t)
})
