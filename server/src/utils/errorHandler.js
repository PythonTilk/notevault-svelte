import { promisify } from 'util';

/**
 * Standardized error handling utilities for NoteVault server
 * Provides consistent error patterns across the application
 */

/**
 * Custom error types for better error categorization
 */
class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, field = null) {
    super(message, 400, 'VALIDATION_ERROR');
    this.field = field;
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'AUTH_ERROR');
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Insufficient permissions') {
    super(message, 403, 'AUTHORIZATION_ERROR');
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409, 'CONFLICT_ERROR');
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', originalError = null) {
    super(message, 500, 'DATABASE_ERROR');
    this.originalError = originalError;
  }
}

/**
 * Database operation wrapper that promisifies callback-based DB operations
 */
class DatabaseWrapper {
  constructor(db) {
    this.db = db;
  }

  /**
   * Execute a single database query with Promise interface
   */
  async query(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(new DatabaseError('Query failed', err));
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Get a single row from database
   */
  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(new DatabaseError('Query failed', err));
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Execute a database write operation (INSERT, UPDATE, DELETE)
   */
  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(new DatabaseError('Write operation failed', err));
        } else {
          resolve({
            lastID: this.lastID,
            changes: this.changes
          });
        }
      });
    });
  }

  /**
   * Execute multiple operations in a transaction
   */
  async transaction(operations) {
    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run('BEGIN TRANSACTION', (err) => {
          if (err) {
            reject(new DatabaseError('Failed to start transaction', err));
            return;
          }

          const executeOperations = async () => {
            try {
              const results = [];
              for (const operation of operations) {
                const result = await operation(this);
                results.push(result);
              }
              
              this.db.run('COMMIT', (err) => {
                if (err) {
                  reject(new DatabaseError('Failed to commit transaction', err));
                } else {
                  resolve(results);
                }
              });
            } catch (error) {
              this.db.run('ROLLBACK', () => {
                reject(error);
              });
            }
          };

          executeOperations();
        });
      });
    });
  }
}

/**
 * Async operation wrapper with standardized error handling
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Error response formatter with security-focused message filtering
 */
const formatErrorResponse = (error, includeStack = false) => {
  // Define safe error messages that don't leak sensitive information
  const getSafeErrorMessage = (error) => {
    // If it's one of our custom error types, the message is already safe
    if (error instanceof AppError) {
      return error.message;
    }

    // For database errors, provide generic message
    if (error instanceof DatabaseError || error.name === 'SequelizeError' || error.code?.startsWith('SQLITE_')) {
      return 'A database error occurred';
    }

    // For file system errors, provide generic message
    if (error.code === 'ENOENT' || error.code === 'EACCES' || error.code === 'EPERM') {
      return 'File access error';
    }

    // For network errors, provide generic message
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
      return 'Network connection error';
    }

    // For JWT errors, provide generic message
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return 'Authentication token is invalid or expired';
    }

    // For validation errors from express-validator
    if (error.array && typeof error.array === 'function') {
      return 'Validation failed';
    }

    // For any other error, provide generic message
    return 'An unexpected error occurred';
  };

  const response = {
    success: false,
    error: {
      message: getSafeErrorMessage(error),
      code: error.code || 'INTERNAL_ERROR',
      statusCode: error.statusCode || 500
    }
  };

  // Add field information for validation errors
  if (error instanceof ValidationError && error.field) {
    response.error.field = error.field;
  }

  // Include stack trace only in development and never in production
  if (includeStack && error.stack && process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack;
  }

  // Log original error details server-side for debugging
  console.error('Error Details (Server-side only):', {
    originalMessage: error.message,
    stack: error.stack,
    code: error.code,
    name: error.name,
    timestamp: new Date().toISOString()
  });

  // Log original error for database errors
  if (error instanceof DatabaseError && error.originalError) {
    console.error('Database Error Details:', error.originalError);
  }

  return response;
};

/**
 * Global error handler middleware
 */
const globalErrorHandler = (error, req, res, next) => {
  // Log error for debugging
  console.error('Error occurred:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Don't expose sensitive information in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // Handle specific error types
  if (error instanceof AppError) {
    return res.status(error.statusCode).json(
      formatErrorResponse(error, isDevelopment)
    );
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
    return res.status(401).json(
      formatErrorResponse(new AuthenticationError('Invalid or expired token'))
    );
  }

  // Handle validation errors (express-validator)
  if (error.array && typeof error.array === 'function') {
    const validationErrors = error.array();
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details: validationErrors
      }
    });
  }

  // Handle unexpected errors
  res.status(500).json(
    formatErrorResponse(
      new AppError('Internal server error', 500),
      isDevelopment
    )
  );
};

/**
 * Safe async file operation wrapper
 */
const safeFileOperation = async (operation, errorMessage = 'File operation failed') => {
  try {
    return await operation();
  } catch (error) {
    throw new AppError(errorMessage, 500, 'FILE_ERROR');
  }
};

/**
 * Safe async operation with cleanup
 */
const safeAsyncOperation = async (operation, cleanup = null) => {
  try {
    return await operation();
  } catch (error) {
    if (cleanup) {
      try {
        await cleanup();
      } catch (cleanupError) {
        console.error('Cleanup failed:', cleanupError);
      }
    }
    throw error;
  }
};

/**
 * Retry mechanism for database operations
 */
const retryOperation = async (operation, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry certain types of errors
      if (error instanceof ValidationError || 
          error instanceof AuthenticationError || 
          error instanceof AuthorizationError ||
          error instanceof NotFoundError) {
        throw error;
      }
      
      if (attempt < maxRetries) {
        console.warn(`Operation failed, retrying in ${delay}ms... (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
  }
  
  throw lastError;
};

export {
  // Error classes
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  DatabaseError,
  
  // Database wrapper
  DatabaseWrapper,
  
  // Utility functions
  asyncHandler,
  formatErrorResponse,
  globalErrorHandler,
  safeFileOperation,
  safeAsyncOperation,
  retryOperation
};