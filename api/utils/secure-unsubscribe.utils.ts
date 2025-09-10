import jwt from 'jsonwebtoken'

// Unsubscribe token payload
type UnsubscribeTokenPayload = {
  email: string
  type: 'monthly' | 'domain' | 'monitoring' | 'onboarding' | 'issue_reports'
  userId: number
  iat?: number
  exp?: number
}

/**
 * Generate a secure unsubscribe link with JWT token
 * @param email User's email address
 * @param type Type of unsubscribe (monthly, domain, monitoring, onboarding, issue_reports)
 * @param userId User's ID for additional security
 * @returns Complete unsubscribe URL with secure token
 */
export function generateSecureUnsubscribeLink(email: string, type: 'monthly' | 'domain' | 'monitoring' | 'onboarding' | 'issue_reports', userId: number): string {
  const payload: UnsubscribeTokenPayload = {
    email,
    type,
    userId,
  }

  // Create JWT token that expires in 30 days
  const token = jwt.sign(payload, process.env.JWT_SECRET as string, {
    expiresIn: '30d',
    issuer: process.env.JWT_ISSUER,
    subject: 'unsubscribe',
  })

  return `${process.env.REACT_APP_BACKEND_URL}/secure-unsubscribe?token=${token}`
}

/**
 * Verify and decode unsubscribe token
 * @param token JWT token from unsubscribe link
 * @returns Decoded payload if valid, null if invalid/expired
 */
export function verifyUnsubscribeToken(token: string): UnsubscribeTokenPayload | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string, {
      issuer: process.env.JWT_ISSUER,
      subject: 'unsubscribe',
    }) as UnsubscribeTokenPayload

    return decoded
  } catch (error) {
    console.error('Invalid unsubscribe token:', error)
    return null
  }
}

/**
 * Get unsubscribe type for email templates
 * @param emailType The type of email being sent
 * @returns Corresponding unsubscribe type
 */
export function getUnsubscribeTypeForEmail(emailType: 'monthly' | 'domain' | 'monitoring' | 'onboarding' | 'issue_reports'): 'monthly' | 'domain' | 'monitoring' | 'onboarding' | 'issue_reports' {
  return emailType
}
