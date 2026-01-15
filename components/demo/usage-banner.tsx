'use client';

/**
 * Usage Warning Banner
 *
 * Displays warning when approaching or exceeding usage limits.
 */

import { useState } from 'react';
import { Warning, Clock, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { useUsage } from '@/lib/contexts/usage-context';
import { formatCost } from '@/lib/usage/limit-checker';
import { cn } from '@/lib/utils';

export function UsageBanner() {
  const { usageCheck, warningLevel, timeRemainingFormatted, isLimitExceeded } = useUsage();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if no warning and not exceeded
  if (warningLevel === 'none' && !isLimitExceeded) return null;

  // Allow dismissing approaching warnings (but not critical or exceeded)
  if (isDismissed && warningLevel === 'approaching' && !isLimitExceeded) return null;

  const isCritical = warningLevel === 'critical' || isLimitExceeded;
  const showTimeWarning = usageCheck.percentTimeUsed >= 75;
  const showCostWarning = usageCheck.percentCostUsed >= 50;

  return (
    <div
      className={cn(
        'border-b px-4 py-2.5 text-sm flex items-center justify-between gap-4',
        warningLevel === 'approaching' && 'bg-amber-50 border-amber-200 text-amber-800',
        isCritical && 'bg-red-50 border-red-200 text-red-800'
      )}
    >
      <div className="flex items-center gap-3">
        <Warning size={18} weight="fill" className="flex-shrink-0" />
        <div className="flex items-center gap-4 flex-wrap">
          {showTimeWarning && (
            <span className="flex items-center gap-1.5">
              <Clock size={14} />
              <span>
                {isLimitExceeded && usageCheck.reason === 'time_exceeded'
                  ? 'Session expired'
                  : `${timeRemainingFormatted} remaining`}
              </span>
            </span>
          )}
          {showCostWarning && (
            <span>
              {isLimitExceeded && usageCheck.reason === 'cost_exceeded'
                ? 'Usage limit reached'
                : `${formatCost(usageCheck.costRemaining)} credit remaining`}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {isCritical && (
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs bg-white/50 hover:bg-white"
            onClick={() => window.open('https://console.case.dev', '_blank')}
          >
            Get Unlimited Access
          </Button>
        )}
        {!isCritical && warningLevel === 'approaching' && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 hover:bg-amber-100"
            onClick={() => setIsDismissed(true)}
          >
            <X size={14} />
          </Button>
        )}
      </div>
    </div>
  );
}
