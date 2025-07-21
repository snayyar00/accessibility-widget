import dotenv from 'dotenv'

dotenv.config({ quiet: true })

import './utils/logger'

import { expressMiddleware } from '@as-integrations/express5'
import bodyParser, { json } from 'body-parser'
import cookieParser from 'cookie-parser'
import express from 'express'
import { createServer } from 'http'

import { initializeSentry } from './config/sentry.config'
import { ALLOWED_OPERATIONS, ALLOWED_ORIGINS, configureServer, PORT } from './config/server.config'
import { createGraphQLContext } from './graphql/context'
import { createGraphQLServer } from './graphql/server'
import scheduleMonthlyEmails from './jobs/monthlyEmail'
import { dynamicCors } from './middlewares/cors.middleware'
import { expressErrorMiddleware } from './middlewares/expressError.middleware'
import { graphqlTimeoutMiddleware } from './middlewares/graphqlTimeout.middleware'
import { strictLimiter } from './middlewares/limiters.middleware'
import { configureMorgan } from './middlewares/morgan.middleware'
import { requestTimingMiddleware } from './middlewares/requestTiming.middleware'
import routes from './routes'
import stripeHooks from './services/stripe/webhooks.servive'

const apiUrl = process.env.COOLIFY_URL || `http://localhost:${PORT}`

const app = express()
const httpServer = createServer(app)

configureServer(app)
scheduleMonthlyEmails()

app.use(configureMorgan())
app.use(requestTimingMiddleware)

// Stripe webhook endpoint (before CORS and JSON parsing)
app.post('/stripe-hooks', strictLimiter, express.raw({ type: 'application/json' }), stripeHooks)

app.use(dynamicCors)
app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }))
app.use(express.json({ limit: '50mb' }))

app.get('/', (_, res) => {
  res.send('Hello world!')
})

app.use(routes)
app.use(expressErrorMiddleware)

const serverGraph = createGraphQLServer(httpServer)

async function initializeServer() {
  await serverGraph.start()

  app.use('/graphql', graphqlTimeoutMiddleware)

  app.use(
    '/graphql',
    json({ limit: '50mb' }),
    expressMiddleware(serverGraph, {
      context: createGraphQLContext,
    }),
  )

  initializeSentry(apiUrl)

  httpServer.listen(PORT, () => {
    console.log()

    console.log(`🛠️  NODE_ENV: ${process.env.NODE_ENV}`)
    console.log(`🚀 Server Ready: ${apiUrl}`)
    console.log('🧩 Playground:', `${apiUrl}/graphql`)

    console.log()

    console.log('🌐 Allowed Origins:')
    ALLOWED_ORIGINS.forEach((origin) => {
      console.log(`   - ${origin}`)
    })

    console.log()

    console.log('📝 Allowed Operations:')
    ALLOWED_OPERATIONS.forEach((op) => {
      console.log(`   - ${op}`)
    })

    console.log()
  })
}

initializeServer().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})

process.on('SIGINT', async () => {
  console.info('Received SIGINT, shutting down gracefully...')

  await serverGraph.stop()

  httpServer.close(() => {
    console.info('Server closed')
    process.exit(0)
  })
})

process.on('SIGTERM', async () => {
  console.info('Received SIGTERM, shutting down gracefully...')

  await serverGraph.stop()

  httpServer.close(() => {
    console.info('Server closed')
    process.exit(0)
  })
})
