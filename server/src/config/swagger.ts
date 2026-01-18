import type { OpenAPIV3 } from '../types/openapi';

export const openApiSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: {
    title: 'HalfRide Server API',
    version: '1.0.0',
    description: 'Express API with Firebase Auth (ID token) verification',
  },
  servers: [{ url: 'http://localhost:3000' }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Firebase Auth ID token (Authorization: Bearer <idToken>)',
      },
    },
  },
  tags: [{ name: 'Health' }, { name: 'User' }, { name: 'Public' }],
  paths: {
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
        summary: 'Get authenticated user profile (from token)',
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
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
        security: [{ bearerAuth: [] }],
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
