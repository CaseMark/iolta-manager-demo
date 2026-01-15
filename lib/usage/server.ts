/**
 * Demo Usage Server Utilities
 *
 * Server-side utilities for API route protection.
 */

import { getUsageLimitConfig, WARNING_THRESHOLDS, calculateLLMCost } from './config';
import type { DemoUsage, UsageCheckResult, UsageLimitConfig } from './types';

/**
 * Parse usage from X-Demo-Usage header
 */
export function parseUsageFromRequest(request: Request): DemoUsage | null {
  try {
    const usageHeader = request.headers.get('X-Demo-Usage');
    if (!usageHeader) return null;

    const decoded = Buffer.from(usageHeader, 'base64').toString('utf-8');
    return JSON.parse(decoded) as DemoUsage;
  } catch {
    return null;
  }
}

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
 * Check usage limits server-side
 */
export function checkUsageLimitsServer(
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
 * Calculate LLM cost server-side
 */
export function calculateLLMCostServer(inputTokens: number, outputTokens: number): number {
  return calculateLLMCost(inputTokens, outputTokens);
}

/**
 * Create JSON response for limit exceeded
 */
export function createLimitExceededResponse(usageCheck: UsageCheckResult) {
  return {
    error: 'Demo limit exceeded',
    reason: usageCheck.reason,
    message:
      usageCheck.reason === 'time_exceeded'
        ? 'Your demo session has expired.'
        : 'You have reached the API usage limit for this demo.',
    redirectUrl: 'https://console.case.dev',
  };
}
