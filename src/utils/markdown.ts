import { marked } from 'marked'
import DOMPurify from 'dompurify'

// Markdown may contain raw HTML, so the rendered output is always sanitized before it
// reaches the page. <style> and style="" are dropped so a document cannot restyle the app.
const SANITIZE_OPTIONS = {
  USE_PROFILE: { html: true },
  FORBID_TAGS: ['style', 'form', 'button', 'textarea', 'select'],
  FORBID_ATTR: ['style'],
}

// Links open in a new tab without handing the opener or a referrer to the target page.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.getAttribute('href') && !node.getAttribute('href')?.startsWith('#')) {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

export const renderMarkdown = (text: string): string => {
  const html = marked.parse(text, { async: false, gfm: true })
  return DOMPurify.sanitize(html, SANITIZE_OPTIONS)
}
