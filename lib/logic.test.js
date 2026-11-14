import test from 'node:test'
import assert from 'node:assert/strict'
import { addDays, config, continueList, dueEmails, isDay, isOff, nowParts, weekday } from './logic.js'

const cfg = config({}) // Mon-Fri, 18:00, 20:00

test('dates', () => {
  assert.equal(weekday('2026-11-14'), 6) // Saturday
  assert.equal(addDays('2026-03-01', -1), '2026-02-28')
  assert.ok(isDay('2026-11-14'))
  assert.ok(!isDay('2026-13-45') && !isDay('x') && !isDay(undefined))
  assert.deepEqual(nowParts('Asia/Dhaka', new Date('2026-11-13T19:30:00Z')), { day: '2026-11-14', hhmm: '01:30' })
})

test('emails are due only on working days, after their time', () => {
  assert.deepEqual(dueEmails('2026-11-13', '17:59', cfg), [])
  assert.deepEqual(dueEmails('2026-11-13', '18:00', cfg), ['remind'])
  assert.deepEqual(dueEmails('2026-11-13', '20:05', cfg), ['remind', 'summary'])
  assert.deepEqual(dueEmails('2026-11-14', '23:00', cfg), []) // Saturday
})

test('day off: weekend, or a past day nobody wrote', () => {
  assert.ok(isOff('2026-11-14', '2026-11-16', 3, cfg.workDays)) // Saturday
  assert.ok(isOff('2026-11-12', '2026-11-16', 0, cfg.workDays)) // holiday
  assert.ok(!isOff('2026-11-12', '2026-11-16', 1, cfg.workDays))
  assert.ok(!isOff('2026-11-16', '2026-11-16', 0, cfg.workDays)) // today, nobody yet
})

test('numbered lists continue on Enter', () => {
  assert.deepEqual(continueList('1. fixed login', 14), { text: '1. fixed login\n2. ', caret: 18 })
  assert.deepEqual(continueList('a\n9. x', 6), { text: 'a\n9. x\n10. ', caret: 11 })
  assert.deepEqual(continueList('1. a\n2. ', 8), { text: '1. a\n', caret: 5 }) // empty item ends the list
  assert.deepEqual(continueList('1.test done', 11), { text: '1.test done\n2.', caret: 14 }) // no space: keep the style
  assert.equal(continueList('1.5 hours', 9), null) // decimals are not lists
  assert.equal(continueList('just text', 9), null)
})
