'use client';

/**
 * Limit Exceeded Dialog
 *
 * Modal shown when demo limits are exceeded.
 */

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useUsage } from '@/lib/contexts/usage-context';
import { Clock, CurrencyDollar, ArrowSquareOut } from '@phosphor-icons/react';

export function LimitExceededDialog() {
  const { isLimitExceeded, limitExceededMessage, usageCheck } = useUsage();

  if (!isLimitExceeded) return null;

  const isTimeExceeded = usageCheck.reason === 'time_exceeded';

  return (
    <AlertDialog open={true}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="mx-auto w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-2">
            {isTimeExceeded ? (
              <Clock size={24} className="text-red-600" weight="fill" />
            ) : (
              <CurrencyDollar size={24} className="text-red-600" weight="fill" />
            )}
          </div>
          <AlertDialogTitle className="text-center">
            {isTimeExceeded ? 'Demo Session Expired' : 'Usage Limit Reached'}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {limitExceededMessage}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
          <p className="font-medium">With a Case.dev account you get:</p>
          <ul className="space-y-1 text-muted-foreground">
            <li>Unlimited document extraction</li>
            <li>Full OCR processing for PDFs</li>
            <li>Priority API access</li>
            <li>Usage analytics and history</li>
          </ul>
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => (window.location.href = '/dashboard')}
          >
            View Past Results
          </Button>
          <AlertDialogAction
            className="w-full sm:w-auto"
            onClick={() => window.open('https://console.case.dev', '_blank')}
          >
            <ArrowSquareOut size={16} className="mr-2" />
            Create Account
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
