/**
 * Demo Usage Limit Checker
 *
 * Client-side limit checking and warning level calculation.
 */

import { getUsageLimitConfig, WARNING_THRESHOLDS } from './config';
import type { DemoUsage, UsageCheckResult, UsageLimitConfig } from './types';

/**
 * Calculate warning level based on usage percentages
 */
function calculateWarningLevel(
  percentTimeUsed: number,
  percentCostUsed: number
): 'none' | 'approaching' | 'critical' {
  const timeCritical = percentTimeUsed >= WARNING_THRESHOLDS.time.critical * 100;
  const costCritical = percentCostUsed >= WARNING_THRESHOLDS.cost.critical * 100;

  if (timeCritical || costCritical) {
    return 'critical';
  }

  const timeApproaching = percentTimeUsed >= WARNING_THRESHOLDS.time.approaching * 100;
  const costApproaching = percentCostUsed >= WARNING_THRESHOLDS.cost.approaching * 100;

  if (timeApproaching || costApproaching) {
    return 'approaching';
  }

  return 'none';
}

/**
 * Check usage limits and return status
 */
export function checkUsageLimits(
  usage: DemoUsage | null,
  config?: UsageLimitConfig
): UsageCheckResult {
  const limits = config || getUsageLimitConfig();

  if (!usage) {
    return {
      isAllowed: true,
      timeRemaining: limits.sessionDurationMs,
      costRemaining: limits.maxCostUsd,
      percentTimeUsed: 0,
      percentCostUsed: 0,
      warningLevel: 'none',
    };
  }

  const now = Date.now();
  const sessionStart = new Date(usage.sessionStartedAt).getTime();
  const timeElapsed = now - sessionStart;

  const timeRemaining = Math.max(0, limits.sessionDurationMs - timeElapsed);
  const percentTimeUsed = Math.min(100, (timeElapsed / limits.sessionDurationMs) * 100);

  const costRemaining = Math.max(0, limits.maxCostUsd - usage.estimatedCostUsd);
  const percentCostUsed = Math.min(100, (usage.estimatedCostUsd / limits.maxCostUsd) * 100);

  // Check if time exceeded
  if (timeRemaining <= 0) {
    return {
      isAllowed: false,
      reason: 'time_exceeded',
      timeRemaining: 0,
      costRemaining,
      percentTimeUsed: 100,
      percentCostUsed,
      warningLevel: 'critical',
    };
  }

  // Check if cost exceeded
  if (costRemaining <= 0) {
    return {
      isAllowed: false,
      reason: 'cost_exceeded',
      timeRemaining,
      costRemaining: 0,
      percentTimeUsed,
      percentCostUsed: 100,
      warningLevel: 'critical',
    };
  }

  const warningLevel = calculateWarningLevel(percentTimeUsed, percentCostUsed);

  return {
    isAllowed: true,
    timeRemaining,
    costRemaining,
    percentTimeUsed,
    percentCostUsed,
    warningLevel,
  };
}

/**
 * Format time remaining as human-readable string
 */
export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Expired';

  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/**
 * Format cost as currency
 */
export function formatCost(usd: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(usd);
}

/**
 * Get appropriate message for limit exceeded state
 */
export function getLimitExceededMessage(reason: 'time_exceeded' | 'cost_exceeded'): string {
  if (reason === 'time_exceeded') {
    return 'Your demo session has expired. Create an account at console.case.dev for unlimited access.';
  }
  return 'You have reached the API usage limit for this demo. Create an account at console.case.dev for unlimited access.';
}
