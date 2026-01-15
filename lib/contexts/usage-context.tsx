'use client';

/**
 * Demo Usage Context
 *
 * React context for tracking and displaying usage state.
 */

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  loadDemoUsage,
  initializeUsage,
  trackLLMUsage as trackLLMUsageStorage,
  trackOCRUsage as trackOCRUsageStorage,
  encodeUsageForHeader,
} from '@/lib/usage/storage';
import {
  checkUsageLimits,
  formatTimeRemaining,
  getLimitExceededMessage,
} from '@/lib/usage/limit-checker';
import type { DemoUsage, UsageCheckResult } from '@/lib/usage/types';

interface UsageContextType {
  usage: DemoUsage | null;
  usageCheck: UsageCheckResult;
  isLimitExceeded: boolean;
  warningLevel: 'none' | 'approaching' | 'critical';
  timeRemainingFormatted: string;
  addLLMUsage: (inputTokens: number, outputTokens: number) => void;
  addOCRUsage: (pageCount: number) => void;
  refreshUsage: () => void;
  limitExceededMessage: string | null;
  getUsageHeader: () => string | null;
}

const defaultUsageCheck: UsageCheckResult = {
  isAllowed: true,
  timeRemaining: 24 * 60 * 60 * 1000,
  costRemaining: 5,
  percentTimeUsed: 0,
  percentCostUsed: 0,
  warningLevel: 'none',
};

const UsageContext = createContext<UsageContextType | undefined>(undefined);

export function UsageProvider({ children }: { children: ReactNode }) {
  const [usage, setUsage] = useState<DemoUsage | null>(null);
  const [usageCheck, setUsageCheck] = useState<UsageCheckResult>(defaultUsageCheck);

  // Initialize on mount
  useEffect(() => {
    const currentUsage = loadDemoUsage() || initializeUsage();
    setUsage(currentUsage);
    setUsageCheck(checkUsageLimits(currentUsage));
  }, []);

  // Check periodically for time-based limits (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (usage) {
        setUsageCheck(checkUsageLimits(usage));
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [usage]);

  const refreshUsage = useCallback(() => {
    const currentUsage = loadDemoUsage();
    if (currentUsage) {
      setUsage(currentUsage);
      setUsageCheck(checkUsageLimits(currentUsage));
    }
  }, []);

  const addLLMUsage = useCallback((inputTokens: number, outputTokens: number) => {
    const updated = trackLLMUsageStorage({ inputTokens, outputTokens });
    setUsage(updated);
    setUsageCheck(checkUsageLimits(updated));
  }, []);

  const addOCRUsage = useCallback((pageCount: number) => {
    const updated = trackOCRUsageStorage(pageCount);
    setUsage(updated);
    setUsageCheck(checkUsageLimits(updated));
  }, []);

  const getUsageHeader = useCallback((): string | null => {
    if (!usage) return null;
    return encodeUsageForHeader(usage);
  }, [usage]);

  const isLimitExceeded = !usageCheck.isAllowed;
  const warningLevel = usageCheck.warningLevel;
  const timeRemainingFormatted = formatTimeRemaining(usageCheck.timeRemaining);
  const limitExceededMessage = usageCheck.reason
    ? getLimitExceededMessage(usageCheck.reason)
    : null;

  return (
    <UsageContext.Provider
      value={{
        usage,
        usageCheck,
        isLimitExceeded,
        warningLevel,
        timeRemainingFormatted,
        addLLMUsage,
        addOCRUsage,
        refreshUsage,
        limitExceededMessage,
        getUsageHeader,
      }}
    >
      {children}
    </UsageContext.Provider>
  );
}

export function useUsage() {
  const context = useContext(UsageContext);
  if (context === undefined) {
    throw new Error('useUsage must be used within a UsageProvider');
  }
  return context;
}
