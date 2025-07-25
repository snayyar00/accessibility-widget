import LinkifyIt from 'linkify-it'
import xss from 'xss'

const linkify = new LinkifyIt()

/**
 * Sanitizes input to prevent XSS attacks
 * @param input - The input string to sanitize
 * @returns Sanitized string with HTML tags removed
 */
export function sanitizeInput(input: string): string {
  if (!input || typeof input !== 'string') {
    return ''
  }

  return xss(input, {
    whiteList: {}, // No HTML tags allowed
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script'],
  })
}

/**
 * Checks if a string contains links (URLs) - used for name validation
 * @param text - The text to check for links
 * @returns true if no links found, false if links are detected
 */
export function validateNoLinks(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return true
  }

  // Check for URLs using linkify-it
  const matches = linkify.match(text)
  if (matches && matches.length > 0) {
    return false // Contains links - not allowed
  }

  return true
}

/**
 * Checks for malicious patterns in text input
 * @param text - The text to check
 * @returns true if no malicious patterns found, false otherwise
 */
export function validateNoMaliciousPatterns(text: string): boolean {
  if (!text || typeof text !== 'string') {
    return true
  }

  // Patterns to detect malicious content
  const maliciousPatterns = [
    /javascript:/gi,
    /vbscript:/gi,
    /data:text\/html/gi,
    /<script[^>]*>/gi,
    /on\w+\s*=/gi, // onload, onclick, etc.
    /\b(select|insert|update|delete|drop|create|alter|exec|execute)\b/gi,
    /\bunion\b[\s\S]*?\bselect\b/gi,
    /\bor\s+\d+\s*=\s*\d+/gi,
    /--|\/\*|\*\//g,
  ]

  // Check for malicious patterns
  for (const pattern of maliciousPatterns) {
    if (pattern.test(text)) {
      return false
    }
  }

  return true
}

/**
 * Comprehensive validation for name fields
 * @param name - The name to validate
 * @returns true if valid, false if contains links or malicious content
 */
export function validateNameField(name: string): boolean {
  return validateNoLinks(name) && validateNoMaliciousPatterns(name)
}

/**
 * Validates that email does not contain + symbol (reject + aliasing completely)
 * @param email - The email to validate
 * @returns true if valid (no + symbol), false if contains +
 */
export function validateEmailNotAlias(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }

  // Simply reject any email containing + symbol
  return !email.includes('+')
}

/**
 * Sanitizes and validates user input for registration/profile updates
 * @param data - Object containing user input fields
 * @returns Sanitized data object
 */
export function sanitizeUserInput(data: { name?: string; email?: string; company?: string; position?: string; [key: string]: any }) {
  const sanitized: any = { ...data }

  // Sanitize text fields
  if (sanitized.name) {
    sanitized.name = sanitizeInput(sanitized.name)
  }
  if (sanitized.email) {
    sanitized.email = sanitizeInput(sanitized.email)
  }
  if (sanitized.company) {
    sanitized.company = sanitizeInput(sanitized.company)
  }
  if (sanitized.position) {
    sanitized.position = sanitizeInput(sanitized.position)
  }

  return sanitized
}
