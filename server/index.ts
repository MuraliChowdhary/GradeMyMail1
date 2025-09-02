import express, { type Request, type Response, type NextFunction } from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { createDatabaseManager } from './database-abstraction.js';
import {
  errorHandler,
  requestIdMiddleware,
  ValidationError,
  NotFoundError
} from './error-handler.js';
import {
  metricsMiddleware,
  healthCheckHandler,
  metricsHandler
} from './monitoring.js';
import { withRetry, RETRY_CONFIGS } from './retry-logic.js';

// Import GroqGemma content tagger and Gemma API service
import { contentTagger, type ContentAnalysisResult } from './ai-engines/content-tagger.js';
import { gemmaAPIService, type NewsletterAnalysis } from './ai-engines/gemma-api.js';

// Import GMMeditor functions for Fix My Mail
import { rewriteWithLlama31, getToneOptions, TONES } from './ai-engines/rewriteWithLlama31.js';

// Types for API requests and responses
interface AnalyzeRequest {
  message: string;
  content?: string;
}

interface FixRequest {
  message: string;
}

interface StoreRequest {
  payload: {
    fullOriginalText: string;
    fullOriginalHTML: string;
    taggedContent: string;
  };
}

// GMMeditor interfaces for Fix My Mail
interface GMMeditorRequest {
  originalText: string;
  toneKey?: 'professional' | 'friendly' | 'persuasive' | 'analytical' | 'storytelling';
  analysis?: {
    readabilityGrade?: number;
    audienceFit?: number;
    toneScore?: number;
    clarity?: number;
    engagement?: number;
    spamRisk?: number;
  };
  suggestions?: string[];
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    targetGradeLow?: number;
    targetGradeHigh?: number;
  };
}

interface GMMeditorResponse {
  rewritten: string;
  mappings: Array<{
    type: 'unchanged' | 'changed' | 'inserted' | 'deleted';
    old: string;
    new: string;
    wordDiff: Array<{
      added?: boolean;
      removed?: boolean;
      value: string;
    }> | null;
  }>;
  metadata: {
    model: string;
    processingTime: number;
    toneUsed: string;
    originalLength: number;
    rewrittenLength: number;
  };
}

// Removed unused StoredData interface

// Database manager for scalable storage
const databaseManager = createDatabaseManager({
  type: process.env.STORAGE_TYPE as any || 'memory',
  connectionString: process.env.DATABASE_URL,
  ttl: 30 * 60 * 1000, // 30 minutes
});

// Data TTL configuration
const DATA_TTL = 30 * 60 * 1000; // 30 minutes

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;

// Add request timing middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).startTime = Date.now();
  next();
});

// Add request ID middleware first
app.use(requestIdMiddleware);

// Add metrics collection middleware
app.use(metricsMiddleware);

// Security middleware - Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "http://localhost:*"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow for development
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  noSniff: true,
  frameguard: { action: 'deny' },
  xssFilter: true,
}));

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://yourdomain.com'] // Replace with actual production domain
    : ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400, // 24 hours preflight cache
};

app.use(cors(corsOptions));

// Compression middleware for response optimization
app.use(compression({
  filter: (req: Request, res: Response) => {
    if (req.headers['cache-control'] && req.headers['cache-control'].includes('no-transform')) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024,
  chunkSize: 16 * 1024,
}));

// HTTP request logging with Morgan
const morganFormat = process.env.NODE_ENV === 'production' ? 'combined' : 'dev';

app.use(morgan(morganFormat, {
  skip: (req: Request) => req.url === '/api/health',
  stream: process.stdout,
}));

// Rate limiting implementation
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const createRateLimit = (windowMs: number, max: number, message: string) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    const now = Date.now();

    if (Math.random() < 0.01) {
      for (const [key, data] of Array.from(rateLimitStore.entries())) {
        if (now > data.resetTime) {
          rateLimitStore.delete(key);
        }
      }
    }

    const current = rateLimitStore.get(ip as string) || { count: 0, resetTime: now + windowMs };

    if (now > current.resetTime) {
      current.count = 1;
      current.resetTime = now + windowMs;
    } else {
      current.count++;
    }

    rateLimitStore.set(ip as string, current);

    res.set({
      'X-RateLimit-Limit': max.toString(),
      'X-RateLimit-Remaining': Math.max(0, max - current.count).toString(),
      'X-RateLimit-Reset': new Date(current.resetTime).toISOString(),
    });

    if (current.count > max) {
      const retryAfterSeconds = Math.ceil((current.resetTime - now) / 1000);
      res.status(429).json({
        error: 'Too many requests',
        message,
        retryAfter: retryAfterSeconds,
        currentCount: current.count,
        maxAllowed: max,
        windowMs: windowMs,
        resetTime: new Date(current.resetTime).toISOString(),
      });
      return;
    }

    next();
  };
};

