import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import JsonFormatter from './components/JsonFormatter'
import './App.css'

// The Markdown and SQL tools pull in their own libraries, so they load only when opened.
const MarkdownReader = lazy(() => import('./components/MarkdownReader'))
const SqlFormatter = lazy(() => import('./components/SqlFormatter'))

const TOOLS = [
  { id: 'json', label: 'JSON Formatter', shortLabel: 'JSON', icon: '🧾' },
  { id: 'markdown', label: 'Markdown Reader', shortLabel: 'Markdown', icon: '📖' },
  { id: 'sql', label: 'SQL Formatter', shortLabel: 'SQL', icon: '🗄️' },
] as const

type ToolId = typeof TOOLS[number]['id']

// The active tool lives in the URL hash so each tool can be linked to directly.
const toolFromHash = (): ToolId => {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return TOOLS.find((tool) => tool.id === hash)?.id ?? 'json'
}

function App() {
  const [activeTool, setActiveTool] = useState<ToolId>(toolFromHash)
  const [openedTools, setOpenedTools] = useState<Set<ToolId>>(() => new Set([toolFromHash()]))

  const showTool = useCallback((id: ToolId) => {
    setActiveTool(id)
    setOpenedTools((previous) => (previous.has(id) ? previous : new Set(previous).add(id)))
  }, [])

  useEffect(() => {
    const handleHashChange = () => showTool(toolFromHash())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [showTool])

  const handleSelectTool = useCallback((id: ToolId) => {
    const { pathname, search } = window.location
    window.history.pushState(null, '', id === 'json' ? pathname + search : `#${id}`)
    showTool(id)
  }, [showTool])

  return (
    <div className="app">
      <header className="app-header" role="banner">
        <h1>Safe JSON Formatter</h1>
        <p className="subtitle">Secure • Client-Side • No Data Storage</p>
      </header>
      <nav className="tool-tabs" aria-label="Tools">
        <div className="tool-tabs-inner" role="tablist">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              role="tab"
              aria-label={tool.label}
              aria-selected={activeTool === tool.id}
              className={`tool-tab ${activeTool === tool.id ? 'active' : ''}`}
              onClick={() => handleSelectTool(tool.id)}
            >
              <span className="tool-tab-icon" aria-hidden="true">{tool.icon}</span>
              <span className="tool-tab-label">{tool.label}</span>
              <span className="tool-tab-short-label">{tool.shortLabel}</span>
            </button>
          ))}
        </div>
      </nav>
      <main className="app-main" role="main">
        {/* Tools stay mounted once opened so switching tabs keeps their input. */}
        {openedTools.has('json') && (
          <div hidden={activeTool !== 'json'}>
            <JsonFormatter />
          </div>
        )}
        {openedTools.has('markdown') && (
          <div hidden={activeTool !== 'markdown'}>
            <Suspense fallback={<div className="tool-loading">Loading…</div>}>
              <MarkdownReader />
            </Suspense>
          </div>
        )}
        {openedTools.has('sql') && (
          <div hidden={activeTool !== 'sql'}>
            <Suspense fallback={<div className="tool-loading">Loading…</div>}>
              <SqlFormatter />
            </Suspense>
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
      </main>
      <footer className="app-footer" role="contentinfo">
        <p>
          <strong>Privacy First:</strong> All processing happens in your browser.
          No data is sent to servers, logged, or stored anywhere.
        </p>
        <p>
          <a
            href="https://github.com/inmass/safe-json-formatter"
            target="_blank"
            rel="noopener noreferrer"
            className="github-link"
            aria-label="View source code on GitHub"
          >
            View Source on GitHub
          </a>
        </p>
      </footer>
    </div>
  )
}

export default App
