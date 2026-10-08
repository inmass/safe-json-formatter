// Best-effort repair of almost-JSON text (log viewer copies, JS object literals, etc.).
//
// Security notes:
// - Pure string processing: no eval(), no Function(), no regex over untrusted input
//   beyond simple single-character tests, no network, no dependencies.
// - Runs in linear time and caps nesting depth so hostile input can't hang the tab
//   or blow the call stack.
// - The rebuilt text is validated with native JSON.parse before it is suggested.

export interface RepairResult {
  repaired: string
  fixes: string[]
}

const MAX_DEPTH = 500

class RepairFailed extends Error {}

const KEYWORDS: Record<string, string> = {
  true: 'true',
  false: 'false',
  null: 'null',
  TRUE: 'true',
  FALSE: 'false',
  NULL: 'null',
  True: 'true',
  False: 'false',
  None: 'null',
  Null: 'null',
  nil: 'null',
  undefined: 'null',
  NaN: 'null',
  Infinity: 'null',
  '-Infinity': 'null',
}

const isWhitespace = (ch: string) =>
  ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === ' ' || ch === '﻿'

const isDigit = (ch: string) => ch >= '0' && ch <= '9'

const isQuote = (ch: string) =>
  ch === '"' || ch === "'" || ch === '`' || ch === '“' || ch === '‘'

const closingQuoteFor = (ch: string) => {
  if (ch === '“') return '”'
  if (ch === '‘') return '’'
  return ch
}

// Characters that end an unquoted key or bare-word value.
const isBareWordStop = (ch: string) =>
  ch === ',' || ch === '}' || ch === ']' || ch === '{' || ch === '[' ||
  ch === '\n' || ch === '\r' || ch === '"' || ch === "'"

const SIMPLE_ESCAPES: Record<string, string> = {
  '"': '"',
  "'": "'",
  '`': '`',
  '\\': '\\',
  '/': '/',
  b: '\b',
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t',
}

