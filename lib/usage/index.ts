/**
 * Demo Usage Limits
 *
 * Re-exports for usage tracking and limit enforcement.
 */

// Types
export type {
  DemoUsage,
  UsageCheckResult,
  UsageLimitConfig,
  LLMUsage,
} from './types';

// Config
export {
  PRICING,
  WARNING_THRESHOLDS,
  getUsageLimitConfig,
  calculateLLMCost,
  calculateOCRCost,
} from './config';

// Storage (client-only)
export {
  DEMO_USAGE_KEY,
  createDemoUsage,
  loadDemoUsage,
  saveDemoUsage,
  initializeUsage,
  getOrCreateDemoUsage,
  trackLLMUsage,
  trackOCRUsage,
  encodeUsageForHeader,
  clearDemoUsage,
} from './storage';

// Limit Checker (client)
export {
  checkUsageLimits,
  formatTimeRemaining,
  formatCost,
  getLimitExceededMessage,
} from './limit-checker';
