import helmet from 'helmet';

/**
 * Security headers for the existing browser application.
 * CSP remains disabled for now because the current UI uses inline scripts and
 * CDN-hosted Tailwind; it should be enabled after the frontend is bundled.
 */
export const securityMiddleware = helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
});
