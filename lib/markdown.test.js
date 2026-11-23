import test from 'node:test'
import assert from 'node:assert/strict'
import { tokens } from './markdown.js'

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
