import dotenv from 'dotenv'

dotenv.config()

import './config/logger.config'

import { expressMiddleware } from '@as-integrations/express4'
import bodyParser, { json } from 'body-parser'
import cookieParser from 'cookie-parser'
import express from 'express'

import { createGraphQLContext, createGraphQLServer } from './config/graphql.config'
import { initializeSentry } from './config/sentry.config'
import { configureServer, PORT } from './config/server.config'
import scheduleMonthlyEmails from './jobs/monthlyEmail'
import { dynamicCors } from './middlewares/cors.middleware'
import { expressErrorMiddleware } from './middlewares/expressError.middleware'
import { graphqlErrorMiddleware } from './middlewares/graphqlError.middleware'
import { strictLimiter } from './middlewares/limiters.middleware'
import { configureMorgan } from './middlewares/morgan.middleware'
import { requestTimingMiddleware } from './middlewares/requestTiming.middleware'
import routes from './routes'
import stripeHooks from './services/stripe/webhooks.servive'

const app = express()

configureServer(app)
scheduleMonthlyEmails()

app.use(configureMorgan())
app.use(requestTimingMiddleware)

// Stripe webhook endpoint (before CORS and JSON parsing)
app.post('/stripe-hooks', strictLimiter, express.raw({ type: 'application/json' }), stripeHooks)

app.use(dynamicCors)
app.use(cookieParser())
app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }))
app.use(express.json({ limit: '5mb' }))

app.get('/', (_, res) => {
  res.send('Hello world!')
})

app.use(routes)
app.use(expressErrorMiddleware)

// Apollo Server 5 setup
const serverGraph = createGraphQLServer()

async function initializeServer() {
  await serverGraph.start()

  // Timeout middleware for long-running accessibility reports
  app.use('/graphql', (req, res, next) => {
    const { body } = req
    let timeout = 70000

    if (body && body.query && body.query.includes('getAccessibilityReport')) {
      timeout = 120000 // 2 minutes for accessibility report
    }

    req.setTimeout(timeout)
    res.setTimeout(timeout)

    next()
  })

  app.use('/graphql', graphqlErrorMiddleware)

  app.use(
    '/graphql',
    json({ limit: '50mb' }),
    expressMiddleware(serverGraph, {
      context: createGraphQLContext,
    }),
  )

  initializeSentry(process.env.COOLIFY_URL || `http://localhost:${PORT}`)

  app.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}`)
  })
}

initializeServer().catch((error) => {
  console.error('Failed to start server:', error)
  process.exit(1)
})
