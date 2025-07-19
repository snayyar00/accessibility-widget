import dotenv from 'dotenv';

import './config/logger.config';

import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';

import { configureServer, PORT } from './config/server.config';
import { dynamicCors } from './middlewares/cors.middleware';
import { strictLimiter } from './middlewares/limiters.middleware';
import { configureMorgan } from './middlewares/morgan.middleware';
import { requestTimingMiddleware } from './middlewares/requestTiming.middleware';
import { expressErrorMiddleware } from './middlewares/expressError.middleware';
import { graphqlErrorMiddleware } from './middlewares/graphqlError.middleware';
import { createGraphQLServer } from './config/graphql.config';
import { initializeSentry } from './config/sentry.config';

// Import routes
import routes from './routes';

// Import services and hooks
import stripeHooks from './services/stripe/webhooks.servive';
import scheduleMonthlyEmails from './jobs/monthlyEmail';

dotenv.config();

const app = express();

// Configure server settings
configureServer(app);

// Initialize scheduled jobs
scheduleMonthlyEmails();

// Set up basic middleware
app.use(configureMorgan());
app.use(requestTimingMiddleware);

// Stripe webhook endpoint (before CORS and JSON parsing)
app.post('/stripe-hooks', strictLimiter, express.raw({ type: 'application/json' }), stripeHooks);

app.use(dynamicCors);
app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true, limit: '5mb' }));
app.use(express.json({ limit: '5mb' }));

// Basic health check endpoint
app.get('/', (_, res) => {
  res.send('Hello world!');
});

// Mount all API routes
app.use(routes);

// Express error logging middleware
app.use(expressErrorMiddleware);

// Set up GraphQL
const serverGraph = createGraphQLServer();

// GraphQL timeout configuration (before Apollo middleware)
app.use('/graphql', (req, res, next) => {
  const {body} = req;
  let timeout = 70000; // Default 70 seconds

  // Check if this is the accessibility report query
  if (body && body.query && body.query.includes('getAccessibilityReport')) {
    timeout = 120000; // 2 minutes for accessibility report
  }

  req.setTimeout(timeout);
  res.setTimeout(timeout);
  next();
});

// Add GraphQL error logging middleware
app.use('/graphql', graphqlErrorMiddleware);

// Apply Apollo middleware (no duplicate JSON parser needed)
serverGraph.applyMiddleware({ app, cors: false });

// Initialize Sentry
const serverName = process.env.COOLIFY_URL || `http://localhost:${PORT}`;
initializeSentry(serverName);

// Start the server
app.listen(PORT, () => {
  console.log(`App listening at http://localhost:${PORT}`);
});
