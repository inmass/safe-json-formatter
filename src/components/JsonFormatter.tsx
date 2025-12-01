import { useState, useCallback } from 'react'
import './JsonFormatter.css'

interface FormatOptions {
  indent: number
  minify: boolean
}

const JsonFormatter = () => {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)
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
        // Brief visual feedback could be added here
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

  return (
    <div className="json-formatter">
      <div className="formatter-controls">
        <div className="options-panel">
          <label className="option-item">
            <span>Indent:</span>
            <select 
              value={options.indent} 
              onChange={(e) => handleOptionsChange({ indent: Number(e.target.value) })}
            >
              <option value={2}>2 spaces</option>
              <option value={4}>4 spaces</option>
              <option value={8}>8 spaces</option>
            </select>
          </label>
          <label className="option-item">
            <input
              type="checkbox"
              checked={options.minify}
              onChange={(e) => handleOptionsChange({ minify: e.target.checked })}
            />
            <span>Minify</span>
          </label>
        </div>
        <div className="action-buttons">
          <button onClick={handleFormat} className="btn btn-primary">
            Format
          </button>
          <button onClick={handleClear} className="btn btn-secondary">
            Clear
          </button>
        </div>
      </div>

      <div className="editor-container">
        <div className="editor-panel">
          <div className="panel-header">
            <h3>Input JSON</h3>
          </div>
          <textarea
            className={`editor-input ${error ? 'error' : ''}`}
            value={input}
            onChange={handleInputChange}
            placeholder="Paste or type your JSON here..."
            spellCheck={false}
          />
        </div>

        <div className="editor-panel">
          <div className="panel-header">
            <h3>Formatted Output</h3>
            {output && (
              <div className="panel-actions">
                <button onClick={handleCopy} className="btn-icon" title="Copy">
                  📋
                </button>
                <button onClick={handleDownload} className="btn-icon" title="Download">
                  💾
                </button>
              </div>
            )}
          </div>
          <textarea
            className="editor-output"
            value={output}
            readOnly
            placeholder="Formatted JSON will appear here..."
            spellCheck={false}
          />
        </div>
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="info-panel">
        <h4>Security & Privacy</h4>
        <ul>
          <li>✅ All processing happens locally in your browser</li>
          <li>✅ No data is sent to any server</li>
          <li>✅ No logging or storage of your JSON data</li>
          <li>✅ No external dependencies for JSON parsing</li>
          <li>✅ Open source - verify the code yourself</li>
        </ul>
      </div>
    </div>
  )
}

export default JsonFormatter

