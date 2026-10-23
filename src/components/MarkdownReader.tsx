import { useState, useCallback, useMemo, useRef } from 'react'
import './JsonFormatter.css'
import './MarkdownReader.css'
import { renderMarkdown } from '../utils/markdown'

type ViewMode = 'split' | 'write' | 'read'

const VIEW_MODES: { value: ViewMode; label: string }[] = [
  { value: 'split', label: 'Split' },
  { value: 'write', label: 'Write' },
  { value: 'read', label: 'Read' },
]

const MarkdownReader = () => {
  const [input, setInput] = useState('')
  const [view, setView] = useState<ViewMode>('split')
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const html = useMemo(() => (input.trim() ? renderMarkdown(input) : ''), [input])

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    setError(null)
  }, [])

  // Files are read locally with the File API; nothing is uploaded.
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) {
      return
    }
    try {
      setInput(await file.text())
      setFileName(file.name)
      setError(null)
      setView('read')
    } catch {
      setError(`Could not read ${file.name}`)
    }
  }, [])

  const handleClear = useCallback(() => {
    setInput('')
    setFileName(null)
    setError(null)
  }, [])

  const handleCopyHtml = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(html)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    } catch {
      setError('Failed to copy to clipboard')
    }
  }, [html])

  const lineCount = input ? input.split('\n').length : 0

  return (
    <div className="json-formatter markdown-reader">
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="toolbar-section">
            <span className="toolbar-label">
              <span className="label-icon">📖</span>
              <span className="label-text">
                {fileName ? `Reading ${fileName}` : 'Paste Markdown or open a .md file'}
              </span>
            </span>
          </div>
        </div>

        <div className="toolbar-right">
          <div className="view-switch" role="group" aria-label="Layout">
            {VIEW_MODES.map((mode) => (
              <button
                key={mode.value}
                className={`view-switch-btn ${view === mode.value ? 'active' : ''}`}
                aria-pressed={view === mode.value}
                onClick={() => setView(mode.value)}
              >
                {mode.label}
              </button>
            ))}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".md,.markdown,.mdown,.mkd,.txt,text/markdown,text/plain"
            onChange={handleFileChange}
            hidden
          />
          <button onClick={() => fileInputRef.current?.click()} className="btn btn-primary btn-icon">
            <span className="btn-icon-symbol">📂</span>
            <span>Open File</span>
          </button>
          <button onClick={handleClear} className="btn btn-secondary btn-icon">
            <span className="btn-icon-symbol">🗑️</span>
            <span>Clear</span>
          </button>
        </div>
      </div>

      <div className={`markdown-grid view-${view}`}>
        <div className="editor-card markdown-input-card">
          <div className="card-header">
            <div className="card-title-group">
              <span className="card-icon">📥</span>
              <div>
                <h3 className="card-title">Markdown</h3>
                {input.length > 0 && (
                  <span className="card-meta">
                    {lineCount.toLocaleString()} lines • {input.length.toLocaleString()} characters
                  </span>
                )}
              </div>
            </div>
            {input.length > 0 && (
              <button onClick={handleClear} className="card-action" title="Clear input">
                ✕
              </button>
            )}
          </div>
          <div className="card-body">
            <textarea
              className="editor-textarea"
              value={input}
              onChange={handleInputChange}
              placeholder="Paste or type your Markdown here..."
              spellCheck={false}
            />
          </div>
        </div>

        <div className="editor-card markdown-preview-card">
          <div className="card-header">
            <div className="card-title-group">
              <span className="card-icon">👁️</span>
              <div>
                <h3 className="card-title">Preview</h3>
              </div>
            </div>
            {html && (
              <div className="card-actions">
                <button
                  onClick={handleCopyHtml}
                  className={`card-action-btn ${copied ? 'copied' : ''}`}
                  title={copied ? 'Copied!' : 'Copy rendered HTML'}
                >
                  <span>{copied ? '✓' : '📋'}</span>
                  <span className="btn-tooltip">{copied ? 'Copied!' : 'Copy HTML'}</span>
                </button>
              </div>
            )}
          </div>
          <div className="card-body card-body-output">
            <div className="card-scroll-area">
              {html ? (
                // Safe: renderMarkdown sanitizes its output with DOMPurify.
                <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: html }} />
              ) : (
                <div className="json-output-empty">Rendered Markdown will appear here...</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">
          <div className="alert-icon">⚠️</div>
          <div className="alert-content">
            <strong className="alert-title">Something went wrong</strong>
            <p className="alert-message">{error}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default MarkdownReader
