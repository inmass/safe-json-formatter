// Tests for src/utils/jsonRepair.ts, using Node's built-in test runner (no extra dependencies).
// `npm test` compiles the module to .test-build/ with tsc before running this file.
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { repairJson } from '../.test-build/jsonRepair.js'

// Repairs `input` and checks both the parsed result and that each expected fix was reported.
const expectRepair = (input, expected, fixes = []) => {
  const result = repairJson(input)
  assert.ok(result, `expected a repair for: ${input}`)
  assert.deepEqual(JSON.parse(result.repaired), expected)
  for (const fix of fixes) {
    assert.ok(
      result.fixes.some((message) => message.startsWith(fix)),
      `expected fix "${fix}", got ${JSON.stringify(result.fixes)}`
    )
  }
  return result
}

describe('commas and brackets', () => {
  test('inserts missing commas between members', () => {
    expectRepair('{"a": 1\n"b": 2}', { a: 1, b: 2 }, ['Inserted missing commas'])
  })

  test('removes trailing commas', () => {
    expectRepair('{"a": [1, 2,],}', { a: [1, 2] }, ['Removed trailing commas'])
  })

  test('removes duplicate commas', () => {
    expectRepair('[1,, 2]', [1, 2], ['Removed duplicate commas'])
  })

  test('adds missing closing brackets', () => {
    expectRepair('{"a": {"b": 1', { a: { b: 1 } }, ['Added missing closing }'])
  })

  test('closes an array that was closed with the wrong bracket', () => {
    expectRepair('{"a": [1, 2 }', { a: [1, 2] }, ['Added missing closing ]'])
  })

  test('removes extra closing brackets', () => {
    expectRepair('{"a": 1}}', { a: 1 }, ['Removed extra closing brackets'])
  })
})

describe('keys, strings and quotes', () => {
  test('quotes unquoted keys', () => {
    expectRepair('{a: 1, b_c: 2}', { a: 1, b_c: 2 }, ['Quoted unquoted keys'])
  })

  test('converts single quotes and keeps escaped quotes', () => {
    expectRepair("{'a': 'it\\'s'}", { a: "it's" }, ['Converted single/back/smart quotes'])
  })

  test('converts smart quotes', () => {
    expectRepair('{“a”: “b”}', { a: 'b' })
  })

  test('escapes raw line breaks inside strings', () => {
    expectRepair('{"a": "line1\nline2"}', { a: 'line1\nline2' }, ['Escaped raw line breaks'])
  })

  test('closes an unterminated string', () => {
    expectRepair('{"a": "unfinished', { a: 'unfinished' }, ['Closed an unterminated string'])
  })

  test('replaces = with :', () => {
    expectRepair('{"a" = 1}', { a: 1 }, ['Replaced = with :'])
  })
})

describe('values', () => {
  test('converts keywords from other languages', () => {
    expectRepair(
      '{"a": NULL, "b": None, "c": True, "d": FALSE, "e": undefined}',
      { a: null, b: null, c: true, d: false, e: null },
      ['Converted NULL to null', 'Converted None to null', 'Converted True to true']
    )
  })

  test('turns NaN and Infinity into null', () => {
    expectRepair('{"a": NaN, "b": -Infinity}', { a: null, b: null })
  })

  test('normalizes malformed numbers', () => {
    expectRepair('{"a": .5, "b": 007, "c": +1, "d": 5.}', { a: 0.5, b: 7, c: 1, d: 5 }, [
      'Normalized malformed numbers',
    ])
  })

  test('keeps large integers exactly as written', () => {
    const result = expectRepair('{"id": 12345678901234567890\n"x": 1}', { id: 12345678901234567890, x: 1 })
    assert.match(result.repaired, /12345678901234567890/)
  })

  test('quotes unquoted text that is not a number', () => {
    expectRepair(
      '{"v": 1.2.3, "d": 2026-10-08, "url": http://example.com/a, "s": in progress}',
      { v: '1.2.3', d: '2026-10-08', url: 'http://example.com/a', s: 'in progress' },
      ['Quoted unquoted text values']
    )
  })

  test('fills in a missing value with null', () => {
    expectRepair('{"a": , "b": 1}', { a: null, b: 1 }, ['Filled in a missing value with null'])
  })
})

