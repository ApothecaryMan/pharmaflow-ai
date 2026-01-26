import { auditService } from '../services/auditService';

export const measurePerformance = async <T>(
  name: string,
  fn: () => Promise<T> | T,
  slowThresholdMs = 200
): Promise<T> => {
  const start = performance.now();
  try {
    const result = await fn();
    return result;
  } finally {
    const duration = performance.now() - start;
    if (process.env.NODE_ENV === 'development') {
      console.log(`[PERF] ${name}: ${duration.toFixed(2)}ms`);
    }
    
    if (duration > slowThresholdMs) {
      console.warn(`[PERF_SLOW] ${name} took ${duration.toFixed(2)}ms`);
      // Optionally log to audit service or external monitoring
      auditService.log('system.slow_operation', {
        details: `${name} exceeded threshold: ${duration.toFixed(2)}ms`,
        entityId: 'perf_monitor'
      });
    }
  }
};
