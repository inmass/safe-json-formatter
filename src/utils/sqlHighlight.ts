// Splits SQL into tokens for syntax coloring. Every character of the input ends up in exactly
// one token, so joining the token texts gives back the original string.

export type SqlTokenType =
  | 'keyword'
  | 'function'
  | 'string'
  | 'identifier'
  | 'number'
  | 'comment'
  | 'operator'
  | 'punctuation'
  | 'variable'
  | 'plain'

export interface SqlToken {
  type: SqlTokenType
  text: string
}

const KEYWORDS = new Set(
  `add all alter and any as asc between by case cast check column constraint create cross current_date
  current_time current_timestamp database default delete desc distinct drop else end except exists false
  fetch for foreign from full group having if ilike in index inner insert intersect interval into is join
  key left like limit natural not null nulls offset on or order outer over partition primary references
  returning right rows select set table then top true truncate union unique update using values view when
  where window with recursive lateral replace ignore duplicate engine temporary trigger procedure function
  begin commit rollback transaction declare return returns language if explain analyze grant revoke
  int integer bigint smallint tinyint decimal numeric float double real varchar char text boolean bool
  date time timestamp datetime json jsonb uuid blob`
    .split(/\s+/)
    .filter(Boolean),
)

const OPERATOR_CHARS = '=<>!+-*/%|&^~:'
const PUNCTUATION_CHARS = '(),;.[]{}'

const isWordStart = (ch: string) => /[A-Za-z_À-￿]/.test(ch)
const isWordChar = (ch: string) => /[A-Za-z0-9_$À-￿]/.test(ch)

// Index just past a quoted run starting at `start`; a doubled quote inside counts as an escape.
const endOfQuoted = (sql: string, start: number, quote: string): number => {
  let i = start + 1
  while (i < sql.length) {
    if (sql[i] === '\\' && quote !== '`') {
      i += 2
      continue
    }
    if (sql[i] === quote) {
      if (sql[i + 1] === quote) {
        i += 2
        continue
      }
      return i + 1
    }
    i++
  }
  return sql.length
}

export const tokenizeSql = (sql: string): SqlToken[] => {
  const tokens: SqlToken[] = []
  const push = (type: SqlTokenType, text: string) => {
    const last = tokens[tokens.length - 1]
    if (last && last.type === type && (type === 'plain' || type === 'punctuation')) {
      last.text += text
    } else {
      tokens.push({ type, text })
    }
  }

  let i = 0
  while (i < sql.length) {
    const ch = sql[i]
    const next = sql[i + 1]

    if (ch === '-' && next === '-') {
      const end = sql.indexOf('\n', i)
      const stop = end === -1 ? sql.length : end
      push('comment', sql.slice(i, stop))
      i = stop
    } else if (ch === '/' && next === '*') {
      const end = sql.indexOf('*/', i + 2)
      const stop = end === -1 ? sql.length : end + 2
      push('comment', sql.slice(i, stop))
      i = stop
    } else if (ch === "'" || ch === '"') {
      const stop = endOfQuoted(sql, i, ch)
      push(ch === "'" ? 'string' : 'identifier', sql.slice(i, stop))
      i = stop
    } else if (ch === '`') {
      const stop = endOfQuoted(sql, i, '`')
      push('identifier', sql.slice(i, stop))
      i = stop
    } else if (/[0-9]/.test(ch) || (ch === '.' && next !== undefined && /[0-9]/.test(next))) {
      const match = /^(0x[0-9a-f]+|\d*\.?\d+(e[+-]?\d+)?)/i.exec(sql.slice(i))
      const text = match ? match[0] : ch
      push('number', text)
      i += text.length
    } else if ((ch === '@' || ch === '$' || ch === '?') || (ch === ':' && next !== undefined && isWordStart(next))) {
      let j = i + 1
      while (j < sql.length && (isWordChar(sql[j]) || sql[j] === '@')) {
        j++
      }
      push('variable', sql.slice(i, j))
      i = j
    } else if (isWordStart(ch)) {
      let j = i + 1
      while (j < sql.length && isWordChar(sql[j])) {
        j++
      }
      const word = sql.slice(i, j)
      // A word directly followed by "(" is a function call unless it is a keyword like IN or EXISTS.
      let k = j
      while (k < sql.length && (sql[k] === ' ' || sql[k] === '\t')) {
        k++
      }
      const isKeyword = KEYWORDS.has(word.toLowerCase())
      const precededByDot = tokens[tokens.length - 1]?.text.endsWith('.')
      if (isKeyword && !precededByDot) {
        push('keyword', word)
      } else if (sql[k] === '(') {
        push('function', word)
      } else {
        push('plain', word)
      }
      i = j
    } else if (OPERATOR_CHARS.includes(ch)) {
      push('operator', ch)
      i++
    } else if (PUNCTUATION_CHARS.includes(ch)) {
      push('punctuation', ch)
      i++
    } else {
      push('plain', ch)
      i++
    }
  }
  return tokens
}
