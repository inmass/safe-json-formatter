import './JsonTreeView.css'

type JsonPathSegment = string | number

export const ROOT_PATH = '(root)'

export const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const isIdentifierKey = (key: string) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(key)

export const formatPath = (segments: JsonPathSegment[]) => {
  const path = segments.reduce<string>((result, segment) => {
    if (typeof segment === 'number') {
      return `${result}[${segment}]`
    }

    if (!result) {
      return isIdentifierKey(segment) ? segment : `["${segment}"]`
    }

    return isIdentifierKey(segment)
      ? `${result}.${segment}`
      : `${result}["${segment}"]`
  }, '')

  return path || ROOT_PATH
}

const isExpandable = (value: unknown) =>
  (Array.isArray(value) && value.length > 0) ||
  (isObject(value) && Object.keys(value).length > 0)

const collapsedSummary = (value: unknown) => {
  if (Array.isArray(value)) {
    const count = value.length
    return `[${count} item${count === 1 ? '' : 's'}]`
  }

  if (isObject(value)) {
    const count = Object.keys(value).length
    return `{${count} key${count === 1 ? '' : 's'}}`
  }

  return ''
}

interface JsonTreeNodeProps {
  value: unknown
  pathSegments: JsonPathSegment[]
  depth: number
  indent: number
  propertyKey?: string
  isLast: boolean
  collapsedPaths: Set<string>
  onToggle: (path: string, event: React.MouseEvent) => void
  selectedPath: string | null
  onSelectPath: (path: string, value: unknown) => void
}