// Rate limiting
const generalRateLimit = createRateLimit(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per window
  'Too many requests from this IP, please try again later.'
);

// Configurable rate limits based on environment
const AI_RATE_LIMIT_WINDOW = parseInt(process.env.AI_RATE_LIMIT_WINDOW || '300000'); // 5 minutes default
const AI_RATE_LIMIT_MAX = parseInt(process.env.AI_RATE_LIMIT_MAX || '100'); // 100 requests default

const aiRateLimit = createRateLimit(
  AI_RATE_LIMIT_WINDOW,
  AI_RATE_LIMIT_MAX,
  'Too many AI analysis requests, please try again in a few minutes.'
);

app.use('/api', generalRateLimit);

// Body parsing middleware

// app.use(express.static(path.join(__dirname, "dist")));

// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "dist/index.html"));
// });


app.use(express.json({
  limit: '10mb',
  strict: true,
  type: 'application/json',
}));
app.use(express.urlencoded({
  extended: true,
  limit: '10mb',
  parameterLimit: 1000,
}));

// Request validation middleware
const validateRequest = (requiredFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const missingFields = requiredFields.filter(field => {
        const value = req.body[field];
        return value === undefined || value === null || value === '';
      });

      if (missingFields.length > 0) {
        throw new ValidationError(
          `Missing required fields: ${missingFields.join(', ')}`,
          { missingFields, endpoint: req.path }
        );
      }

      const contentField = req.body.message || req.body.content;
      if (contentField && typeof contentField === 'string') {
        if (contentField.length > 50000) {
          throw new ValidationError(
            'Content too large. Maximum 50,000 characters allowed.',
            { contentLength: contentField.length, maxLength: 50000 }
          );
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Security middleware for input sanitization
const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.body && typeof req.body === 'object') {
      const sanitize = (obj: any): any => {
        if (typeof obj === 'string') {
          return obj
            .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');
        }
        if (typeof obj === 'object' && obj !== null) {
          const sanitized: any = {};
          for (const [key, value] of Object.entries(obj)) {
            sanitized[key] = sanitize(value);
          }
          return sanitized;
        }
        return obj;
      };

      req.body = sanitize(req.body);
    }
    next();
  } catch (error) {
    next(error);
  }
};

app.use(sanitizeInput);

// Health check endpoints
app.get('/api/health', healthCheckHandler);
app.get('/api/metrics', generalRateLimit, metricsHandler);

// Cache status endpoint for monitoring
app.get('/api/cache/stats', generalRateLimit, (req: Request, res: Response) => {
  const stats = analysisCache.getStats();
  res.json({
    cache: stats,
    timestamp: new Date().toISOString()
  });
});

