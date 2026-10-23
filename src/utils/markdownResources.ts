// Attributes that make the browser fetch a URL as soon as the element is rendered. srcset is
// always dropped (src is enough), the others are kept only when they hold inline data.
export const AUTO_FETCH_ATTRIBUTES = ['src', 'poster', 'background'] as const

// Only inline data: URLs can be embedded. Anything else, absolute, protocol-relative or
// relative, would make the browser request it from a server when the preview renders.
// Browsers strip only ASCII whitespace before the scheme, so nothing else is allowed there.
export const isEmbeddableUrl = (value: string): boolean => /^[\t\n\f\r ]*data:/i.test(value)
