import { FastifyRequest, FastifyReply } from 'fastify';

export interface PerformanceMetrics {
  requestId: string;
  method: string;
  url: string;
  startTime: bigint;
  endTime?: bigint;
  duration?: number;
  statusCode?: number;
  memoryUsage?: NodeJS.MemoryUsage;
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();

  /**
   * Middleware to track request performance
   */
  public trackRequest() {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      const requestId = this.generateRequestId();
      const startTime = process.hrtime.bigint();
      
      // Store initial metrics
      this.metrics.set(requestId, {
        requestId,
        method: request.method,
        url: request.url,
        startTime,
        memoryUsage: process.memoryUsage()
      });

      // Add request ID to request object for later use
      (request as any).performanceId = requestId;

      // Use Fastify's onResponse hook
      reply.raw.on('finish', () => {
        const endTime = process.hrtime.bigint();
        const metrics = this.metrics.get(requestId);
        
        if (metrics) {
          metrics.endTime = endTime;
          metrics.duration = Number(endTime - startTime) / 1000000; // Convert to milliseconds
          metrics.statusCode = reply.statusCode;
          metrics.memoryUsage = process.memoryUsage();
          
          // Log performance data
          this.logPerformance(metrics);
          
          // Clean up
          this.metrics.delete(requestId);
        }
      });
    };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log performance metrics
   */
  private logPerformance(metrics: PerformanceMetrics) {
    const logData = {
      requestId: metrics.requestId,
      method: metrics.method,
      url: metrics.url,
      duration: metrics.duration,
      statusCode: metrics.statusCode,
      memoryUsage: metrics.memoryUsage,
      timestamp: new Date().toISOString()
    };

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 Performance: ${metrics.method} ${metrics.url} - ${metrics.duration?.toFixed(2)}ms`);
    }

    // You can also send to external monitoring service here
    // this.sendToMonitoringService(logData);
  }

  /**
   * Get current performance statistics
   */
  public getStats() {
    const activeRequests = this.metrics.size;
    const memoryUsage = process.memoryUsage();
    
    return {
      activeRequests,
      memoryUsage,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Clear all metrics (useful for testing)
   */
  public clear() {
    this.metrics.clear();
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor(); 