// Simple health checks
app.get('/api/health/simple', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/health/ready', async (req: Request, res: Response) => {
  try {
    // Check Gemma API service health
    const gemmaHealth = await gemmaAPIService.getHealthStatus();

    const allHealthy = gemmaHealth.status === 'healthy';

    res.status(allHealthy ? 200 : 503).json({
      status: allHealthy ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
      services: {
        gemmaAPI: gemmaHealth,
        contentTagger: { status: 'healthy', model: 'rule-based' }
      }
    });
  } catch (error) {
    res.status(503).json({
      status: 'not ready',
      timestamp: new Date().toISOString(),
      error: 'Service check failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

app.get('/api/health/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Temporary mock functions (will be replaced with GroqGemma system)
const mockAnalyzeEmail = async (content: string): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

  let taggedContent = content;
  taggedContent = taggedContent.replace(/\b(amazing|incredible|fantastic)\b/gi, '<fluff>$1</fluff>');
  taggedContent = taggedContent.replace(/\b(free|urgent|act now|limited time)\b/gi, '<spam_words>$1</spam_words>');
  taggedContent = taggedContent.replace(/\b[A-Z][^.!?]*[.!?]\s*[A-Z][^.!?]*[.!?]\s*[A-Z][^.!?]*[.!?]/g, '<hard_to_read>$&</hard_to_read>');

  return taggedContent;
};

const mockFixEmail = async (taggedContent: string): Promise<string> => {
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2000));

  const improvements = [
    { original: 'amazing', improved: 'excellent' },
    { original: 'incredible', improved: 'remarkable' },
    { original: 'fantastic', improved: 'outstanding' },
    { original: 'free', improved: 'complimentary' },
    { original: 'urgent', improved: 'time-sensitive' },
    { original: 'act now', improved: 'take action' },
    { original: 'limited time', improved: 'time-limited offer' }
  ];

  let result = '';
  const foundImprovements = [];
  
  for (const improvement of improvements) {
    // Use case-insensitive search
    const regex = new RegExp(improvement.original, 'gi');
    if (regex.test(taggedContent)) {
      foundImprovements.push(improvement);
      result += `<old_draft>${improvement.original}</old_draft><optimized_draft>${improvement.improved}</optimized_draft>\n`;
    }
  }

  console.log(`🔧 Found ${foundImprovements.length} improvements:`, foundImprovements.map(i => i.original));

  // If no specific word improvements found, look for tagged content and provide generic improvements
  if (result === '') {
    const fluffMatches = taggedContent.match(/<fluff>(.*?)<\/fluff>/g);
    const spamMatches = taggedContent.match(/<spam_words>(.*?)<\/spam_words>/g);
    const hardToReadMatches = taggedContent.match(/<hard_to_read>(.*?)<\/hard_to_read>/g);
    
    if (fluffMatches) {
      result += `<old_draft>wordy phrases</old_draft><optimized_draft>concise language</optimized_draft>\n`;
    }
    if (spamMatches) {
      result += `<old_draft>promotional language</old_draft><optimized_draft>professional tone</optimized_draft>\n`;
    }
    if (hardToReadMatches) {
      result += `<old_draft>complex sentences</old_draft><optimized_draft>clear, simple sentences</optimized_draft>\n`;
    }
  }

  return result || '<old_draft>No improvements needed</old_draft><optimized_draft>Content is already well-written</optimized_draft>';
};

// Intelligent caching for analysis results
interface CacheEntry {
  result: any;
  timestamp: Date;
  contentHash: string;
  expiresAt: Date;
}

class AnalysisCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxCacheSize = 1000;
  private readonly cacheExpiryMs = 30 * 60 * 1000; // 30 minutes

  // Create content hash for deduplication
  private createContentHash(content: string): string {
    let hash = 0;
    if (content.length === 0) return hash.toString();

    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash).toString(36);
  }

  // Get cached result if valid
  get(content: string): any | null {
    const contentHash = this.createContentHash(content);
    const entry = this.cache.get(contentHash);

    if (!entry) return null;

    const now = new Date();
    if (now > entry.expiresAt) {
      this.cache.delete(contentHash);
      return null;
    }

    console.log(`💾 Cache hit for content hash: ${contentHash}`);
    return entry.result;
  }

  // Set cached result
  set(content: string, result: any): void {
    const contentHash = this.createContentHash(content);
    const now = new Date();

    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(contentHash, {
      result,
      timestamp: now,
      contentHash,
      expiresAt: new Date(now.getTime() + this.cacheExpiryMs),
    });

    console.log(`💾 Cached result for content hash: ${contentHash}`);
  }

  // Clear expired entries
  cleanup(): void {
    const now = new Date();
    let cleanedCount = 0;

    for (const [key, entry] of Array.from(this.cache.entries())) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      expiryMs: this.cacheExpiryMs,
    };
  }
}

