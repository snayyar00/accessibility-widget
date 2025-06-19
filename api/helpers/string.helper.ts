import slug from 'slug'

export function normalizeEmail(text: string): string {
  return text.toLowerCase().trim();
}

export function stringToSlug(str: string): string {
  return slug(str);
}


export function objectToString(value: any): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === '' || value === null) return null;
  if (typeof value === 'string') throw new Error('objectToString: non-empty string is not allowed, except empty string');
  if (typeof value === 'object') return JSON.stringify(value);
  
  return null;
}