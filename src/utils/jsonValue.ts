export const serializeValueForClipboard = (value: unknown, indent: number): string => {
  if (typeof value === 'string') {
    return value
  }

  if (value === null || typeof value === 'number' || typeof value === 'boolean') {
    return JSON.stringify(value)
  }

  return JSON.stringify(value, null, indent)
}
