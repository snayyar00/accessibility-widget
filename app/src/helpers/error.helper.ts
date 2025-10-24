export function getErrorMessage(
  err: unknown,
  fallback = 'Something went wrong',
): string {
  if (!err) return fallback;
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return fallback;
  }
}

export default getErrorMessage;
