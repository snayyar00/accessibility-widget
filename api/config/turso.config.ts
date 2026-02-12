import { Client, createClient } from '@libsql/client'

let tursoClientInstance: Client | null = null

// Verify environment variables are available at module load
// This check runs when the module is first imported
if (typeof process !== 'undefined' && process.env) {
  const hasUrl = !!process.env.TURSO_DATABASE_URL
  const hasToken = !!process.env.TURSO_AUTH_TOKEN
  if (!hasUrl || !hasToken) {
    console.warn('[TursoConfig] ⚠️  WARNING: TURSO environment variables not found at module load time.')
    console.warn('[TursoConfig] Make sure your .env file contains TURSO_DATABASE_URL and TURSO_AUTH_TOKEN')
    console.warn('[TursoConfig] If you just added them, RESTART YOUR SERVER to load them.')
    console.warn('[TursoConfig] Current env keys with TURSO:', Object.keys(process.env).filter(k => k.includes('TURSO')))
  } else {
    console.log('[TursoConfig] ✅ TURSO environment variables found at module load time.')
  }
}

function getTursoClient(): Client {
  if (!tursoClientInstance) {
    const tursoUrl = process.env.TURSO_DATABASE_URL
    const tursoAuthToken = process.env.TURSO_AUTH_TOKEN

    // Debug: Log all environment variables that start with TURSO
    const tursoEnvVars = Object.keys(process.env).filter(key => key.startsWith('TURSO'))
    console.log('[TursoConfig] Available TURSO environment variables:', tursoEnvVars)
    console.log('[TursoConfig] TURSO_DATABASE_URL exists:', !!tursoUrl)
    console.log('[TursoConfig] TURSO_AUTH_TOKEN exists:', !!tursoAuthToken)

    if (!tursoUrl || !tursoAuthToken) {
      const error = new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set in environment variables')
      console.error('[TursoConfig] Missing environment variables:', {
        hasUrl: !!tursoUrl,
        hasToken: !!tursoAuthToken,
        allEnvKeys: Object.keys(process.env).filter(key => key.includes('TURSO') || key.includes('DATABASE')),
      })
      throw error
    }

    try {
      console.log('[TursoConfig] Creating Turso client...')
      tursoClientInstance = createClient({
        url: tursoUrl,
        authToken: tursoAuthToken,
      })
      console.log('[TursoConfig] Turso client created successfully')
    } catch (error) {
      console.error('[TursoConfig] Error creating Turso client:', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      throw error
    }
  }

  return tursoClientInstance
}

export const tursoClient = new Proxy({} as Client, {
  get(_target, prop) {
    const client = getTursoClient()
    const value = (client as any)[prop]
    return typeof value === 'function' ? value.bind(client) : value
  },
})
