const rateLimit = require('express-rate-limit');

const bookingRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute window
  max: 10, // Limit each IP to 10 requests per minute
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    success: false,
    message: 'Too many booking attempts from this IP. Please try again after 1 minute.'
  }
});

module.exports = { bookingRateLimiter };
