
export function normalizeEmail(text: string): string {
  return text.toLowerCase().trim();
}

export async function stringToSlug(str: string): Promise<string> {
  const { default: slug } = await import('slug');
  return slug(str);
}


export function objectToString(value: any): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === '' || value === null) return null;
  if (typeof value === 'string') throw new Error('objectToString: non-empty string is not allowed, except empty string');
  if (typeof value === 'object') return JSON.stringify(value);
  
  return null;
}