'use client';

/**
 * Demo Usage Storage Operations
 *
 * localStorage operations for tracking API usage.
 */

import {
  loadFromLocalStorage,
  saveToLocalStorage,
} from '@/lib/storage/local-storage-helpers';
import { calculateLLMCost, calculateOCRCost } from './config';
import type { DemoUsage, LLMUsage } from './types';

export const DEMO_USAGE_KEY = 'iolta:demoUsage';

/**
 * Create a new DemoUsage object
 */
export function createDemoUsage(sessionId: string): DemoUsage {
  return {
    sessionId,
    sessionStartedAt: new Date().toISOString(),
    totalInputTokens: 0,
    totalOutputTokens: 0,
    estimatedCostUsd: 0,
    apiCallCount: 0,
    ocrPageCount: 0,
    lastUpdatedAt: new Date().toISOString(),
  };
}

/**
 * Load usage from localStorage
 */
export function loadDemoUsage(): DemoUsage | null {
  return loadFromLocalStorage<DemoUsage>(DEMO_USAGE_KEY, {
    dateFields: ['sessionStartedAt', 'lastUpdatedAt'],
  });
}

/**
 * Save usage to localStorage
 */
export function saveDemoUsage(usage: DemoUsage): boolean {
  return saveToLocalStorage(DEMO_USAGE_KEY, usage);
}

/**
 * Initialize usage if none exists
 */
export function initializeUsage(): DemoUsage {
  const existing = loadDemoUsage();
  if (existing) return existing;

  const sessionId = `demo_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const newUsage = createDemoUsage(sessionId);
  saveDemoUsage(newUsage);
  return newUsage;
}

/**
 * Get or create demo usage for a session
 */
export function getOrCreateDemoUsage(sessionId: string): DemoUsage {
  const existing = loadDemoUsage();
  if (existing && existing.sessionId === sessionId) {
    return existing;
  }

  const newUsage = createDemoUsage(sessionId);
  saveDemoUsage(newUsage);
  return newUsage;
}

/**
 * Track LLM usage
 */
export function trackLLMUsage(usage: LLMUsage): DemoUsage {
  const current = loadDemoUsage() || initializeUsage();
  const cost = calculateLLMCost(usage.inputTokens, usage.outputTokens);

  const updated: DemoUsage = {
    ...current,
    totalInputTokens: current.totalInputTokens + usage.inputTokens,
    totalOutputTokens: current.totalOutputTokens + usage.outputTokens,
    estimatedCostUsd: current.estimatedCostUsd + cost,
    apiCallCount: current.apiCallCount + 1,
    lastUpdatedAt: new Date().toISOString(),
  };

  saveDemoUsage(updated);
  return updated;
}

/**
 * Track OCR usage
 */
export function trackOCRUsage(pageCount: number): DemoUsage {
  const current = loadDemoUsage() || initializeUsage();
  const cost = calculateOCRCost(pageCount);

  const updated: DemoUsage = {
    ...current,
    ocrPageCount: current.ocrPageCount + pageCount,
    estimatedCostUsd: current.estimatedCostUsd + cost,
    lastUpdatedAt: new Date().toISOString(),
  };

  saveDemoUsage(updated);
  return updated;
}

/**
 * Encode usage for sending in request header
 */
export function encodeUsageForHeader(usage: DemoUsage): string {
  return btoa(JSON.stringify(usage));
}

/**
 * Clear demo usage (for testing)
 */
export function clearDemoUsage(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(DEMO_USAGE_KEY);
  }
}
