import { useState, useCallback, useRef } from 'react'
import './JsonFormatter.css'

interface FormatOptions {
  indent: number
  minify: boolean
}

const JsonFormatter = () => {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const inputTextareaRef = useRef<HTMLTextAreaElement>(null)
  const outputTextareaRef = useRef<HTMLTextAreaElement>(null)
  const [options, setOptions] = useState<FormatOptions>({
    indent: 2,
    minify: false,
  })

  // Sync textarea heights when one is resized
  const syncHeights = useCallback((sourceElement: HTMLTextAreaElement) => {
    const inputEl = inputTextareaRef.current
    const outputEl = outputTextareaRef.current
    
    if (!inputEl || !outputEl) return

    // Get the height of the resized element
    const newHeight = sourceElement.clientHeight
    
    // Apply the same height to the other textarea
    if (sourceElement === inputEl) {
      outputEl.style.height = `${newHeight}px`
    } else {
      inputEl.style.height = `${newHeight}px`
    }
  }, [])

  // Handle resize on input textarea
  const handleInputResize = useCallback(() => {
    if (inputTextareaRef.current) {
      // Small delay to let the browser update the height first
      setTimeout(() => {
        syncHeights(inputTextareaRef.current!)
      }, 10)
    }
  }, [syncHeights])

  // Handle resize on output textarea
  const handleOutputResize = useCallback(() => {
    if (outputTextareaRef.current) {
      // Small delay to let the browser update the height first
      setTimeout(() => {
        syncHeights(outputTextareaRef.current!)
      }, 10)
    }
  }, [syncHeights])

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
      
      if (opts.minify) {
        setOutput(JSON.stringify(parsed))
      } else {
        setOutput(JSON.stringify(parsed, null, opts.indent))
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      setOutput('')
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
    setError(null)
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
              ref={inputTextareaRef}
              className={`editor-textarea ${error ? 'error' : ''}`}
              value={input}
              onChange={handleInputChange}
              onMouseUp={handleInputResize}
              onMouseMove={() => {
                if (inputTextareaRef.current) {
                  handleInputResize()
                }
              }}
              onTouchEnd={handleInputResize}
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
          <div className="card-body">
            <textarea
              ref={outputTextareaRef}
              className="editor-textarea output"
              value={output}
              readOnly
              onMouseUp={handleOutputResize}
              onMouseMove={() => {
                if (outputTextareaRef.current) {
                  handleOutputResize()
                }
              }}
              onTouchEnd={handleOutputResize}
              placeholder="Formatted JSON will appear here..."
              spellCheck={false}
            />
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