// Create cache instance
const analysisCache = new AnalysisCache();

// Cleanup expired cache entries every 10 minutes
setInterval(() => {
  analysisCache.cleanup();
}, 10 * 60 * 1000);

// Grade My Mail intelligent fallback for GMMeditor failures
async function gradeMyMailIntelligentFallback(originalText: string): Promise<GMMeditorResponse> {
  console.log('🔄 Using Grade My Mail intelligent fallback for content improvement');
  
  try {
    // Use Grade My Mail's analysis systems to provide intelligent improvements
    const [highlightingResult, scoringResult] = await Promise.allSettled([
      contentTagger.analyzeNewsletter(originalText),
      gemmaAPIService.analyzeNewsletter(originalText)
    ]);

    let improvements: string[] = [];
    let rewrittenText = originalText;

    // Extract improvement suggestions from Grade My Mail analysis
    if (highlightingResult.status === 'fulfilled') {
      const analysis = highlightingResult.value;
      const summary = contentTagger.getAnalysisSummary(analysis);
      
      // Generate basic improvements based on rule-based analysis
      if (summary.issueCounts.high > 0) {
        improvements.push('Reduced spam-like language and improved clarity');
        rewrittenText = rewrittenText.replace(/\b(amazing|incredible|fantastic)\b/gi, 'excellent');
        rewrittenText = rewrittenText.replace(/\b(free|urgent|act now|limited time)\b/gi, (match) => {
          const replacements: { [key: string]: string } = {
            'free': 'complimentary',
            'urgent': 'time-sensitive',
            'act now': 'take action',
            'limited time': 'time-limited offer'
          };
          return replacements[match.toLowerCase()] || match;
        });
      }
    }

    if (scoringResult.status === 'fulfilled') {
      const analysis = scoringResult.value;
      if (analysis.improvements && analysis.improvements.length > 0) {
        improvements.push(...analysis.improvements.slice(0, 3)); // Take top 3 improvements
      }
    }

    // Create simple diff mappings for fallback
    const mappings = [{
      type: 'changed' as const,
      old: originalText,
      new: rewrittenText,
      wordDiff: null
    }];

    return {
      rewritten: rewrittenText,
      mappings,
      metadata: {
        model: 'grade-my-mail-fallback',
        processingTime: Date.now(),
        toneUsed: 'friendly',
        originalLength: originalText.length,
        rewrittenLength: rewrittenText.length
      }
    };
  } catch (error) {
    console.error('Grade My Mail fallback failed:', error);
    // Last resort: return original text with minimal changes
    return {
      rewritten: originalText,
      mappings: [{
        type: 'unchanged' as const,
        old: originalText,
        new: originalText,
        wordDiff: null
      }],
      metadata: {
        model: 'fallback-minimal',
        processingTime: Date.now(),
        toneUsed: 'friendly',
        originalLength: originalText.length,
        rewrittenLength: originalText.length
      }
    };
  }
}

// API Routes - Using GroqGemma rule-based system

