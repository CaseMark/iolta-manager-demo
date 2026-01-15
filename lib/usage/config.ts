/**
 * Demo Usage Limit Configuration
 *
 * Pricing constants and configuration for usage tracking.
 */

import type { UsageLimitConfig } from './types';

// Pricing constants (Claude 3.5 Sonnet + Case.dev OCR)
export const PRICING = {
  // Claude 3.5 Sonnet pricing
  LLM_INPUT_COST_PER_1M_TOKENS: 3, // $3 per 1M input tokens
  LLM_OUTPUT_COST_PER_1M_TOKENS: 15, // $15 per 1M output tokens

  // Case.dev OCR pricing
  OCR_COST_PER_PAGE: 0.02, // $0.02 per page
} as const;

// Warning thresholds
export const WARNING_THRESHOLDS = {
  time: {
    approaching: 0.75, // 75% of session used
    critical: 0.9, // 90% of session used
    nearLimit: 0.95, // 95% of session used
  },
  cost: {
    approaching: 0.5, // 50% of cost limit
    critical: 0.75, // 75% of cost limit
    nearLimit: 0.9, // 90% of cost limit
  },
} as const;

// Default values
const DEFAULT_SESSION_HOURS = 24;
const DEFAULT_PRICE_LIMIT = 5;

/**
 * Get usage limit configuration from environment variables
 */
export function getUsageLimitConfig(): UsageLimitConfig {
  const sessionHours = parseFloat(
    process.env.NEXT_PUBLIC_DEMO_SESSION_HOURS || String(DEFAULT_SESSION_HOURS)
  );
  const maxCostUsd = parseFloat(
    process.env.NEXT_PUBLIC_DEMO_SESSION_PRICE_LIMIT || String(DEFAULT_PRICE_LIMIT)
  );

  return {
    sessionDurationMs: sessionHours * 60 * 60 * 1000,
    maxCostUsd,
  };
}

/**
 * Calculate LLM cost from token counts
 */
export function calculateLLMCost(inputTokens: number, outputTokens: number): number {
  const inputCost = (inputTokens / 1_000_000) * PRICING.LLM_INPUT_COST_PER_1M_TOKENS;
  const outputCost = (outputTokens / 1_000_000) * PRICING.LLM_OUTPUT_COST_PER_1M_TOKENS;
  return inputCost + outputCost;
}

/**
 * Calculate OCR cost from page count
 */
export function calculateOCRCost(pageCount: number): number {
  return pageCount * PRICING.OCR_COST_PER_PAGE;
}
