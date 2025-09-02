import { Request, Response, NextFunction } from 'express';

// Error classification types
export enum ErrorType {
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  AI_MODEL = 'AI_MODEL',
  CLIENT = 'CLIENT',
  SERVER = 'SERVER',
  RATE_LIMIT = 'RATE_LIMIT',
  AUTHENTICATION = 'AUTHENTICATION',
  AUTHORIZATION = 'AUTHORIZATION',
  NOT_FOUND = 'NOT_FOUND',
  TIMEOUT = 'TIMEOUT',
  STORAGE = 'STORAGE'
}

export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// Structured error interface
export interface StructuredError extends Error {
  type: ErrorType;
  severity: ErrorSeverity;
  statusCode: number;
  userMessage: string;
  technicalMessage: string;
  context?: Record<string, any>;
  timestamp: Date;
  requestId?: string;
  retryable: boolean;
  suggestions?: string[];
}

// Error response interface
export interface ErrorResponse {
  error: {
    type: ErrorType;
    severity: ErrorSeverity;
    message: string;
    code: string;
    timestamp: string;
    requestId?: string;
    retryable: boolean;
    suggestions?: string[];
    context?: Record<string, any>;
  };
  meta?: {
    endpoint: string;
    method: string;
    userAgent?: string;
    ip?: string;
  };
}

// Custom error classes
export class ValidationError extends Error implements StructuredError {
  type = ErrorType.VALIDATION;
  severity = ErrorSeverity.MEDIUM;
  statusCode = 400;
  userMessage: string;
  technicalMessage: string;
  context?: Record<string, any>;
  timestamp = new Date();
  requestId?: string;
  retryable = false;
  suggestions?: string[];

  constructor(message: string, context?: Record<string, any>, suggestions?: string[]) {
    super(message);
    this.name = 'ValidationError';
    this.userMessage = message;
    this.technicalMessage = message;
    this.context = context;
    this.suggestions = suggestions || [
      'Check your input data format',
      'Ensure all required fields are provided',
      'Verify data types match expected values'
    ];
  }
}

export class NetworkError extends Error implements StructuredError {
  type = ErrorType.NETWORK;
  severity = ErrorSeverity.HIGH;
  statusCode = 503;
  userMessage: string;
  technicalMessage: string;
  context?: Record<string, any>;
  timestamp = new Date();
  requestId?: string;
  retryable = true;
  suggestions?: string[];

  constructor(message: string, context?: Record<string, any>) {
    super(message);
    this.name = 'NetworkError';
    this.userMessage = 'Network connection failed. Please try again.';
    this.technicalMessage = message;
    this.context = context;
    this.suggestions = [
      'Check your internet connection',
      'Try again in a few moments',
      'Contact support if the problem persists'
    ];
  }
}

export class AIModelError extends Error implements StructuredError {
  type = ErrorType.AI_MODEL;
  severity = ErrorSeverity.HIGH;
  statusCode = 503;
  userMessage: string;
  technicalMessage: string;
  context?: Record<string, any>;
  timestamp = new Date();
  requestId?: string;
  retryable = true;
  suggestions?: string[];

  constructor(message: string, context?: Record<string, any>) {
    super(message);
    this.name = 'AIModelError';
    this.userMessage = 'AI analysis service is temporarily unavailable. Please try again.';
    this.technicalMessage = message;
    this.context = context;
    this.suggestions = [
      'Try again in a few minutes',
      'Check if the AI service is running',
      'Use the fallback analysis if available'
    ];
  }
}

export class TimeoutError extends Error implements StructuredError {
  type = ErrorType.TIMEOUT;
  severity = ErrorSeverity.MEDIUM;
  statusCode = 408;
  userMessage: string;
  technicalMessage: string;
  context?: Record<string, any>;
  timestamp = new Date();
  requestId?: string;
  retryable = true;
  suggestions?: string[];

  constructor(message: string, context?: Record<string, any>) {
    super(message);
    this.name = 'TimeoutError';
    this.userMessage = 'Request timed out. Please try again with shorter content.';
    this.technicalMessage = message;
    this.context = context;
    this.suggestions = [
      'Try with shorter content',
      'Check your internet connection',
      'Try again in a few moments'
    ];
  }
}

export class StorageError extends Error implements StructuredError {
  type = ErrorType.STORAGE;
  severity = ErrorSeverity.MEDIUM;
  statusCode = 500;
  userMessage: string;
  technicalMessage: string;
  context?: Record<string, any>;
  timestamp = new Date();
  requestId?: string;
  retryable = true;
  suggestions?: string[];

  constructor(message: string, context?: Record<string, any>) {
    super(message);
    this.name = 'StorageError';
    this.userMessage = 'Data storage operation failed. Please try again.';
    this.technicalMessage = message;
    this.context = context;
    this.suggestions = [
      'Try the operation again',
      'Clear your browser cache',
      'Contact support if the problem persists'
    ];
  }
}

export class RateLimitError extends Error implements StructuredError {
  type = ErrorType.RATE_LIMIT;
  severity = ErrorSeverity.MEDIUM;
  statusCode = 429;
  userMessage: string;
  technicalMessage: string;
  context?: Record<string, any>;
  timestamp = new Date();
  requestId?: string;
  retryable = true;
  suggestions?: string[];

