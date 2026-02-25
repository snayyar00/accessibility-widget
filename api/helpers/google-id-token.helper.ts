import { OAuth2Client } from 'google-auth-library'

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_KEY)

export type GoogleTokenPayload = {
  sub: string
  email: string
  email_verified: boolean
  name?: string
  picture?: string
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleTokenPayload | null> {
  const audience = process.env.GOOGLE_CLIENT_KEY
  if (!audience) return null
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience,
    })
    const payload = ticket.getPayload()
    if (!payload?.sub || !payload?.email) return null
    
    // Require email to be verified for security
    if (!payload.email_verified) {
      return null
    }
    
    return {
      sub: payload.sub,
      email: payload.email,
      email_verified: true,
      name: payload.name ?? undefined,
      picture: payload.picture ?? undefined,
    }
  } catch {
    return null
  }
}