const JsonTreeNode = ({
  value,
  pathSegments,
  depth,
  indent,
  propertyKey,
  isLast,
  collapsedPaths,
  onToggle,
  selectedPath,
  onSelectPath,
}: JsonTreeNodeProps) => {
  const path = formatPath(pathSegments)
  const isCollapsed = collapsedPaths.has(path)
  const paddingLeft = depth * indent

  const handleSelect = () => onSelectPath(path, value)

  const renderKeyPrefix = () => {
    if (propertyKey === undefined) {
      return null
    }

    return (
      <>
        <span className="json-tree-key">{JSON.stringify(propertyKey)}</span>
        <span className="json-tree-punctuation">: </span>
      </>
    )
  }

  const renderComma = () => (isLast ? null : <span className="json-tree-punctuation">,</span>)

  if (value === null || typeof value !== 'object') {
    return (
      <div
        className={`json-tree-line ${selectedPath === path ? 'selected' : ''}`}
        style={{ paddingLeft: `${paddingLeft}ch` }}
        onClick={handleSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleSelect()
          }
        }}
        title={path}
      >
        {renderKeyPrefix()}
        <span className="json-tree-primitive">{JSON.stringify(value)}</span>
        {renderComma()}
      </div>
    )
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <div
          className={`json-tree-line ${selectedPath === path ? 'selected' : ''}`}
          style={{ paddingLeft: `${paddingLeft}ch` }}
          onClick={handleSelect}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              handleSelect()
            }
          }}
          title={path}
        >
          {renderKeyPrefix()}
          <span className="json-tree-bracket">[]</span>
          {renderComma()}
        </div>
      )
    }

    if (isCollapsed) {
      return (
        <div
          className={`json-tree-line ${selectedPath === path ? 'selected' : ''}`}
          style={{ paddingLeft: `${paddingLeft}ch` }}
          onClick={handleSelect}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              handleSelect()
            }
          }}
          title={path}
        >
          <button
            type="button"
            className="json-tree-toggle"
            aria-label="Expand array"
            aria-expanded={false}
            onClick={(event) => onToggle(path, event)}
          >
            ▶
          </button>
          {renderKeyPrefix()}
          <span className="json-tree-collapsed">{collapsedSummary(value)}</span>
          {renderComma()}
        </div>
      )
    }

    return (
      <>
        <div
          className={`json-tree-line ${selectedPath === path ? 'selected' : ''}`}
          style={{ paddingLeft: `${paddingLeft}ch` }}
          onClick={handleSelect}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              handleSelect()
            }
          }}
          title={path}
        >
          <button
            type="button"
            className="json-tree-toggle"
            aria-label="Collapse array"
            aria-expanded
            onClick={(event) => onToggle(path, event)}
          >
            ▼
          </button>
          {renderKeyPrefix()}
          <span className="json-tree-bracket">[</span>
        </div>
        {value.map((item, index) => (
          <JsonTreeNode
            key={index}
            value={item}
            pathSegments={[...pathSegments, index]}
            depth={depth + 1}
            indent={indent}
            isLast={index === value.length - 1}
            collapsedPaths={collapsedPaths}
            onToggle={onToggle}
            selectedPath={selectedPath}
            onSelectPath={onSelectPath}
          />
        ))}
        <div
          className={`json-tree-line ${selectedPath === path ? 'selected' : ''}`}
          style={{ paddingLeft: `${paddingLeft}ch` }}
          onClick={handleSelect}
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              handleSelect()
            }
          }}
          title={path}
        >
          <span className="json-tree-bracket">]</span>
          {renderComma()}
        </div>
      </>
    )
  }

  const entries = Object.entries(value)

  if (entries.length === 0) {
    return (
      <div
        className={`json-tree-line ${selectedPath === path ? 'selected' : ''}`}
        style={{ paddingLeft: `${paddingLeft}ch` }}
        onClick={handleSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleSelect()
          }
        }}
        title={path}
      >
        {renderKeyPrefix()}
        <span className="json-tree-bracket">{'{}'}</span>
        {renderComma()}
      </div>
    )
  }

  if (isCollapsed) {
    return (
      <div
        className={`json-tree-line ${selectedPath === path ? 'selected' : ''}`}
        style={{ paddingLeft: `${paddingLeft}ch` }}
        onClick={handleSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleSelect()
          }
        }}
        title={path}
      >
        <button
          type="button"
          className="json-tree-toggle"
          aria-label="Expand object"
          aria-expanded={false}
          onClick={(event) => onToggle(path, event)}
        >
          ▶
        </button>
        {renderKeyPrefix()}
        <span className="json-tree-collapsed">{collapsedSummary(value)}</span>
        {renderComma()}
      </div>
    )
  }

  return (
    <>
      <div
        className={`json-tree-line ${selectedPath === path ? 'selected' : ''}`}
        style={{ paddingLeft: `${paddingLeft}ch` }}
        onClick={handleSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleSelect()
          }
        }}
        title={path}
      >
        <button
          type="button"
          className="json-tree-toggle"
          aria-label="Collapse object"
          aria-expanded
          onClick={(event) => onToggle(path, event)}
        >
          ▼
        </button>
        {renderKeyPrefix()}
        <span className="json-tree-bracket">{'{'}</span>
      </div>
      {entries.map(([key, childValue], index) => (
        <JsonTreeNode
          key={key}
          value={childValue}
          pathSegments={[...pathSegments, key]}
          depth={depth + 1}
          indent={indent}
          propertyKey={key}
          isLast={index === entries.length - 1}
          collapsedPaths={collapsedPaths}
          onToggle={onToggle}
          selectedPath={selectedPath}
          onSelectPath={onSelectPath}
        />
      ))}
      <div
        className={`json-tree-line ${selectedPath === path ? 'selected' : ''}`}
        style={{ paddingLeft: `${paddingLeft}ch` }}
        onClick={handleSelect}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleSelect()
          }
        }}
        title={path}
      >
        <span className="json-tree-bracket">{'}'}</span>
        {renderComma()}
      </div>
    </>
  )
}

interface JsonTreeViewProps {
  value: unknown
  indent: number
  collapsedPaths: Set<string>
  onToggle: (path: string, event: React.MouseEvent) => void
  selectedPath: string | null
  onSelectPath: (path: string, value: unknown) => void
}

const JsonTreeView = ({
  value,
  indent,
  collapsedPaths,
  onToggle,
  selectedPath,
  onSelectPath,
}: JsonTreeViewProps) => {
  if (!isExpandable(value)) {
    const path = ROOT_PATH
    return (
      <div className="json-tree-view" role="tree" aria-label="Formatted JSON output">
        <div
          className={`json-tree-line ${selectedPath === path ? 'selected' : ''}`}
          onClick={() => onSelectPath(path, value)}
          role="treeitem"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onSelectPath(path, value)
            }
          }}
          title={path}
        >
          <span className="json-tree-primitive">{JSON.stringify(value)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="json-tree-view" role="tree" aria-label="Formatted JSON output">
      <JsonTreeNode
        value={value}
        pathSegments={[]}
        depth={0}
        indent={indent}
        isLast
        collapsedPaths={collapsedPaths}
        onToggle={onToggle}
        selectedPath={selectedPath}
        onSelectPath={onSelectPath}
      />
    </div>
  )
}

export default JsonTreeView