  constructor(message: string, context?: Record<string, any>) {
    super(message);
    this.name = 'RateLimitError';
    this.userMessage = 'Too many requests. Please try again later.';
    this.technicalMessage = message;
    this.context = context;
    this.suggestions = [
      'Wait before making additional requests',
      'Reduce the frequency of your requests',
      'Try again in a few minutes'
    ];
  }
}

export class AuthenticationError extends Error implements StructuredError {
  type = ErrorType.AUTHENTICATION;
  severity = ErrorSeverity.HIGH;
  statusCode = 401;
  userMessage: string;
  technicalMessage: string;
  context?: Record<string, any>;
  timestamp = new Date();
  requestId?: string;
  retryable = false;
  suggestions?: string[];

  constructor(message: string, context?: Record<string, any>) {
    super(message);
    this.name = 'AuthenticationError';
    this.userMessage = 'Authentication failed. Please check your credentials.';
    this.technicalMessage = message;
    this.context = context;
    this.suggestions = [
      'Verify your login credentials',
      'Check if your authentication token has expired',
      'Try logging in again'
    ];
  }
}

export class AuthorizationError extends Error implements StructuredError {
  type = ErrorType.AUTHORIZATION;
  severity = ErrorSeverity.HIGH;
  statusCode = 403;
  userMessage: string;
  technicalMessage: string;
  context?: Record<string, any>;
  timestamp = new Date();
  requestId?: string;
  retryable = false;
  suggestions?: string[];

  constructor(message: string, context?: Record<string, any>) {
    super(message);
    this.name = 'AuthorizationError';
    this.userMessage = 'You do not have permission to perform this action.';
    this.technicalMessage = message;
    this.context = context;
    this.suggestions = [
      'Check if you have the necessary permissions',
      'Contact your administrator for access',
      'Verify your account privileges'
    ];
  }
}

export class NotFoundError extends Error implements StructuredError {
  type = ErrorType.NOT_FOUND;
  severity = ErrorSeverity.MEDIUM;
  statusCode = 404;
  userMessage: string;
  technicalMessage: string;
  context?: Record<string, any>;
  timestamp = new Date();
  requestId?: string;
  retryable = false;
  suggestions?: string[];

  constructor(message: string, context?: Record<string, any>) {
    super(message);
    this.name = 'NotFoundError';
    this.userMessage = 'The requested resource was not found.';
    this.technicalMessage = message;
    this.context = context;
    this.suggestions = [
      'Check if the resource exists',
      'Verify the URL or identifier',
      'The resource may have been moved or deleted'
    ];
  }
}

// Error classification utility
export function classifyError(error: any): StructuredError {
  // If already a structured error, return as-is
  if (error.type && error.severity) {
    return error as StructuredError;
  }

  // Classify based on error properties
  if (error.name === 'ValidationError' || error.message?.includes('validation')) {
    return new ValidationError(error.message, { originalError: error.name });
  }

  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT') {
    return new NetworkError(error.message, { code: error.code, originalError: error.name });
  }

  if (error.message?.includes('timeout') || error.code === 'TIMEOUT') {
    return new TimeoutError(error.message, { originalError: error.name });
  }

  if (error.message?.includes('AI') || error.message?.includes('model') || error.message?.includes('Ollama')) {
    return new AIModelError(error.message, { originalError: error.name });
  }

  if (error.message?.includes('storage') || error.message?.includes('cache')) {
    return new StorageError(error.message, { originalError: error.name });
  }

  // HTTP status code based classification
  if (error.response) {
    const statusCode = error.response.status;

    // 4xx client errors
    if (statusCode >= 400 && statusCode < 500) {
      return {
        name: 'ClientError',
        message: error.message || `Client error: ${statusCode}`,
        type: ErrorType.CLIENT,
        severity: ErrorSeverity.MEDIUM,
        statusCode: statusCode,
        userMessage: error.response.data?.message || 'The request could not be processed due to client error.',
        technicalMessage: error.message || `HTTP ${statusCode}: ${error.response.statusText}`,
        context: {
          originalError: error.name,
          statusCode,
          responseData: error.response.data,
          url: error.config?.url
        },
        timestamp: new Date(),
        retryable: false,
        suggestions: [
          'Check your request parameters',
          'Verify your authentication credentials',
          'Ensure you have the necessary permissions'
        ]
      };
    }

    // 5xx server errors
    if (statusCode >= 500) {
      return {
        name: 'ServerError',
        message: error.message || `Server error: ${statusCode}`,
        type: ErrorType.SERVER,
        severity: ErrorSeverity.HIGH,
        statusCode: statusCode,
        userMessage: 'The server encountered an error. Please try again later.',
        technicalMessage: error.message || `HTTP ${statusCode}: ${error.response.statusText}`,
        context: {
          originalError: error.name,
          statusCode,
          responseData: error.response.data,
          url: error.config?.url
        },
        timestamp: new Date(),
        retryable: true,
        suggestions: [
          'Try the operation again in a few minutes',
          'Check system status page for outages',
          'Contact support if the problem persists'
        ]
      };
    }
  }

  // Rate limit detection
  if (error.response?.status === 429 || error.message?.includes('rate limit') || error.message?.includes('too many requests')) {
    return {
      name: 'RateLimitError',
      message: error.message || 'Rate limit exceeded',
      type: ErrorType.RATE_LIMIT,
      severity: ErrorSeverity.MEDIUM,
      statusCode: 429,
      userMessage: 'You have made too many requests. Please try again later.',
      technicalMessage: error.message || 'Rate limit exceeded',
      context: {
        originalError: error.name,
        retryAfter: error.response?.headers?.['retry-after'] || '60'
      },
      timestamp: new Date(),
      retryable: true,
      suggestions: [
        'Wait before making additional requests',
        'Reduce the frequency of your requests',
        'Consider implementing request batching'
      ]
    };
  }

  // Default to server error
  const serverError: StructuredError = {
    name: 'ServerError',
    message: error.message || 'An unexpected error occurred',
    type: ErrorType.SERVER,
    severity: ErrorSeverity.HIGH,
    statusCode: 500,
    userMessage: 'An unexpected error occurred. Please try again.',
    technicalMessage: error.message || 'Unknown server error',
    context: { originalError: error.name, stack: error.stack },
    timestamp: new Date(),
    retryable: false,
    suggestions: [
      'Try the operation again',
      'Contact support if the problem persists',
      'Check the system status page'
    ]
  };

  return serverError;
}

