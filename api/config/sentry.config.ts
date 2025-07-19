import { init } from '@sentry/node';
import * as Sentry from '@sentry/node';

export function initializeSentry(serverName: string) {
  init({
    dsn: process.env.SENTRY_DSN,
    serverName: serverName,
    tracesSampleRate: 1.0,
    integrations: [
      // Enable HTTP calls tracing
      new Sentry.Integrations.Http({ tracing: true }),
    ],
    attachStacktrace: true,
  });
}
