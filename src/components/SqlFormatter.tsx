import { useState, useCallback, useMemo } from 'react'
import { format, KeywordCase, SqlLanguage } from 'sql-formatter'
import './JsonFormatter.css'
import './SqlFormatter.css'
import { tokenizeSql } from '../utils/sqlHighlight'

const DIALECTS: { value: SqlLanguage; label: string }[] = [
  { value: 'sql', label: 'Standard SQL' },
  { value: 'postgresql', label: 'PostgreSQL' },
  { value: 'mysql', label: 'MySQL' },
  { value: 'mariadb', label: 'MariaDB' },
  { value: 'sqlite', label: 'SQLite' },
  { value: 'transactsql', label: 'SQL Server (T-SQL)' },
  { value: 'plsql', label: 'Oracle PL/SQL' },
  { value: 'bigquery', label: 'BigQuery' },
  { value: 'snowflake', label: 'Snowflake' },
  { value: 'redshift', label: 'Redshift' },
  { value: 'duckdb', label: 'DuckDB' },
  { value: 'clickhouse', label: 'ClickHouse' },
  { value: 'spark', label: 'Spark SQL' },
  { value: 'trino', label: 'Trino / Presto' },
]

interface SqlFormatOptions {
  language: SqlLanguage
  tabWidth: number
  keywordCase: KeywordCase
}

type SqlResult = { output: string; error: null } | { output: ''; error: string }

const formatSql = (text: string, opts: SqlFormatOptions): SqlResult => {
  if (!text.trim()) {
    return { output: '', error: null }
  }
  try {
    return {
      output: format(text, {
        language: opts.language,
        tabWidth: opts.tabWidth,
        keywordCase: opts.keywordCase,
        dataTypeCase: opts.keywordCase,
        functionCase: opts.keywordCase,
      }),
      error: null,
    }
  } catch (err) {
    // Parse errors carry a long grammar trace after the first line; only the first line is useful.
    const message = err instanceof Error ? err.message.split('\n')[0] : 'Unknown error occurred'
    return { output: '', error: message }
  }
}

const SqlFormatter = () => {
  const [input, setInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [copyError, setCopyError] = useState<string | null>(null)
  const [options, setOptions] = useState<SqlFormatOptions>({
    language: 'sql',
    tabWidth: 2,
    keywordCase: 'upper',
  })

  // Formatting is pure and fast, so it reruns on every input or option change.
  const { output, error } = useMemo(() => formatSql(input, options), [input, options])

  const handleOptionsChange = useCallback((newOptions: Partial<SqlFormatOptions>) => {
    setOptions((previous) => ({ ...previous, ...newOptions }))
  }, [])

  const handleClear = useCallback(() => {
    setInput('')
    setCopyError(null)
  }, [])

  const handleCopy = useCallback(async () => {
    if (output) {
      try {
        await navigator.clipboard.writeText(output)
        setCopied(true)
        setTimeout(() => {
          setCopied(false)
        }, 2000)
      } catch {
        setCopyError('Failed to copy to clipboard')
      }
    }
  }, [output])

  const handleDownload = useCallback(() => {
    if (output) {
      const blob = new Blob([output], { type: 'application/sql' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'formatted.sql'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }, [output])

  const isValid = !error && output.length > 0
  const tokens = useMemo(() => tokenizeSql(output), [output])
  const lineCount = output ? output.split('\n').length : 0

  return (
    <div className="json-formatter sql-formatter">
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="toolbar-section">
            <label className="toolbar-label" htmlFor="sql-dialect">
              <span className="label-icon">🗄️</span>
              <span className="label-text">Dialect</span>
            </label>
            <select
              id="sql-dialect"
              className="toolbar-select"
              value={options.language}
              onChange={(e) => handleOptionsChange({ language: e.target.value as SqlLanguage })}
            >
              {DIALECTS.map((dialect) => (
                <option key={dialect.value} value={dialect.value}>{dialect.label}</option>
              ))}
            </select>
          </div>

          <div className="toolbar-section">
            <label className="toolbar-label" htmlFor="sql-keyword-case">
              <span className="label-icon">🔠</span>
              <span className="label-text">Keywords</span>
            </label>
            <select
              id="sql-keyword-case"
              className="toolbar-select"
              value={options.keywordCase}
              onChange={(e) => handleOptionsChange({ keywordCase: e.target.value as KeywordCase })}
            >
              <option value="upper">UPPERCASE</option>
              <option value="lower">lowercase</option>
              <option value="preserve">Preserve</option>
            </select>
          </div>

          <div className="toolbar-section">
            <label className="toolbar-label" htmlFor="sql-indent">
              <span className="label-icon">⚙️</span>
              <span className="label-text">Indentation</span>
            </label>
            <select
              id="sql-indent"
              className="toolbar-select"
              value={options.tabWidth}
              onChange={(e) => handleOptionsChange({ tabWidth: Number(e.target.value) })}
            >
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
            </select>
          </div>
        </div>

        <div className="toolbar-right">
          <button onClick={handleClear} className="btn btn-secondary btn-icon">
            <span className="btn-icon-symbol">🗑️</span>
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="sql-stack">
        <div className="editor-card">
          <div className="card-header">
            <div className="card-title-group">
              <span className="card-icon">📥</span>
              <div>
                <h3 className="card-title">Input SQL</h3>
                {input.length > 0 && (
                  <span className="card-meta">{input.length.toLocaleString()} characters</span>
                )}
              </div>
            </div>
            {input.length > 0 && (
              <button onClick={handleClear} className="card-action" title="Clear input">
                ✕
              </button>
            )}
          </div>
          <div className="card-body sql-input-body">
            <textarea
              className={`editor-textarea ${error ? 'error' : ''}`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Paste or type your SQL here..."
              spellCheck={false}
            />
          </div>
        </div>

        <div className="editor-card">
          <div className="card-header">
            <div className="card-title-group">
              <span className="card-icon">📤</span>
              <div>
                <h3 className="card-title">Formatted Output</h3>
                {output.length > 0 && (
                  <span className="card-meta">
                    {lineCount.toLocaleString()} lines • {output.length.toLocaleString()} characters
                    {isValid && <span className="status-badge success">✓ Formatted</span>}
                  </span>
                )}
              </div>
            </div>
            {output && (
              <div className="card-actions">
                <button
                  onClick={handleCopy}
                  className={`card-action-btn ${copied ? 'copied' : ''}`}
                  title={copied ? 'Copied!' : 'Copy to clipboard'}
                >
                  <span>{copied ? '✓' : '📋'}</span>
                  <span className="btn-tooltip">{copied ? 'Copied!' : 'Copy'}</span>
                </button>
                <button onClick={handleDownload} className="card-action-btn" title="Download SQL">
                  <span>💾</span>
                  <span className="btn-tooltip">Download</span>
                </button>
              </div>
            )}
          </div>
          <div className="card-body card-body-output sql-output-body">
            {output ? (
              // Tokens are rendered as React text nodes, never as HTML.
              <pre className="sql-output">
                {tokens.map((token, index) => (
                  token.type === 'plain'
                    ? token.text
                    : <span key={index} className={`sql-${token.type}`}>{token.text}</span>
                ))}
              </pre>
            ) : (
              <div className="json-output-empty">Formatted SQL will appear here...</div>
            )}
          </div>
        </div>
      </div>

      {(error || copyError) && (
        <div className="alert alert-error">
          <div className="alert-icon">⚠️</div>
          <div className="alert-content">
            <strong className="alert-title">{error ? 'Could not format SQL' : 'Something went wrong'}</strong>
            <p className="alert-message">{error ?? copyError}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default SqlFormatter
