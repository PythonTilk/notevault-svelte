import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

// Swagger definition
const swaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'NoteVault API',
    version: '1.0.0',
    description: 'A comprehensive collaborative workspace platform API with advanced security, analytics, and real-time features.',
    contact: {
      name: 'NoteVault Support',
      email: 'support@notevault.com',
      url: 'https://notevault.com/support'
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT'
    }
  },
  servers: [
    {
      url: process.env.BASE_URL || 'http://localhost:3001',
      description: 'Development server'
    },
    {
      url: 'https://api.notevault.com',
      description: 'Production server'
    }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      },
      sessionAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'notevault.sid'
      },
      csrfToken: {
        type: 'apiKey',
        in: 'header',
        name: 'X-CSRF-Token'
      }
    },
    schemas: {
      User: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique user identifier',
            example: 'user-123456789'
          },
          username: {
            type: 'string',
            description: 'Unique username',
            example: 'john_doe'
          },
          email: {
            type: 'string',
            format: 'email',
            description: 'User email address',
            example: 'john@example.com'
          },
          displayName: {
            type: 'string',
            description: 'User display name',
            example: 'John Doe'
          },
          avatar: {
            type: 'string',
            format: 'uri',
            description: 'Avatar image URL',
            example: 'https://example.com/avatar.jpg'
          },
          role: {
            type: 'string',
            enum: ['admin', 'moderator', 'user'],
            description: 'User role',
            example: 'user'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Account creation timestamp'
          },
          lastActive: {
            type: 'string',
            format: 'date-time',
            description: 'Last activity timestamp'
          },
          isOnline: {
            type: 'boolean',
            description: 'Current online status'
          }
        },
        required: ['id', 'username', 'email', 'displayName', 'role']
      },
      Workspace: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique workspace identifier',
            example: 'workspace-123456789'
          },
          name: {
            type: 'string',
            description: 'Workspace name',
            example: 'My Project'
          },
          description: {
            type: 'string',
            description: 'Workspace description',
            example: 'A collaborative workspace for our team project'
          },
          color: {
            type: 'string',
            description: 'Workspace color theme',
            example: '#3B82F6'
          },
          ownerId: {
            type: 'string',
            description: 'Workspace owner user ID',
            example: 'user-123456789'
          },
          isPublic: {
            type: 'boolean',
            description: 'Whether workspace is public',
            example: false
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp'
          }
        },
        required: ['id', 'name', 'color', 'ownerId']
      },
      Note: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique note identifier',
            example: 'note-123456789'
          },
          title: {
            type: 'string',
            description: 'Note title',
            example: 'Meeting Notes'
          },
          content: {
            type: 'string',
            description: 'Note content',
            example: 'Discussion about project timeline...'
          },
          type: {
            type: 'string',
            enum: ['text', 'rich', 'code', 'canvas'],
            description: 'Note type',
            example: 'text'
          },
          workspaceId: {
            type: 'string',
            description: 'Associated workspace ID',
            example: 'workspace-123456789'
          },
          authorId: {
            type: 'string',
            description: 'Note author user ID',
            example: 'user-123456789'
          },
          position: {
            type: 'object',
            properties: {
              x: { type: 'number', example: 100 },
              y: { type: 'number', example: 50 }
            }
          },
          size: {
            type: 'object',
            properties: {
              width: { type: 'number', example: 300 },
              height: { type: 'number', example: 200 }
            }
          },
          color: {
            type: 'string',
            description: 'Note color',
            example: '#FEF3C7'
          },
          tags: {
            type: 'array',
            items: { type: 'string' },
            description: 'Note tags',
            example: ['meeting', 'important']
          },
          isPublic: {
            type: 'boolean',
            description: 'Whether note is public',
            example: false
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp'
          }
        },
        required: ['id', 'title', 'content', 'type', 'workspaceId', 'authorId', 'color']
      },
      ChatMessage: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique message identifier',
            example: 'msg-123456789'
          },
          content: {
            type: 'string',
            description: 'Message content',
            example: 'Hello everyone!'
          },
          authorId: {
            type: 'string',
            description: 'Message author user ID',
            example: 'user-123456789'
          },
          author: {
            $ref: '#/components/schemas/User'
          },
          channelId: {
            type: 'string',
            description: 'Channel or workspace ID',
            example: 'workspace-123456789'
          },
          replyToId: {
            type: 'string',
            description: 'ID of message being replied to',
            example: 'msg-987654321'
          },
          reactions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                emoji: { type: 'string', example: '👍' },
                count: { type: 'integer', example: 3 },
                users: {
                  type: 'array',
                  items: { type: 'string' }
                }
              }
            }
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp'
          },
          editedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last edit timestamp'
          }
        },
        required: ['id', 'content', 'authorId', 'createdAt']
      },
      File: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique file identifier',
            example: 'file-123456789'
          },
          name: {
            type: 'string',
            description: 'File name',
            example: 'document.pdf'
          },
          originalName: {
            type: 'string',
            description: 'Original file name',
            example: 'My Document.pdf'
          },
          type: {
            type: 'string',
            description: 'MIME type',
            example: 'application/pdf'
          },
          size: {
            type: 'integer',
            description: 'File size in bytes',
            example: 1024000
          },
          url: {
            type: 'string',
            format: 'uri',
            description: 'File download URL',
            example: 'https://example.com/files/document.pdf'
          },
          uploaderId: {
            type: 'string',
            description: 'Uploader user ID',
            example: 'user-123456789'
          },
          workspaceId: {
            type: 'string',
            description: 'Associated workspace ID',
            example: 'workspace-123456789'
          },
          isPublic: {
            type: 'boolean',
            description: 'Whether file is public',
            example: false
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Upload timestamp'
          }
        },
        required: ['id', 'name', 'originalName', 'type', 'size', 'url', 'uploaderId']
      },
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message',
            example: 'Invalid request parameters'
          },
          code: {
            type: 'string',
            description: 'Error code',
            example: 'VALIDATION_ERROR'
          },
          details: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                field: { type: 'string', example: 'email' },
                message: { type: 'string', example: 'Invalid email format' }
              }
            }
          },
          timestamp: {
            type: 'string',
            format: 'date-time',
            description: 'Error timestamp'
          }
        },
        required: ['error']
      },
      AnalyticsData: {
        type: 'object',
        properties: {
          timeRange: {
            type: 'string',
            enum: ['24h', '7d', '30d', '90d'],
            example: '24h'
          },
          overview: {
            type: 'object',
            properties: {
              totalUsers: { type: 'integer', example: 150 },
              activeUsers: { type: 'integer', example: 75 },
              newUsers: { type: 'integer', example: 5 },
              totalSessions: { type: 'integer', example: 200 },
              avgSessionDuration: { type: 'number', example: 1800 },
              errorRate: { type: 'number', example: 0.02 }
            }
          },
          charts: {
            type: 'object',
            properties: {
              userGrowth: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    date: { type: 'string', format: 'date' },
                    users: { type: 'integer' }
                  }
                }
              },
              activityTimeline: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    timestamp: { type: 'string', format: 'date-time' },
                    events: { type: 'integer' }
                  }
                }
              }
            }
          }
        }
      },
      BackupInfo: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Backup identifier',
            example: 'full-2023-12-01-abc123'
          },
          type: {
            type: 'string',
            enum: ['full', 'incremental'],
            description: 'Backup type',
            example: 'full'
          },
          status: {
            type: 'string',
            enum: ['in_progress', 'completed', 'failed'],
            description: 'Backup status',
            example: 'completed'
          },
          size: {
            type: 'integer',
            description: 'Backup size in bytes',
            example: 104857600
          },
          compressedSize: {
            type: 'integer',
            description: 'Compressed backup size in bytes',
            example: 52428800
          },
          files: {
            type: 'integer',
            description: 'Number of files in backup',
            example: 1500
          },
          startTime: {
            type: 'string',
            format: 'date-time',
            description: 'Backup start time'
          },
          endTime: {
            type: 'string',
            format: 'date-time',
            description: 'Backup completion time'
          },
          duration: {
            type: 'integer',
            description: 'Backup duration in milliseconds',
            example: 300000
          }
        }
      }
    },
    responses: {
      UnauthorizedError: {
        description: 'Authentication required',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              error: 'Authentication required',
              code: 'UNAUTHORIZED'
            }
          }
        }
      },
      ForbiddenError: {
        description: 'Insufficient permissions',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              error: 'Insufficient permissions',
              code: 'FORBIDDEN'
            }
          }
        }
      },
      NotFoundError: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              error: 'Resource not found',
              code: 'NOT_FOUND'
            }
          }
        }
      },
      ValidationError: {
        description: 'Validation failed',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              error: 'Validation failed',
              code: 'VALIDATION_ERROR',
              details: [
                {
                  field: 'email',
                  message: 'Invalid email format'
                }
              ]
            }
          }
        }
      },
      RateLimitError: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: {
              $ref: '#/components/schemas/Error'
            },
            example: {
              error: 'Too many requests',
              code: 'RATE_LIMIT_EXCEEDED',
              retryAfter: 900
            }
          }
        }
      }
    },
    parameters: {
      UserIdParam: {
        name: 'userId',
        in: 'path',
        required: true,
        schema: {
          type: 'string'
        },
        description: 'User identifier',
        example: 'user-123456789'
      },
      WorkspaceIdParam: {
        name: 'workspaceId',
        in: 'path',
        required: true,
        schema: {
          type: 'string'
        },
        description: 'Workspace identifier',
        example: 'workspace-123456789'
      },
      NoteIdParam: {
        name: 'noteId',
        in: 'path',
        required: true,
        schema: {
          type: 'string'
        },
        description: 'Note identifier',
        example: 'note-123456789'
      },
      TimeRangeParam: {
        name: 'timeRange',
        in: 'query',
        schema: {
          type: 'string',
          enum: ['24h', '7d', '30d', '90d'],
          default: '24h'
        },
        description: 'Time range for data filtering'
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 1000,
          default: 50
        },
        description: 'Maximum number of results to return'
      },
      OffsetParam: {
        name: 'offset',
        in: 'query',
        schema: {
          type: 'integer',
          minimum: 0,
          default: 0
        },
        description: 'Number of results to skip'
      }
    }
  },
  security: [
    {
      sessionAuth: []
    },
    {
      bearerAuth: []
    }
  ]
};