export const repairJson = (text: string): RepairResult | null => {
  const fixCounts = new Map<string, number>()
  const fix = (message: string) => {
    fixCounts.set(message, (fixCounts.get(message) ?? 0) + 1)
  }

  let pos = 0
  const peek = (offset = 0) => text.charAt(pos + offset)
  const atEnd = () => pos >= text.length

  // Every loop must consume input; bail out instead of spinning on odd input.
  const ensureProgress = (before: number) => {
    if (pos === before) {
      throw new RepairFailed()
    }
  }

  const skipWhitespaceAndComments = () => {
    while (!atEnd()) {
      const ch = peek()
      if (isWhitespace(ch)) {
        pos++
      } else if (ch === '/' && peek(1) === '/') {
        while (!atEnd() && peek() !== '\n') pos++
        fix('Removed comments')
      } else if (ch === '/' && peek(1) === '*') {
        const end = text.indexOf('*/', pos + 2)
        pos = end === -1 ? text.length : end + 2
        fix('Removed comments')
      } else {
        return
      }
    }
  }

  const isEllipsisAhead = () =>
    peek() === '…' || (peek() === '.' && peek(1) === '.' && peek(2) === '.')

  const skipEllipsis = () => {
    if (peek() === '…') {
      pos++
    } else {
      while (peek() === '.') pos++
    }
    fix('Removed collapsed "..." placeholders (that content was not in the pasted text)')
  }

  const parseString = (): string => {
    const open = peek()
    const close = closingQuoteFor(open)
    if (open !== '"') {
      fix('Converted single/back/smart quotes to double quotes')
    }
    pos++

    let value = ''
    let sawRawControl = false
    for (;;) {
      if (atEnd()) {
        fix('Closed an unterminated string')
        break
      }
      const ch = peek()
      if (ch === close) {
        pos++
        break
      }
      if (ch === '\\') {
        const next = peek(1)
        if (next === 'u' && /^[0-9a-fA-F]{4}$/.test(text.slice(pos + 2, pos + 6))) {
          value += String.fromCharCode(parseInt(text.slice(pos + 2, pos + 6), 16))
          pos += 6
        } else if (next in SIMPLE_ESCAPES) {
          value += SIMPLE_ESCAPES[next]
          pos += 2
        } else {
          // Unknown escape like "\d": keep it literally.
          value += '\\'
          pos++
          fix('Escaped stray backslashes inside strings')
        }
        continue
      }
      if (ch < ' ') {
        sawRawControl = true
      }
      value += ch
      pos++
    }
    if (sawRawControl) {
      fix('Escaped raw line breaks/tabs inside strings')
    }
    return JSON.stringify(value)
  }

  // Manual scan (no regex) so very long tokens can't trigger backtracking.
  const normalizeNumber = (raw: string): string | null => {
    let i = 0
    let sign = ''
    if (raw[i] === '+' || raw[i] === '-') {
      sign = raw[i] === '-' ? '-' : ''
      i++
    }
    const skipDigits = () => {
      const from = i
      while (i < raw.length && isDigit(raw[i])) i++
      return raw.slice(from, i)
    }
    let intPart = skipDigits()
    let fracPart = ''
    if (raw[i] === '.') {
      i++
      fracPart = skipDigits()
    }
    if (!intPart && !fracPart) return null
    let exponent = ''
    if (raw[i] === 'e' || raw[i] === 'E') {
      i++
      if (raw[i] === '+' || raw[i] === '-') exponent += raw[i++]
      const expDigits = skipDigits()
      if (!expDigits) return null
      exponent = `e${exponent}${expDigits}`
    }
    if (i !== raw.length) return null

    let start = 0
    while (start < intPart.length - 1 && intPart[start] === '0') start++
    intPart = intPart.slice(start) || '0'
    return sign + intPart + (fracPart ? `.${fracPart}` : '') + exponent
  }

  const parseNumberOrWord = (): string => {
    const start = pos
    while (!atEnd() && !isBareWordStop(peek()) && !isWhitespace(peek()) && peek() !== ':') pos++
    const raw = text.slice(start, pos)
    const normalized = normalizeNumber(raw)
    if (normalized === null) {
      // Not a number after all (e.g. 1.2.3 or 2026-10-08): treat as bare text.
      pos = start
      return parseBareWordValue()
    }
    if (normalized !== raw) {
      fix('Normalized malformed numbers')
    }
    return normalized
  }

  const readBareWord = (forKey: boolean): string => {
    const start = pos
    while (!atEnd()) {
      const ch = peek()
      if (isBareWordStop(ch)) break
      if (forKey && (ch === ':' || ch === '=' || isWhitespace(ch))) break
      if (ch === '/' && (peek(1) === '/' || peek(1) === '*') && (pos === start || isWhitespace(text.charAt(pos - 1)))) break
      pos++
    }
    return text.slice(start, pos).trim()
  }

  const parseBareWordValue = (): string => {
    const word = readBareWord(false)
    if (!word) {
      throw new RepairFailed()
    }
    if (word in KEYWORDS) {
      if (KEYWORDS[word] !== word) {
        fix(`Converted ${word} to ${KEYWORDS[word]}`)
      }
      return KEYWORDS[word]
    }
    fix('Quoted unquoted text values')
    return JSON.stringify(word)
  }

  const parseValue = (depth: number): string => {
    if (depth > MAX_DEPTH) {
      throw new RepairFailed()
    }
    skipWhitespaceAndComments()
    if (atEnd()) {
      fix('Filled in a missing value with null')
      return 'null'
    }

    const ch = peek()
    if (ch === '{') return parseObject(depth + 1)
    if (ch === '[') return parseArray(depth + 1)
    if (isQuote(ch)) return parseString()
    if (isEllipsisAhead()) {
      skipEllipsis()
      return 'null'
    }
    if (isDigit(ch) || ch === '-' || ch === '+' || ch === '.') {
      return parseNumberOrWord()
    }
    if (ch === ',' || ch === '}' || ch === ']' || ch === ':') {
      fix('Filled in a missing value with null')
      return 'null'
    }
    return parseBareWordValue()
  }

  // After a member/element: consume a separator, or note that one was missing.
  // Returns true when the container should close.
  const afterItem = (closer: string): boolean => {
    skipWhitespaceAndComments()
    if (peek() === ',') {
      pos++
      skipWhitespaceAndComments()
      while (peek() === ',') {
        pos++
        fix('Removed duplicate commas')
        skipWhitespaceAndComments()
      }
      if (peek() === closer) {
        fix('Removed trailing commas')
      }
      return false
    }
    if (atEnd() || peek() === closer || peek() === '}' || peek() === ']') {
      return true
    }
    fix('Inserted missing commas')
    return false
  }

  const closeContainer = (closer: string) => {
    if (peek() === closer) {
      pos++
    } else {
      fix(`Added missing closing ${closer}`)
    }
  }

  const parseObject = (depth: number): string => {
    pos++ // {
    const members: string[] = []
    for (;;) {
      const loopStart = pos
      skipWhitespaceAndComments()
      if (atEnd() || peek() === '}' || peek() === ']') break
      if (peek() === ',') {
        pos++
        fix('Removed duplicate commas')
        continue
      }
      if (isEllipsisAhead()) {
        skipEllipsis()
        if (afterItem('}')) break
        continue
      }

      let key: string
      if (isQuote(peek())) {
        key = parseString()
      } else {
        const word = readBareWord(true)
        if (!word) {
          throw new RepairFailed()
        }
        fix('Quoted unquoted keys')
        key = JSON.stringify(word)
      }

      skipWhitespaceAndComments()
      if (peek() === ':') {
        pos++
      } else if (peek() === '=') {
        pos++
        fix('Replaced = with :')
      } else {
        fix('Inserted missing colons')
      }

      members.push(`${key}:${parseValue(depth)}`)
      if (afterItem('}')) break
      ensureProgress(loopStart)
    }
    closeContainer('}')
    return `{${members.join(',')}}`
  }

  const parseArray = (depth: number): string => {
    pos++ // [
    const items: string[] = []
    for (;;) {
      const loopStart = pos
      skipWhitespaceAndComments()
      if (atEnd() || peek() === ']' || peek() === '}') break
      if (peek() === ',') {
        pos++
        fix('Removed duplicate commas')
        continue
      }
      if (isEllipsisAhead()) {
        skipEllipsis()
        if (afterItem(']')) break
        continue
      }
      items.push(parseValue(depth))
      if (afterItem(']')) break
      ensureProgress(loopStart)
    }
    closeContainer(']')
    return `[${items.join(',')}]`
  }

  try {
    const values: string[] = []
    skipWhitespaceAndComments()
    while (!atEnd()) {
      const loopStart = pos
      if (peek() === '}' || peek() === ']') {
        pos++
        fix('Removed extra closing brackets')
      } else if (peek() === ',') {
        pos++
      } else {
        values.push(parseValue(0))
      }
      ensureProgress(loopStart)
      skipWhitespaceAndComments()
    }

    if (values.length === 0) {
      return null
    }
    let repaired = values[0]
    if (values.length > 1) {
      fix('Wrapped multiple top-level values in an array')
      repaired = `[${values.join(',')}]`
    }

    // Final authority is the native parser.
    JSON.parse(repaired)

    const fixes = Array.from(fixCounts.entries()).map(([message, count]) =>
      count > 1 ? `${message} (${count}×)` : message
    )
    return fixes.length > 0 ? { repaired, fixes } : null
  } catch {
    return null
  }
}
