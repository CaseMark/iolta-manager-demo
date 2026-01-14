'use client';

/**
 * Home Page
 *
 * Landing page that redirects authenticated users to the dashboard.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/lib/auth/client';
import { buttonVariants } from '@/components/ui/button';
import { CurrencyDollar, ArrowRight } from '@phosphor-icons/react';

export default function HomePage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();

  useEffect(() => {
    if (!isPending && session) {
      router.push('/dashboard');
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (session) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center">
        {/* Logo */}
        <div className="w-20 h-20 rounded-xl bg-primary flex items-center justify-center mx-auto mb-8">
          <CurrencyDollar size={40} className="text-primary-foreground" weight="bold" />
        </div>

        {/* Title */}
        <h1 className="text-5xl tracking-tight mb-4">
          IOLTA Manager
        </h1>

        {/* Description */}
        <p className="text-xl text-muted-foreground mb-8">
          Trust account management for law firms. Track client funds, generate compliance
          reports, and maintain accurate records.
        </p>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-left">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-1 font-sans">Client & Matter Management</h3>
            <p className="text-sm text-muted-foreground">
              Organize clients and legal matters with their trust balances.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-1 font-sans">Financial Tracking</h3>
            <p className="text-sm text-muted-foreground">
              Record deposits, disbursements, and holds with full audit trail.
            </p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold mb-1 font-sans">Compliance Reports</h3>
            <p className="text-sm text-muted-foreground">
              Generate monthly summaries, client ledgers, and reconciliation reports.
            </p>
          </div>
        </div>

        {/* CTA Buttons */}
        <div className="flex items-center justify-center gap-4">
          <Link href="/signup" className={buttonVariants({ size: 'lg' })}>
            Get Started
            <ArrowRight size={20} className="ml-2" />
          </Link>
          <Link href="/login" className={buttonVariants({ size: 'lg', variant: 'outline' })}>
            Sign In
          </Link>
        </div>

        {/* Demo Note */}
        <p className="text-sm text-muted-foreground mt-8">
          This is a demo application. All data is stored locally in your browser.
        </p>
      </div>
    </div>
  );
}
