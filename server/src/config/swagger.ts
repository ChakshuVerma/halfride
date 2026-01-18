import type { OpenAPIV3 } from '../types/openapi';

export const openApiSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'HalfRide Server API',
    version: '1.0.0',
    description:
      'Express API. Username/password auth is handled by the backend (access + refresh tokens in HttpOnly cookies). Firebase is used only for phone OTP verification during signup.',
  },
  servers: [{ url: 'http://localhost:3000' }],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'access_token',
        description: 'Backend-issued access token stored in HttpOnly cookie',
      },
    },
  },
  tags: [{ name: 'Health' }, { name: 'User' }, { name: 'Public' }],
  paths: {
    '/api/auth/signup/complete': {
      post: {
        tags: ['User'],
        summary: 'Signup: verify Firebase phone OTP token + create username/password account + set auth cookies',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                required: ['firebaseIdToken', 'username', 'password', 'DOB', 'FirstName', 'LastName', 'isFemale'],
                properties: {
                  firebaseIdToken: { type: 'string' },
                  username: { type: 'string' },
                  password: { type: 'string' },
                  DOB: { type: 'string' },
                  FirstName: { type: 'string' },
                  LastName: { type: 'string' },
                  isFemale: { type: 'boolean' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Created + cookies set' },
          '400': { description: 'Invalid body' },
          '401': { description: 'Invalid Firebase token' },
          '409': { description: 'Username already taken / user exists' },
          '500': { description: 'Server config error' },
        },
      },
    },
    '/api/auth/login': {
      post: {
        tags: ['User'],
        summary: 'Login with username/password (sets cookies)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                required: ['username', 'password'],
                properties: {
                  username: { type: 'string' },
                  password: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Logged in + cookies set' },
          '400': { description: 'Invalid body' },
          '401': { description: 'Invalid credentials' },
          '500': { description: 'Server config error' },
        },
      },
    },
    '/api/auth/refresh': {
      post: {
        tags: ['User'],
        summary: 'Refresh tokens (rotates refresh cookie, sets new access cookie)',
        responses: {
          '200': { description: 'Refreshed' },
          '401': { description: 'Invalid/expired refresh token' },
          '500': { description: 'Server config error' },
        },
      },
    },
    '/api/auth/forgot-password/complete': {
      post: {
        tags: ['User'],
        summary: 'Forgot password: verify phone OTP (Firebase token) and set new password',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                required: ['firebaseIdToken', 'username', 'newPassword'],
                properties: {
                  firebaseIdToken: { type: 'string' },
                  username: { type: 'string' },
                  newPassword: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Password updated (cookies cleared)' },
          '400': { description: 'Invalid body' },
          '401': { description: 'Invalid verification' },
          '500': { description: 'Server config error' },
        },
      },
    },
    '/api/auth/logout': {
      post: {
        tags: ['User'],
        summary: 'Logout (clears cookies)',
        responses: {
          '200': { description: 'Logged out' },
        },
      },
    },
    '/api/auth/me': {
      get: {
        tags: ['User'],
        summary: 'Get current session user (from access cookie)',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': { description: 'Session user' },
          '401': { description: 'Unauthorized' },
          '500': { description: 'Server config error' },
        },
      },
    },
    '/api/health': {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        responses: {
          '200': {
            description: 'Service is up',
            content: {
              'application/json': {
                example: {
                  status: 'ok',
                  message: 'Server is running',
                  timestamp: '2026-01-18T00:00:00.000Z',
                },
              },
            },
          },
        },
      },
    },
    '/api/user/profile': {
      get: {
        tags: ['User'],
        summary: 'Get authenticated user profile (from Firestore)',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': {
            description: 'Profile payload',
          },
          '401': { description: 'Unauthorized' },
          '500': { description: 'Server configuration error' },
        },
      },
    },
    '/api/user/me': {
      post: {
        tags: ['User'],
        summary: 'Create user profile for the authenticated uid (Firestore)',
        security: [{ cookieAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                additionalProperties: false,
                required: ['DOB', 'FirstName', 'LastName', 'isFemale'],
                properties: {
                  DOB: { type: 'string' },
                  FirstName: { type: 'string' },
                  LastName: { type: 'string' },
                  isFemale: { type: 'boolean' },
                  Phone: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Created' },
          '400': { description: 'Invalid body' },
          '401': { description: 'Unauthorized' },
          '409': { description: 'User already exists' },
          '500': { description: 'Failed to create user' },
        },
      },
    },
    '/api/user/me/exists': {
      get: {
        tags: ['User'],
        summary: 'Check if user profile exists for the authenticated uid (Firestore)',
        security: [{ cookieAuth: [] }],
        responses: {
          '200': { description: 'Exists result' },
          '401': { description: 'Unauthorized' },
          '500': { description: 'Failed to check user' },
        },
      },
    },
    '/api/public/data': {
      get: {
        tags: ['Public'],
        summary: 'Public data (optionally personalized if bearer token provided)',
        responses: {
          '200': { description: 'Public or personalized payload' },
        },
      },
    },
  },
};
