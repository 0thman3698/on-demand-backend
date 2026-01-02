// Import with `const Sentry = require("@sentry/nestjs");` if you are using CJS
import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: 'https://02741a0a4cc6681872b685500d6add1e@o4510622995316736.ingest.de.sentry.io/4510623147688016',

  // Send structured logs to Sentry
  enableLogs: true,
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});
