// Production-ready rate limiting system
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

// Multi-tier rate limiting for production
export interface RateLimitTier {
  name: string;
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Production rate limit tiers
export const PRODUCTION_RATE_LIMITS: Record<string, RateLimitTier[]> = {
  // Free tier users
  free: [
    { name: 'burst', windowMs: 60 * 1000, maxRequests: 10 }, // 10 per minute
    { name: 'hourly', windowMs: 60 * 60 * 1000, maxRequests: 100 }, // 100 per hour
    { name: 'daily', windowMs: 24 * 60 * 60 * 1000, maxRequests: 500 }, // 500 per day
  ],
  
  // Premium users
  premium: [
    { name: 'burst', windowMs: 60 * 1000, maxRequests: 30 }, // 30 per minute
    { name: 'hourly', windowMs: 60 * 60 * 1000, maxRequests: 500 }, // 500 per hour
    { name: 'daily', windowMs: 24 * 60 * 60 * 1000, maxRequests: 2000 }, // 2000 per day
  ],
  
  // Enterprise users
  enterprise: [
    { name: 'burst', windowMs: 60 * 1000, maxRequests: 100 }, // 100 per minute
    { name: 'hourly', windowMs: 60 * 60 * 1000, maxRequests: 2000 }, // 2000 per hour
    { name: 'daily', windowMs: 24 * 60 * 60 * 1000, maxRequests: 10000 }, // 10000 per day
  ]
};

// User-based rate limiting (requires authentication)
export class ProductionRateLimiter {
  private redis: Redis;
  
  constructor(redisUrl?: string) {
    this.redis = new Redis(redisUrl || process.env.REDIS_URL || 'redis://localhost:6379');
  }

  // Create middleware for user-based rate limiting
  createUserRateLimit(tiers: RateLimitTier[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        // Get user ID from authentication (you'll need to implement this)
        const userId = this.getUserId(req);
        const userTier = this.getUserTier(req); // 'free', 'premium', 'enterprise'
        
        if (!userId) {
          // Fall back to IP-based limiting for anonymous users
          return this.createIPRateLimit(PRODUCTION_RATE_LIMITS.free)(req, res, next);
        }

        const userTiers = PRODUCTION_RATE_LIMITS[userTier] || PRODUCTION_RATE_LIMITS.free;
        
        // Check all rate limit tiers
        for (const tier of userTiers) {
          const key = `rate_limit:${userId}:${tier.name}`;
          const current = await this.redis.get(key);
          const count = current ? parseInt(current) : 0;
          
          if (count >= tier.maxRequests) {
            const ttl = await this.redis.ttl(key);
            return res.status(429).json({
              error: 'Rate limit exceeded',
              tier: tier.name,
              limit: tier.maxRequests,
              window: tier.windowMs,
              resetIn: ttl,
              userTier,
              upgradeMessage: userTier === 'free' ? 'Upgrade to premium for higher limits' : undefined
            });
          }
        }

        // Increment counters for all tiers
        const pipeline = this.redis.pipeline();
        for (const tier of userTiers) {
          const key = `rate_limit:${userId}:${tier.name}`;
          pipeline.incr(key);
          pipeline.expire(key, Math.ceil(tier.windowMs / 1000));
        }
        await pipeline.exec();

        next();
      } catch (error) {
        console.error('Rate limiting error:', error);
        // Fail open - allow request if rate limiting fails
        next();
      }
    };
  }

  // Fallback IP-based rate limiting
  createIPRateLimit(tiers: RateLimitTier[]) {
    return async (req: Request, res: Response, next: NextFunction) => {
      const ip = this.getClientIP(req);
      
      for (const tier of tiers) {
        const key = `rate_limit:ip:${ip}:${tier.name}`;
        const current = await this.redis.get(key);
        const count = current ? parseInt(current) : 0;
        
        if (count >= tier.maxRequests) {
          const ttl = await this.redis.ttl(key);
          return res.status(429).json({
            error: 'Rate limit exceeded',
            tier: tier.name,
            limit: tier.maxRequests,
            window: tier.windowMs,
            resetIn: ttl,
            message: 'Sign up for higher rate limits'
          });
        }
      }

      // Increment counters
      const pipeline = this.redis.pipeline();
      for (const tier of tiers) {
        const key = `rate_limit:ip:${ip}:${tier.name}`;
        pipeline.incr(key);
        pipeline.expire(key, Math.ceil(tier.windowMs / 1000));
      }
      await pipeline.exec();

      next();
    };
  }

  private getUserId(req: Request): string | null {
    // Implement your authentication logic here
    // This could be from JWT token, session, API key, etc.
    return req.headers['x-user-id'] as string || null;
  }

  private getUserTier(req: Request): string {
    // Implement your user tier logic here
    // This could be from database, JWT claims, etc.
    return req.headers['x-user-tier'] as string || 'free';
  }

  private getClientIP(req: Request): string {
    return (
      req.headers['cf-connecting-ip'] || // Cloudflare
      req.headers['x-forwarded-for'] || // Standard proxy header
      req.headers['x-real-ip'] || // Nginx
      req.connection.remoteAddress ||
      req.socket.remoteAddress ||
      'unknown'
    ) as string;
  }
}

// AI-specific rate limiting with cost awareness
export class AIRateLimiter extends ProductionRateLimiter {
  private costPerRequest: number;
  private maxDailyCost: Record<string, number>;

  constructor(redisUrl?: string) {
    super(redisUrl);
    this.costPerRequest = parseFloat(process.env.AI_COST_PER_REQUEST || '0.01');
    this.maxDailyCost = {
      free: 1.00, // $1 per day
      premium: 10.00, // $10 per day
      enterprise: 100.00 // $100 per day
    };
  }

  createAIRateLimit() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const userId = this.getUserId(req);
      const userTier = this.getUserTier(req);
      
      if (userId) {
        // Check cost-based limiting
        const costKey = `ai_cost:${userId}:daily`;
        const currentCost = parseFloat(await this.redis.get(costKey) || '0');
        const maxCost = this.maxDailyCost[userTier] || this.maxDailyCost.free;
        
        if (currentCost + this.costPerRequest > maxCost) {
          return res.status(429).json({
            error: 'Daily AI cost limit exceeded',
            currentCost: currentCost.toFixed(2),
            maxCost: maxCost.toFixed(2),
            costPerRequest: this.costPerRequest.toFixed(2),
            upgradeMessage: userTier === 'free' ? 'Upgrade for higher AI usage limits' : undefined
          });
        }

        // Track the cost
        await this.redis.incrbyfloat(costKey, this.costPerRequest);
        await this.redis.expire(costKey, 24 * 60 * 60); // 24 hours
      }

      // Apply regular rate limiting
      const rateLimitTiers = PRODUCTION_RATE_LIMITS[userTier] || PRODUCTION_RATE_LIMITS.free;
      return this.createUserRateLimit(rateLimitTiers)(req, res, next);
    };
  }
}