/**
 * Demo Usage Limit Types
 *
 * Type definitions for tracking API usage and enforcing demo limits.
 */

export interface DemoUsage {
  sessionId: string;
  sessionStartedAt: string; // ISO timestamp
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCostUsd: number; // Running cost estimate
  apiCallCount: number;
  ocrPageCount: number;
  lastUpdatedAt: string;
}

export interface UsageCheckResult {
  isAllowed: boolean;
  reason?: 'time_exceeded' | 'cost_exceeded';
  timeRemaining: number; // milliseconds
  costRemaining: number; // USD
  percentTimeUsed: number; // 0-100
  percentCostUsed: number; // 0-100
  warningLevel: 'none' | 'approaching' | 'critical';
}

export interface UsageLimitConfig {
  sessionDurationMs: number; // Session limit in milliseconds
  maxCostUsd: number; // Maximum cost in USD
}

export interface LLMUsage {
  inputTokens: number;
  outputTokens: number;
}
