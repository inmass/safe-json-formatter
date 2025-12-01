import JsonFormatter from './components/JsonFormatter'
import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app-header" role="banner">
        <h1>Safe JSON Formatter</h1>
        <p className="subtitle">Secure • Client-Side • No Data Storage</p>
      </header>
      <main className="app-main" role="main">
        <JsonFormatter />
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

