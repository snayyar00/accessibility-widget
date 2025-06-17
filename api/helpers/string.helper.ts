import slug from 'slug'

export function normalizeEmail(text: string): string {
  return text.toLowerCase().trim();
}

export function stringToSlug(str: string): string {
  return slug(str);
}
