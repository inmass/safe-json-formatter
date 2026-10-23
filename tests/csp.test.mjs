// Guards the Content-Security-Policy in index.html: it is what guarantees the page cannot send
// data anywhere, so loosening it should be a deliberate change that also updates this test.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8')

const csp = (() => {
  const match = /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/.exec(html)
  assert.ok(match, 'index.html has a CSP meta tag')
  return Object.fromEntries(
    match[1].split(';').map((d) => d.trim().split(/\s+/)).filter(([name]) => name).map(([name, ...values]) => [name, values]),
  )
})()

test('falls back to blocking everything', () => {
  assert.deepEqual(csp['default-src'], ["'none'"])
})

test('cannot send or load data from other origins', () => {
  assert.deepEqual(csp['connect-src'], ["'none'"])
  assert.deepEqual(csp['form-action'], ["'none'"])
  assert.deepEqual(csp['script-src'], ["'self'"])
  assert.deepEqual(csp['img-src'], ["'self'", 'data:'])
  assert.deepEqual(csp['font-src'], ["'self'"])
  assert.deepEqual(csp['object-src'], ["'none'"])
  assert.deepEqual(csp['base-uri'], ["'none'"])
})

test('leaves media, frames and workers to the default', () => {
  for (const directive of ['media-src', 'frame-src', 'child-src', 'worker-src', 'prefetch-src']) {
    assert.equal(csp[directive], undefined, directive)
  }
})

test('turns off DNS prefetching', () => {
  assert.match(html, /http-equiv="x-dns-prefetch-control"\s+content="off"/)
})