// Unified newsletter analysis endpoint with dual-system approach
app.post('/api/analyze', aiRateLimit, validateRequest(['content']), async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { content, context } = req.body;
    const startTime = (req as any).startTime || Date.now();

    console.log(`🔍 Starting unified dual-system analysis (${content.length} characters)...`);

    // Check cache first for performance optimization
    const cachedResult = analysisCache.get(content);
    if (cachedResult) {
      console.log('💾 Returning cached analysis result');
      // Update processing time for cached result
      cachedResult.metadata.processingTime = Date.now() - startTime;
      cachedResult.metadata.cached = true;
      res.json(cachedResult);
      return;
    }

    // Run both systems in parallel for optimal performance
    const [highlightingResult, scoringResult] = await Promise.allSettled([
      // Rule-based highlighting system for immediate visual feedback
      withRetry(
        async () => contentTagger.analyzeNewsletter(content),
        { ...RETRY_CONFIGS.AI_MODEL, maxRetries: 1 }
      ),
      // Groq Gemma AI for comprehensive scoring and analysis
      withRetry(
        async () => gemmaAPIService.analyzeNewsletter(content, context),
        { ...RETRY_CONFIGS.AI_MODEL, maxRetries: 2 }
      )
    ]);

    // Process rule-based highlighting results
    let analysisResult: any, summary: any, ranges: any[] = [];
    if (highlightingResult.status === 'fulfilled') {
      analysisResult = highlightingResult.value;
      summary = contentTagger.getAnalysisSummary(analysisResult);
      ranges = contentTagger.extractHighlightRanges(content, analysisResult);
      console.log('✅ Rule-based highlighting completed successfully');
    } else {
      console.warn('⚠️ Rule-based highlighting failed:', highlightingResult.reason);
      // Provide fallback highlighting
      analysisResult = { annotated: content, report: { perSentence: [], global: { wordCount: content.split(/\s+/).length } } };
      summary = { score: 75, grade: 'C', issueCounts: { high: 0, medium: 0, low: 0, info: 0 } };
      ranges = [];
    }

    // Process Gemma AI scoring results
    let metrics;
    if (scoringResult.status === 'fulfilled') {
      const analysis = scoringResult.value;
      const wordCount = content.split(/\s+/).filter((word: string) => word.length > 0).length;
      const readingTime = Math.ceil(wordCount / 200);

      metrics = {
        overallGrade: analysis.overallGrade,
        audienceFit: analysis.audienceFit,
        tone: analysis.tone,
        clarity: analysis.clarity,
        engagement: analysis.engagement,
        spamRisk: analysis.spamRisk,
        wordCount,
        readingTime,
        summary: analysis.summary,
        improvements: analysis.improvements
      };
      console.log('✅ Gemma AI scoring completed successfully');
    } else {
      console.warn('⚠️ Gemma AI scoring failed:', scoringResult.reason);
      // Provide fallback metrics
      const wordCount = content.split(/\s+/).filter((word: string) => word.length > 0).length;
      metrics = {
        overallGrade: 'C' as const,
        audienceFit: 70,
        tone: 70,
        clarity: 70,
        engagement: 70,
        spamRisk: 30,
        wordCount,
        readingTime: Math.ceil(wordCount / 200),
        summary: ['Analysis completed with limited AI functionality'],
        improvements: ['AI scoring temporarily unavailable - using rule-based analysis']
      };
    }

    // Create unified response
    const unifiedResponse = {
      // Rule-based highlighting data
      analysisResult,
      summary,
      ranges,
      // Gemma AI scoring data
      metrics,
      // Unified metadata
      metadata: {
        model: 'groq-gemma-dual-system',
        systems: {
          highlighting: highlightingResult.status === 'fulfilled' ? 'groq-gemma-rule-based' : 'fallback',
          scoring: scoringResult.status === 'fulfilled' ? 'groq-gemma-2-9b-it' : 'fallback'
        },
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - startTime,
        cached: false,
        systemHealth: {
          ruleBased: highlightingResult.status === 'fulfilled',
          gemmaAI: scoringResult.status === 'fulfilled'
        }
      }
    };

    // Cache the result for future requests
    analysisCache.set(content, unifiedResponse);

    // Return unified response
    res.json(unifiedResponse);

    console.log(`🎉 Unified dual-system analysis completed in ${Date.now() - startTime}ms`);
  } catch (error) {
    console.error('❌ Unified analysis failed:', error);
    next(error);
  }
});

// Legacy newsletter analysis endpoint (backward compatibility)
app.post('/api/newsletter/analyze', aiRateLimit, validateRequest(['message']), async (req: Request<{}, {}, AnalyzeRequest>, res: Response, next: NextFunction) => {
  try {
    const { message } = req.body;

    console.log(`📧 Analyzing newsletter content (${message.length} characters) - using GroqGemma rule-based system`);

    const analysisResult = await withRetry(
      async () => contentTagger.analyzeNewsletter(message),
      { ...RETRY_CONFIGS.AI_MODEL, maxRetries: 1 }
    );

    res.json({
      message: {
        content: analysisResult.annotated
      },
      metadata: {
        model: 'groq-gemma-rule-based',
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - ((req as any).startTime || Date.now()),
        note: 'Using GroqGemma rule-based content analysis'
      }
    });
  } catch (error) {
    next(error);
  }
});

