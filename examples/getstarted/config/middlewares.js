'use strict';

const responseHandlers = require('./src/response-handlers');

module.exports = [
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        directives: {
          // 'script-src': ["'self'", "'unsafe-inline'", 'cdn.jsdelivr.net'],
          'script-src': ["'self'", "'unsafe-inline'", 'https://posho-penteract-test-screenshot-bucket.s3.eu-west-3.amazonaws.com', 'https://cdn.jsdelivr.net', 'https://cdn.socket.io', 'http://localhost:3000', 'http://localhost:5173'],
          // 'script-src-elem': ["'self'", "'unsafe-inline'", "https://posho-penteract-test-screenshot-bucket.s3.eu-west-3.amazonaws.com', 'https://posho-penteract-test-screenshot-bucket.s3.eu-west-3.amazonaws.com"],
          'connect-src': ["'self'", 'http:', 'http://localhost:3000', 'http://localhost:5173', 'ws://localhost:3000'],
          'img-src': ["'self'", 'data:', 'cdn.jsdelivr.net', 'strapi.io',],
          'frame-src': ["'self'", 'http://localhost:3000', 'http://localhost:5173'],
        },
      }
    },
  },
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  // 'strapi::compression',
  // 'strapi::ip',
  {
    name: 'strapi::responses',
    config: {
      handlers: responseHandlers,
    },
  },
  'strapi::favicon',
  'strapi::public',
  {
    name: 'global::test-middleware',
    config: {
      foo: 'bar',
    },
  },
  {
    resolve: './src/custom/middleware.js',
    config: {},
  },
];
