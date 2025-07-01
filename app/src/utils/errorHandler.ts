import { ApolloError } from '@apollo/client';

interface ValidationError {
  message: string;
  code: string;
}

/**
 * Extracts multiple validation errors from GraphQL error for individual localization
 */
export function extractValidationErrors(error: ApolloError): ValidationError[] {
  if (!error.graphQLErrors || error.graphQLErrors.length === 0) {
    return [{ message: error.message, code: 'GRAPHQL_VALIDATION_FAILED' }];
  }

  const errors: ValidationError[] = [];

  error.graphQLErrors.forEach(gqlError => {
    // Check if this error has multiple validation errors in extensions
    if (gqlError.extensions?.validationErrors) {
      const validationErrors = gqlError.extensions.validationErrors as ValidationError[];
      errors.push(...validationErrors);
    } else {
      // Single error
      errors.push({
        message: gqlError.message,
        code: gqlError.extensions?.code || 'GRAPHQL_VALIDATION_FAILED'
      });
    }
  });

  return errors;
}

/**
 * Gets localized error messages for multiple validation errors
 */
export function getLocalizedErrors(
  errors: ValidationError[], 
  t: (key: string) => string,
  section: string = 'Sign_up'
): string[] {
  return errors.map(error => {
    const errorKey = `${section}.error.${error.code}`;
    const localizedMessage = t(errorKey);
    
    // If no localization found, use the original message
    if (localizedMessage === errorKey) {
      return error.message;
    }
    
    return localizedMessage;
  });
}

 