// Newsletter comprehensive analysis endpoint with Gemma API scoring
app.post('/api/newsletter/score', aiRateLimit, validateRequest(['content']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { content } = req.body;

    console.log(`🎯 Scoring newsletter content (${content.length} characters) - using Groq Gemma API`);

    const analysis = await withRetry(
      async () => gemmaAPIService.analyzeNewsletter(content),
      { ...RETRY_CONFIGS.AI_MODEL, maxRetries: 2 }
    );

    // Calculate additional metrics
    const wordCount = content.split(/\s+/).filter((word: string) => word.length > 0).length;
    const readingTime = Math.ceil(wordCount / 200); // Average reading speed

    res.json({
      metrics: {
        overallGrade: analysis.overallGrade,
        audienceFit: analysis.audienceFit,
        tone: analysis.tone,
        clarity: analysis.clarity,
        engagement: analysis.engagement,
        spamRisk: analysis.spamRisk,
        wordCount,
        readingTime,
        summary: analysis.summary,
        improvements: analysis.improvements
      },
      metadata: {
        model: 'groq-gemma-2-9b-it',
        timestamp: new Date().toISOString(),
        processingTime: Date.now() - ((req as any).startTime || Date.now())
      }
    });
  } catch (error) {
    console.error('Gemma scoring failed:', error);
    next(error);
  }
});

// GMMeditor newsletter improvement endpoint (replaces old /api/fix)
app.post('/api/newsletter/improve', aiRateLimit, validateRequest(['originalText']), async (req: Request<{}, {}, GMMeditorRequest>, res: Response, next: NextFunction) => {
  try {
    const { originalText, toneKey = 'friendly', analysis = {}, suggestions = [], options = {} } = req.body;
    const startTime = Date.now();

    console.log(`🔧 [DEBUG] Improving newsletter content with GMMeditor`);
    console.log(`📝 [DEBUG] Original text length: ${originalText.length} characters`);
    console.log(`🎨 [DEBUG] Tone: ${toneKey}`);
    console.log(`📊 [DEBUG] Analysis data:`, analysis);
    console.log(`💡 [DEBUG] Suggestions:`, suggestions);

    try {
      // Use GMMeditor's rewriteWithLlama31 function
      console.log(`🚀 [DEBUG] Calling rewriteWithLlama31...`);
      const result = await withRetry(
        async () => rewriteWithLlama31({
          originalText,
          analysis,
          suggestions,
          toneKey,
          options: {
            model: 'llama-3.1-8b-instant',
            temperature: 0.65,
            maxTokens: 1200,
            targetGradeLow: 6,
            targetGradeHigh: 9,
            ...options
          }
        }),
        { ...RETRY_CONFIGS.AI_MODEL, maxRetries: 2 }
      );

      const processingTime = Date.now() - startTime;

      const response: GMMeditorResponse = {
        rewritten: result.rewritten,
        mappings: result.mappings,
        metadata: {
          model: 'llama-3.1-8b-instant',
          processingTime,
          toneUsed: toneKey,
          originalLength: originalText.length,
          rewrittenLength: result.rewritten.length
        }
      };

      console.log(`✅ [DEBUG] GMMeditor improvement completed in ${processingTime}ms`);
      console.log(`📤 [DEBUG] Sending response:`, {
        rewrittenLength: response.rewritten.length,
        mappingsCount: response.mappings.length,
        metadata: response.metadata
      });
      res.json(response);

    } catch (gmmError) {
      console.warn('⚠️ GMMeditor failed, using Grade My Mail intelligent fallback:', gmmError);
      
      // Fallback to Grade My Mail's intelligent analysis (not mock)
      const fallbackResult = await gradeMyMailIntelligentFallback(originalText);
      fallbackResult.metadata.processingTime = Date.now() - startTime;
      
      res.json(fallbackResult);
    }

  } catch (error) {
    console.error('❌ Newsletter improvement failed:', error);
    next(error);
  }
});

