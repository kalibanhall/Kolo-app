const Sentry = require("@sentry/node");
const { ProfilingIntegration } = require("@sentry/profiling-node");

const initSentry = (app) => {
  if (process.env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      integrations: [
        // Enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // Enable Express.js middleware tracing
        new Sentry.Integrations.Express({ app }),
        // Enable Profiling
        new ProfilingIntegration(),
      ],
      // Performance Monitoring
      tracesSampleRate: 1.0, // Capture 100% of transactions in production (adjust as needed)
      // Profiling
      profilesSampleRate: 1.0, // Profile 100% of transactions
    });

    // RequestHandler creates a separate execution context using domains
    app.use(Sentry.Handlers.requestHandler());
    // TracingHandler creates a trace for every incoming request
    app.use(Sentry.Handlers.tracingHandler());

    console.log('✅ Sentry initialized');
  } else {
    console.log('⚠️  Sentry not initialized (development mode or missing DSN)');
  }
};

const sentryErrorHandler = () => {
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all errors
      return true;
    },
  });
};

const captureException = (error, context = {}) => {
  Sentry.captureException(error, {
    extra: context
  });
};

const captureMessage = (message, level = 'info', context = {}) => {
  Sentry.captureMessage(message, {
    level,
    extra: context
  });
};

// Custom event tracking
const trackEvent = (eventName, data = {}) => {
  Sentry.addBreadcrumb({
    category: 'custom',
    message: eventName,
    level: 'info',
    data
  });
};

// Track ticket purchase
const trackTicketPurchase = (userId, ticketCount, amount) => {
  trackEvent('ticket_purchase', {
    userId,
    ticketCount,
    amount,
    timestamp: new Date().toISOString()
  });
};

// Track user registration
const trackUserRegistration = (userId, email) => {
  trackEvent('user_registration', {
    userId,
    email,
    timestamp: new Date().toISOString()
  });
};

// Track lottery draw
const trackLotteryDraw = (campaignId, winnerId) => {
  trackEvent('lottery_draw', {
    campaignId,
    winnerId,
    timestamp: new Date().toISOString()
  });
};

module.exports = {
  initSentry,
  sentryErrorHandler,
  captureException,
  captureMessage,
  trackEvent,
  trackTicketPurchase,
  trackUserRegistration,
  trackLotteryDraw
};
