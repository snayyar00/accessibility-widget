export function getErrorMessage(
  err: unknown,
  fallback = 'Something went wrong',
): string {
  if (!err) return fallback;
  if (err instanceof Error) return err.message || fallback;
  if (typeof err === 'string') return err;
  
  // Handle Apollo/GraphQL errors
  if (err && typeof err === 'object' && 'graphQLErrors' in err) {
    const graphQLErrors = (err as any).graphQLErrors;
    if (Array.isArray(graphQLErrors) && graphQLErrors.length > 0) {
      return graphQLErrors[0].message || fallback;
    }
  }
  
  // Handle network errors
  if (err && typeof err === 'object' && 'networkError' in err) {
    const networkError = (err as any).networkError;
    if (networkError?.message) {
      return networkError.message;
    }
  }
  
  try {
    return JSON.stringify(err);
  } catch {
    return fallback;
  }
}

export default getErrorMessage;