// Error response formatter
export function formatErrorResponse(error: StructuredError, req: Request): ErrorResponse {
  const response: ErrorResponse = {
    error: {
      type: error.type,
      severity: error.severity,
      message: error.userMessage,
      code: `${error.type}_${error.statusCode}`,
      timestamp: error.timestamp.toISOString(),
      requestId: error.requestId || req.headers['x-request-id'] as string,
      retryable: error.retryable,
      suggestions: error.suggestions,
      context: process.env.NODE_ENV === 'development' ? error.context : undefined
    },
    meta: {
      endpoint: req.path,
      method: req.method,
      userAgent: req.headers['user-agent'],
      ip: req.ip || req.connection.remoteAddress
    }
  };

  return response;
}

// Enhanced error handling middleware
export async function errorHandler(err: any, req: Request, res: Response, next: NextFunction): Promise<void> {
  // Generate request ID if not present
  const requestId = req.headers['x-request-id'] as string || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Classify the error
  const structuredError = classifyError(err);
  structuredError.requestId = requestId;

  // Log the error with structured data
  const logData = {
    requestId,
    error: {
      type: structuredError.type,
      severity: structuredError.severity,
      message: structuredError.technicalMessage,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    },
    request: {
      method: req.method,
      url: req.url,
      headers: req.headers,
      body: req.method !== 'GET' ? req.body : undefined,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    },
    timestamp: structuredError.timestamp.toISOString()
  };

  // Record error in metrics (import dynamically to avoid circular dependency)
  try {
    const { metricsCollector } = await import('./monitoring.js');
    metricsCollector.recordError(structuredError, `${req.method} ${req.path}`);
  } catch (metricError) {
    console.error('Failed to record error metrics:', metricError);
  }

  // Log based on severity
  switch (structuredError.severity) {
    case ErrorSeverity.CRITICAL:
      console.error('🚨 CRITICAL ERROR:', JSON.stringify(logData, null, 2));
      // Could trigger alerts or notifications for critical errors
      try {
        // Example: sendAlertNotification(structuredError);
      } catch (alertError) {
        console.error('Failed to send alert notification:', alertError);
      }
      break;
    case ErrorSeverity.HIGH:
      console.error('❌ HIGH SEVERITY ERROR:', JSON.stringify(logData, null, 2));
      break;
    case ErrorSeverity.MEDIUM:
      console.warn('⚠️ MEDIUM SEVERITY ERROR:', JSON.stringify(logData, null, 2));
      break;
    case ErrorSeverity.LOW:
      console.info('ℹ️ LOW SEVERITY ERROR:', JSON.stringify(logData, null, 2));
      break;
  }

  // Format and send error response
  const errorResponse = formatErrorResponse(structuredError, req);

  // Add retry information if applicable
  if (structuredError.retryable) {
    const retryAfter = structuredError.type === ErrorType.RATE_LIMIT
      ? parseInt(structuredError.context?.retryAfter || '60', 10)
      : 30; // Default retry after 30 seconds

    res.set('Retry-After', retryAfter.toString());
  }

  res.status(structuredError.statusCode).json(errorResponse);
}

// Request ID middleware
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = req.headers['x-request-id'] as string || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

// Error logging utility
export function logError(error: StructuredError, context?: Record<string, any>): void {
  const logEntry = {
    timestamp: error.timestamp.toISOString(),
    requestId: error.requestId,
    type: error.type,
    severity: error.severity,
    message: error.technicalMessage,
    context: { ...error.context, ...context }
  };

  console.error('📝 Error Log:', JSON.stringify(logEntry, null, 2));
}