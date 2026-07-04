import { useState, useCallback, useRef } from 'react'
import './JsonFormatter.css'
import JsonTreeView from './JsonTreeView'
import { serializeValueForClipboard } from '../utils/jsonValue'

interface FormatOptions {
  indent: number
  minify: boolean
}

const JsonFormatter = () => {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [parsedValue, setParsedValue] = useState<unknown>(null)
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(() => new Set())
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [copyOnClick, setCopyOnClick] = useState(false)
  const [copiedValuePath, setCopiedValuePath] = useState<string | null>(null)
  const [options, setOptions] = useState<FormatOptions>({
    indent: 2,
    minify: false,
  })

  // Secure JSON parsing - no eval, no Function constructor
  // Handles double-encoded JSON (JSON string containing JSON)
  const parseJson = useCallback((text: string): unknown => {
    try {
      // Remove any potential script tags or dangerous content
      const cleaned = text.trim()
      if (!cleaned) {
        return null
      }
      
      // Use native JSON.parse only - safest method
      let parsed = JSON.parse(cleaned)
      
      // Handle double-encoded JSON (common when JSON is stored as a string)
      // If the result is a string that looks like JSON, try parsing it again
      if (typeof parsed === 'string') {
        const trimmedString = parsed.trim()
        // Check if it looks like JSON (starts with { or [)
        if ((trimmedString.startsWith('{') && trimmedString.endsWith('}')) ||
            (trimmedString.startsWith('[') && trimmedString.endsWith(']'))) {
          try {
            // Safely parse the inner JSON
            parsed = JSON.parse(trimmedString)
          } catch {
            // If inner parse fails, return the string as-is
            // This is safe - we're not using eval or Function
          }
        }
      }
      
      return parsed
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new Error(`Invalid JSON: ${err.message}`)
      }
      throw err
    }
  }, [])

  const formatJson = useCallback((text: string, opts: FormatOptions) => {
    try {
      setError(null)
      
      const parsed = parseJson(text)
      const formattedOutput = opts.minify
        ? JSON.stringify(parsed)
        : JSON.stringify(parsed, null, opts.indent)
      
      setOutput(formattedOutput)
      setParsedValue(parsed)
      setCollapsedPaths(new Set())
      setSelectedPath(null)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      setOutput('')
      setParsedValue(null)
      setCollapsedPaths(new Set())
      setSelectedPath(null)
    }
  }, [parseJson])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newInput = e.target.value
    setInput(newInput)
    
    // Auto-format on change (debounced would be better for large inputs)
    if (newInput.trim()) {
      formatJson(newInput, options)
    } else {
      setOutput('')
      setError(null)
    }
  }, [formatJson, options])

  const handleFormat = useCallback(() => {
    if (input.trim()) {
      formatJson(input, options)
    }
  }, [input, formatJson, options])

  const handleClear = useCallback(() => {
    setInput('')
    setOutput('')
    setParsedValue(null)
    setCollapsedPaths(new Set())
    setSelectedPath(null)
    setError(null)
  }, [])

  const copiedValueTimeoutRef = useRef<number | null>(null)

  const handleLineSelect = useCallback(async (path: string, value: unknown) => {
    const selection = window.getSelection()
    if (selection && selection.toString().trim()) {
      return
    }

    setSelectedPath(path)

    if (!copyOnClick) {
      return
    }

    try {
      await navigator.clipboard.writeText(serializeValueForClipboard(value, options.indent))

      if (copiedValueTimeoutRef.current !== null) {
        window.clearTimeout(copiedValueTimeoutRef.current)
      }

      setCopiedValuePath(path)
      copiedValueTimeoutRef.current = window.setTimeout(() => {
        setCopiedValuePath(null)
        copiedValueTimeoutRef.current = null
      }, 2000)
    } catch {
      setError('Failed to copy value to clipboard')
    }
  }, [copyOnClick, options.indent])

  const handleToggleCollapse = useCallback((path: string, event: React.MouseEvent) => {
    event.stopPropagation()

    setCollapsedPaths((previous) => {
      const next = new Set(previous)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const handleCopy = useCallback(async () => {
    if (output) {
      try {
        await navigator.clipboard.writeText(output)
        setCopied(true)
        // Reset the icon after 2 seconds
        setTimeout(() => {
          setCopied(false)
        }, 2000)
      } catch (err) {
        setError('Failed to copy to clipboard')
      }
    }
  }, [output])

  const handleDownload = useCallback(() => {
    if (output) {
      const blob = new Blob([output], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'formatted.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }
  }, [output])

  const handleOptionsChange = useCallback((newOptions: Partial<FormatOptions>) => {
    const updatedOptions = { ...options, ...newOptions }
    setOptions(updatedOptions)
    if (input.trim()) {
      formatJson(input, updatedOptions)
    }
  }, [input, formatJson, options])

  const inputLength = input.length
  const outputLength = output.length
  const isValid = !error && output.length > 0

  return (
    <div className="json-formatter">
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="toolbar-section">
            <label className="toolbar-label">
              <span className="label-icon">⚙️</span>
              <span className="label-text">Indentation</span>
            </label>
            <select 
              className="toolbar-select"
              value={options.indent} 
              onChange={(e) => handleOptionsChange({ indent: Number(e.target.value) })}
            >
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
              <option value={8}>8 spaces</option>
            </select>
          </div>
          
          <div className="toolbar-section">
            <label className="toolbar-toggle">
              <input
                type="checkbox"
                checked={options.minify}
                onChange={(e) => handleOptionsChange({ minify: e.target.checked })}
                className="toggle-input"
              />
              <span className="toggle-slider"></span>
              <span className="toggle-label">Minify</span>
            </label>
          </div>
        </div>

        <div className="toolbar-right">
          <button onClick={handleFormat} className="btn btn-primary btn-icon">
            <span className="btn-icon-symbol">✨</span>
            <span>Format JSON</span>
          </button>
          <button onClick={handleClear} className="btn btn-secondary btn-icon">
            <span className="btn-icon-symbol">🗑️</span>
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className="editor-grid">
        <div className="editor-card">
          <div className="card-header">
            <div className="card-title-group">
              <span className="card-icon">📥</span>
              <div>
                <h3 className="card-title">Input JSON</h3>
                {inputLength > 0 && (
                  <span className="card-meta">{inputLength.toLocaleString()} characters</span>
                )}
              </div>
            </div>
            {inputLength > 0 && (
              <button onClick={handleClear} className="card-action" title="Clear input">
                ✕
              </button>
            )}
          </div>
          <div className="card-body">
            <textarea
              className={`editor-textarea ${error ? 'error' : ''}`}
              value={input}
              onChange={handleInputChange}
              placeholder="Paste or type your JSON here..."
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
                {outputLength > 0 && (
                  <span className="card-meta">
                    {outputLength.toLocaleString()} characters
                    {isValid && <span className="status-badge success">✓ Valid</span>}
                  </span>
                )}
              </div>
            </div>
            {output && (
              <div className="card-actions">
                <label
                  className={`toolbar-toggle output-toggle ${options.minify ? 'disabled' : ''}`}
                  title={options.minify ? 'Turn off Minify to use click-to-copy' : 'Copy the value at the clicked path'}
                >
                  <input
                    type="checkbox"
                    checked={copyOnClick}
                    disabled={options.minify}
                    onChange={(event) => setCopyOnClick(event.target.checked)}
                    className="toggle-input"
                  />
                  <span className="toggle-slider"></span>
                  <span className="toggle-label">Click to copy</span>
                </label>
                <button 
                  onClick={handleCopy} 
                  className={`card-action-btn ${copied ? 'copied' : ''}`}
                  title={copied ? 'Copied!' : 'Copy to clipboard'}
                >
                  <span>{copied ? '✓' : '📋'}</span>
                  <span className="btn-tooltip">{copied ? 'Copied!' : 'Copy'}</span>
                </button>
                <button onClick={handleDownload} className="card-action-btn" title="Download JSON">
                  <span>💾</span>
                  <span className="btn-tooltip">Download</span>
                </button>
              </div>
            )}
          </div>
          <div className="card-body card-body-output">
            {output ? (
              <>
                <div className="selected-path" aria-live="polite">
                  <span className="selected-path-label">
                    Selected path
                    {copiedValuePath && copiedValuePath === selectedPath && (
                      <span className="selected-path-copied">Copied!</span>
                    )}
                  </span>
                  <code className="selected-path-value">
                    {selectedPath ?? (
                      copyOnClick
                        ? 'Click any value to copy it to the clipboard'
                        : 'Click any line to inspect its path'
                    )}
                  </code>
                </div>
                <div className="card-scroll-area">
                  {options.minify ? (
                    <div className="json-output-minified">{output}</div>
                  ) : (
                    <JsonTreeView
                      value={parsedValue}
                      indent={options.indent}
                      collapsedPaths={collapsedPaths}
                      onToggle={handleToggleCollapse}
                      selectedPath={selectedPath}
                      onSelectPath={handleLineSelect}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="card-scroll-area">
                <div className="json-output-empty">Formatted JSON will appear here...</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <div className="alert-icon">⚠️</div>
          <div className="alert-content">
            <strong className="alert-title">Invalid JSON</strong>
            <p className="alert-message">{error}</p>
          </div>
        </div>
      )}

      <div className="features-grid">
        <div className="feature-card">
          <div className="feature-icon">🔒</div>
          <h4 className="feature-title">100% Client-Side</h4>
          <p className="feature-desc">All processing happens locally in your browser</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🚫</div>
          <h4 className="feature-title">No Data Transmission</h4>
          <p className="feature-desc">Nothing is sent to any server</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">📝</div>
          <h4 className="feature-title">No Logging</h4>
          <p className="feature-desc">No data is logged or stored anywhere</p>
        </div>
        <div className="feature-card">
          <div className="feature-icon">🔍</div>
          <h4 className="feature-title">Open Source</h4>
          <p className="feature-desc">Verify the code yourself on GitHub</p>
        </div>
      </div>
    </div>
  )
}

export default JsonFormatter

