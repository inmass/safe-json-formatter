import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { AUTO_FETCH_ATTRIBUTES, isEmbeddableUrl } from './markdownResources'

// Markdown may contain raw HTML, so the rendered output is always sanitized before it
// reaches the page. <style> and style="" are dropped so a document cannot restyle the app.
const SANITIZE_OPTIONS = {
  USE_PROFILE: { html: true },
  FORBID_TAGS: ['style', 'form', 'button', 'textarea', 'select'],
  FORBID_ATTR: ['style'],
}

const BLOCKED_IMAGE_ATTR = 'data-blocked-src'

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  // Links open in a new tab without handing the opener or a referrer to the target page.
  if (node.tagName === 'A' && node.getAttribute('href') && !node.getAttribute('href')?.startsWith('#')) {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }

  // Remote images and media would load as soon as the preview renders and tell whoever hosts
  // them that the document was opened, so only inline data: URLs are kept. The CSP blocks
  // them too; this keeps the guarantee even if the CSP is ever loosened.
  node.removeAttribute('srcset')
  for (const attr of AUTO_FETCH_ATTRIBUTES) {
    const value = node.getAttribute(attr)
    if (value !== null && !isEmbeddableUrl(value)) {
      node.removeAttribute(attr)
      if (node.tagName === 'IMG') {
        node.setAttribute(BLOCKED_IMAGE_ATTR, '')
      }
    }
  }
})

// Swaps each blocked image for a visible note so a missing picture is not mistaken for a bug.
const replaceBlockedImages = (html: string): string => {
  const template = document.createElement('template')
  template.innerHTML = html
  template.content.querySelectorAll(`img[${BLOCKED_IMAGE_ATTR}]`).forEach((img) => {
    const alt = img.getAttribute('alt')
    const placeholder = document.createElement('span')
    placeholder.className = 'markdown-blocked-image'
    placeholder.title = 'Remote images are not loaded, so reading a document never contacts another server'
    placeholder.textContent = alt ? `🖼️ Remote image not loaded: ${alt}` : '🖼️ Remote image not loaded'
    img.replaceWith(placeholder)
  })
  return template.innerHTML
}

export const renderMarkdown = (text: string): string => {
  const html = marked.parse(text, { async: false, gfm: true })
  return replaceBlockedImages(DOMPurify.sanitize(html, SANITIZE_OPTIONS))
}
