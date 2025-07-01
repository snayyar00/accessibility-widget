import { ApolloError } from 'apollo-server-express';

/**
 * Validation error codes for frontend localization
 */
export enum ValidationErrorCode {
  EMAIL_CONTAINS_PLUS = 'EMAIL_CONTAINS_PLUS',
  NAME_CONTAINS_LINKS = 'NAME_CONTAINS_LINKS', 
  NAME_CONTAINS_MALICIOUS_CONTENT = 'NAME_CONTAINS_MALICIOUS_CONTENT',
  EMAIL_AND_NAME_INVALID = 'EMAIL_AND_NAME_INVALID',
  GRAPHQL_VALIDATION_FAILED = 'GRAPHQL_VALIDATION_FAILED'
}

/**
 * Creates a localized validation error with specific code
 */
export function createValidationError(code: ValidationErrorCode, message?: string): ApolloError {
  return new ApolloError(
    message || 'Validation failed',
    code
  );
}

/**
 * Creates a validation error with multiple error details for individual localization
 */
export function createMultipleValidationErrors(errors: string[]): ApolloError {
  if (!errors || errors.length === 0) {
    return new ApolloError('Validation failed', ValidationErrorCode.GRAPHQL_VALIDATION_FAILED);
  }

  // Map each error to its specific code and create error details
  const errorDetails = errors.map(error => {
    let code = ValidationErrorCode.GRAPHQL_VALIDATION_FAILED;
    
    // Map specific error messages to error codes
    if (error.includes('Email addresses with + symbol are not allowed')) {
      code = ValidationErrorCode.EMAIL_CONTAINS_PLUS;
    } else if (error.includes('Name contains invalid characters or links')) {
      if (error.toLowerCase().includes('link')) {
        code = ValidationErrorCode.NAME_CONTAINS_LINKS;
      } else {
        code = ValidationErrorCode.NAME_CONTAINS_MALICIOUS_CONTENT;
      }
    } else if (error.toLowerCase().includes('email') && error.toLowerCase().includes('required')) {
      code = ValidationErrorCode.GRAPHQL_VALIDATION_FAILED;
    } else if (error.toLowerCase().includes('password')) {
      code = ValidationErrorCode.GRAPHQL_VALIDATION_FAILED;
    }

    return { message: error, code };
  });

  // Create a single ApolloError with multiple error details in extensions
  return new ApolloError(
    'Multiple validation errors',
    ValidationErrorCode.GRAPHQL_VALIDATION_FAILED,
    {
      validationErrors: errorDetails
    }
  );
}

/**
 * Analyzes validation errors and returns appropriate error code
 */
export function getValidationErrorCode(errors: string[]): ValidationErrorCode {
  if (!errors || errors.length === 0) {
    return ValidationErrorCode.GRAPHQL_VALIDATION_FAILED;
  }

  // Categorize different types of validation errors
  const errorCategories = {
    emailPlus: errors.some(error => 
      error.includes('Email addresses with + symbol are not allowed')
    ),
    nameLinks: errors.some(error => 
      error.includes('Name contains invalid characters or links')
    ),
    emailFormat: errors.some(error => 
      error.toLowerCase().includes('email') && 
      (error.toLowerCase().includes('invalid') || error.toLowerCase().includes('required'))
    ),
    passwordWeak: errors.some(error => 
      error.toLowerCase().includes('password') && 
      (error.toLowerCase().includes('weak') || error.toLowerCase().includes('characters'))
    ),
    nameRequired: errors.some(error => 
      error.toLowerCase().includes('name') && error.toLowerCase().includes('required')
    ),
    urlInvalid: errors.some(error => 
      error.toLowerCase().includes('url') || error.toLowerCase().includes('domain')
    )
  };

  // Count how many different categories of errors we have
  const activeCategories = Object.values(errorCategories).filter(Boolean).length;
  
  // If multiple different types of validation errors, use generic code
  if (activeCategories > 1) {
    return ValidationErrorCode.GRAPHQL_VALIDATION_FAILED;
  }
  
  // Single category errors - return specific codes
  if (errorCategories.emailPlus) {
    return ValidationErrorCode.EMAIL_CONTAINS_PLUS;
  }
  
  if (errorCategories.nameLinks) {
    // Check if it's specifically about links vs general malicious content
    if (errors.some(error => error.toLowerCase().includes('link'))) {
      return ValidationErrorCode.NAME_CONTAINS_LINKS;
    } else {
      return ValidationErrorCode.NAME_CONTAINS_MALICIOUS_CONTENT;
    }
  }
  
  // Default fallback for unrecognized errors
  return ValidationErrorCode.GRAPHQL_VALIDATION_FAILED;
} 