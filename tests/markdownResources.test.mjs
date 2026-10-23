// Tests for src/utils/markdownResources.ts. `npm test` compiles the module to .test-build/ first.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isEmbeddableUrl } from '../.test-build/markdownResources.js'

test('keeps inline data URLs', () => {
  for (const url of ['data:image/png;base64,iVBORw0KGgo=', 'DATA:image/gif;base64,R0lGOD', ' \n\tdata:image/svg+xml,<svg/>']) {
    assert.equal(isEmbeddableUrl(url), true, url)
  }
})

test('blocks anything that would be fetched from a server', () => {
  for (const url of [
    'https://tracker.example/pixel.png?doc=secret',
    'http://tracker.example/pixel.png',
    '//tracker.example/pixel.png',
    'pixel.png',
    '/pixel.png',
    '',
    ' data:image/png;base64,AAAA',
    'x-data:image/png',
    'javascript:alert(1)',
  ]) {
    assert.equal(isEmbeddableUrl(url), false, url)
  }
})
