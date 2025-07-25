// eslint-disable-next-line @typescript-eslint/no-require-imports
const slugify = require('slugify')

export function normalizeEmail(text: string): string {
  return text.toLowerCase().trim()
}

export function stringToSlug(str: string): string {
  return slugify(str, {
    lower: true,
    strict: true,
  })
}

export function objectToString(value: any): string | null | undefined {
  if (value === undefined) return undefined
  if (value === '' || value === null) return null
  if (typeof value === 'string') throw new Error('objectToString: non-empty string is not allowed, except empty string')
  if (typeof value === 'object') return JSON.stringify(value)

  return null
}