// Options for the swagger docs
const options = {
  definition: swaggerDefinition,
  // Path to the API docs
  apis: [
    './src/routes/*.js',
    './src/swagger-annotations.js'
  ]
};

// Initialize swagger-jsdoc
const specs = swaggerJSDoc(options);

// Custom CSS for Swagger UI
const customCss = `
  .swagger-ui .topbar { display: none; }
  .swagger-ui .info .title { color: #1f2937; }
  .swagger-ui .scheme-container { background: #f9fafb; padding: 20px; border-radius: 8px; }
  .swagger-ui .info .description { color: #4b5563; }
  .swagger-ui .opblock .opblock-summary-path { color: #059669; font-weight: 600; }
  .swagger-ui .opblock.opblock-post { border-color: #3b82f6; }
  .swagger-ui .opblock.opblock-get { border-color: #059669; }
  .swagger-ui .opblock.opblock-put { border-color: #d97706; }
  .swagger-ui .opblock.opblock-delete { border-color: #dc2626; }
`;

const swaggerOptions = {
  customCss,
  customSiteTitle: 'NoteVault API Documentation',
  customfavIcon: '/favicon.ico',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'none',
    filter: true,
    showExtensions: true,
    showCommonExtensions: true,
    tryItOutEnabled: true
  }
};

export { specs, swaggerUi, swaggerOptions };