// GMMeditor tone options endpoint
app.get('/api/newsletter/tones', generalRateLimit, (req: Request, res: Response) => {
  try {
    const toneOptions = getToneOptions();
    res.json({
      tones: toneOptions,
      default: 'friendly',
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve tone options',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Legacy analyze endpoint for backward compatibility
app.post('/api/analyze-legacy', aiRateLimit, validateRequest(['message']), async (req: Request<{}, {}, AnalyzeRequest>, res: Response, next: NextFunction) => {
  try {
    const { message } = req.body;

    console.log(`📧 Analyzing email content (${message.length} characters) - using GroqGemma rule-based system`);

    const analysisResult = await withRetry(
      async () => contentTagger.analyzeNewsletter(message),
      { ...RETRY_CONFIGS.AI_MODEL, maxRetries: 1 }
    );

    res.json({
      message: {
        content: analysisResult.annotated
      }
    });
  } catch (error) {
    next(error);
  }
});



// Data storage endpoints
app.post('/api/store', validateRequest(['payload']), async (req: Request<{}, {}, StoreRequest>, res: Response, next: NextFunction) => {
  try {
    const { payload } = req.body;
    const id = uuidv4();

    await withRetry(
      async () => {
        await databaseManager.set(id, payload, DATA_TTL);
      },
      RETRY_CONFIGS.STORAGE
    );

    console.log(`💾 Stored data with ID: ${id} (expires in ${DATA_TTL / 1000 / 60} minutes)`);
    res.json({ id });
  } catch (error) {
    next(error);
  }
});

app.get('/api/load', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      throw new ValidationError('Missing or invalid ID parameter', { providedId: id });
    }

    const storedData = await databaseManager.get(id);

    if (!storedData) {
      throw new NotFoundError('Data not found or has expired', { requestedId: id });
    }

    console.log(`📤 Retrieved data with ID: ${id}`);
    res.json({ payload: storedData });
  } catch (error) {
    next(error);
  }
});

app.delete('/api/store', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      throw new ValidationError('Missing or invalid ID parameter', { providedId: id });
    }

    const existed = await databaseManager.delete(id);

    console.log(`🗑️ Deleted data with ID: ${id} (existed: ${existed})`);

    res.json({
      success: true,
      deleted: existed,
      id
    });
  } catch (error) {
    next(error);
  }
});

// Monitoring endpoint
app.post('/api/monitoring', generalRateLimit, (req: Request, res: Response, next: NextFunction) => {
  try {
    const { errors, metrics, usage, sessionId, userId, timestamp } = req.body;

    if (errors && errors.length > 0) {
      console.log(`🚨 Monitoring - Errors received:`, {
        count: errors.length,
        sessionId,
        userId,
        timestamp: new Date(timestamp).toISOString(),
        criticalErrors: errors.filter((e: any) => e.severity === 'critical').length
      });
    }

    if (metrics && metrics.length > 0) {
      console.log(`📊 Monitoring - Metrics received:`, {
        count: metrics.length,
        sessionId,
        userId,
        timestamp: new Date(timestamp).toISOString()
      });
    }

    if (usage && usage.length > 0) {
      console.log(`👤 Monitoring - Usage events received:`, {
        count: usage.length,
        sessionId,
        userId,
        timestamp: new Date(timestamp).toISOString()
      });
    }

    res.json({
      success: true,
      received: {
        errors: errors?.length || 0,
        metrics: metrics?.length || 0,
        usage: usage?.length || 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

// 404 handler for API routes (temporarily disabled for debugging)
// app.use('/api/*', (req: Request, res: Response) => {
//   res.status(404).json({
//     error: 'API endpoint not found',
//     path: req.path,
//     method: req.method,
//     timestamp: new Date().toISOString()
//   });
// });

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API server available at: http://localhost:${PORT}`);
  console.log(`🌐 Frontend should be running on: http://localhost:5173`);
  console.log(`🔧 GMMeditor system active with Grade My Mail fallback`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});