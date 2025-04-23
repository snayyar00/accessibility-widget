// Import Sentry modules
const Sentry = require("@sentry/node");

// Initialize Sentry with minimal configuration
Sentry.init({
  dsn: "https://f1d3084fe80862fcaf4b161eab592b3d@o4504556023971840.ingest.us.sentry.io/4509194515120128",
  
  // Sample rate for performance monitoring
  tracesSampleRate: 0.5
});

// Export the Sentry instance
module.exports = Sentry; 