// Tests for src/utils/sqlHighlight.ts. `npm test` compiles the module to .test-build/ first.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { tokenizeSql } from '../.test-build/sqlHighlight.js'

const typesOf = (sql) => tokenizeSql(sql).filter((t) => t.type !== 'plain').map((t) => [t.type, t.text.trim()])

test('round-trips every character', () => {
  const sql = "SELECT `a`.`b`, 'it''s', \"x\" -- note\n/* c */ FROM t WHERE id IN (1, 2.5) AND n = :name"
  assert.equal(tokenizeSql(sql).map((t) => t.text).join(''), sql)
})

test('classifies tokens', () => {
  assert.deepEqual(typesOf("select count(*) from `db`.`t` where x = 'a' -- hi"), [
    ['keyword', 'select'],
    ['function', 'count'],
    ['punctuation', '('],
    ['operator', '*'],
    ['punctuation', ')'],
    ['keyword', 'from'],
    ['identifier', '`db`'],
    ['punctuation', '.'],
    ['identifier', '`t`'],
    ['keyword', 'where'],
    ['operator', '='],
    ['string', "'a'"],
    ['comment', '-- hi'],
  ])
})

test('treats IN and EXISTS before a parenthesis as keywords', () => {
  const types = typesOf('x in (1) and exists (select 1)')
  assert.deepEqual(types.filter(([type]) => type === 'keyword').map(([, text]) => text), ['in', 'and', 'exists', 'select'])
})

test('handles unterminated strings and comments', () => {
  for (const sql of ["select 'abc", 'select /* open', 'select `x']) {
    assert.equal(tokenizeSql(sql).map((t) => t.text).join(''), sql)
  }
})