describe('comments and placeholders', () => {
  test('removes line and block comments', () => {
    expectRepair('{"a": 1, // note\n /* block */ "b": 2}', { a: 1, b: 2 }, ['Removed comments'])
  })

  test('replaces collapsed {...} placeholders with empty containers', () => {
    expectRepair('{"a": {...}, "b": [...]}', { a: {}, b: [] }, ['Removed collapsed "..." placeholders'])
  })

  test('drops ... items from arrays', () => {
    expectRepair('[1, ..., 3]', [1, 3])
  })
})

describe('text around the JSON', () => {
  const body = '{\n  "filters": [{"field": "processed", "value": 0}],\n  "sort": [{"field": "created_at"}]\n}'
  const parsedBody = { filters: [{ field: 'processed', value: 0 }], sort: [{ field: 'created_at' }] }

  test('drops a stray trailing quote instead of wrapping it in an array', () => {
    const result = expectRepair(`${body}'`, parsedBody, ["Removed stray text outside the JSON: '"])
    assert.ok(!result.fixes.some((message) => message.startsWith('Wrapped')))
    assert.ok(!result.fixes.some((message) => message.startsWith('Closed an unterminated string')))
  })

  test('strips shell quotes wrapped around the JSON', () => {
    expectRepair(`'${body}'`, parsedBody, ['Removed quotes wrapped around the whole JSON'])
  })

  test('strips a lone leading shell quote', () => {
    expectRepair(`'${body}`, parsedBody, ['Removed quotes wrapped around the whole JSON'])
  })

  test('strips backticks wrapped around the JSON', () => {
    expectRepair('`{"a": 1}`', { a: 1 }, ['Removed quotes wrapped around the whole JSON'])
  })

  test('drops a log prefix before the JSON', () => {
    expectRepair('INFO payload: {"a": 1}', { a: 1 }, ['Removed stray text outside the JSON: INFO payload:'])
  })

  test('only reports fixes for the part that was kept', () => {
    const result = expectRepair('{"a": 1} \'oops', { a: 1 })
    assert.deepEqual(result.fixes, ["Removed stray text outside the JSON: 'oops"])
  })

  test('wraps several objects in a row into an array', () => {
    expectRepair('{"a": 1}\n{"b": 2}', [{ a: 1 }, { b: 2 }], ['Wrapped multiple top-level values in an array'])
  })
})

describe('real-world input', () => {
  test('repairs an OCI audit log copied from the console', () => {
    const input = `{
"datetime":1791484615947
"logContent":{
"data":{
"additionalDetails":{...}
"availabilityDomain":"AD3"
"definedTags":NULL
"message":"LaunchInstance failed with response 'InternalError'"
}
"type":"com.oraclecloud.computeApi.LaunchInstance.begin"
}
}`
    expectRepair(
      input,
      {
        datetime: 1791484615947,
        logContent: {
          data: {
            additionalDetails: {},
            availabilityDomain: 'AD3',
            definedTags: null,
            message: "LaunchInstance failed with response 'InternalError'",
          },
          type: 'com.oraclecloud.computeApi.LaunchInstance.begin',
        },
      },
      ['Inserted missing commas', 'Removed collapsed "..." placeholders', 'Converted NULL to null']
    )
  })
})

describe('when no repair is offered', () => {
  test('returns null for input that is already valid', () => {
    assert.equal(repairJson('{"ok": true}'), null)
  })

  test('returns null for empty input', () => {
    assert.equal(repairJson('   '), null)
  })

  test('returns null when nothing sensible can be built', () => {
    assert.equal(repairJson(':::'), null)
  })

  test('returns null for nesting deeper than the limit', () => {
    assert.equal(repairJson('['.repeat(10000)), null)
  })
})

describe('safety', () => {
  test('every suggestion is valid JSON, and odd input never hangs', () => {
    const alphabet = '{}[]:,"\' \n.-+e0123456789abcNULLtrue/*#…=`'
    // Fixed-seed generator so failures are reproducible.
    let seed = 42
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }
    for (let i = 0; i < 5000; i++) {
      let input = ''
      const length = Math.floor(random() * 80)
      for (let j = 0; j < length; j++) {
        input += alphabet[Math.floor(random() * alphabet.length)]
      }
      const result = repairJson(input)
      if (result) {
        assert.doesNotThrow(() => JSON.parse(result.repaired), `invalid suggestion for: ${JSON.stringify(input)}`)
      }
    }
  })

  test('handles large input in reasonable time', () => {
    const input = `{${Array.from({ length: 100000 }, (_, i) => `k${i}: 'v${i}'`).join('\n')}}`
    const start = performance.now()
    const result = repairJson(input)
    assert.ok(result)
    assert.ok(performance.now() - start < 5000, 'repair took longer than 5s')
  })
})
