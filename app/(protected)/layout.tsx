'use client';

/**
 * App Layout
 *
 * Main layout for the application. Includes sidebar navigation
 * and demo usage tracking. No authentication required.
 */

import { Sidebar } from '@/components/layout/sidebar';
import { UserProvider } from '@/lib/contexts/user-context';
import { UsageProvider } from '@/lib/contexts/usage-context';
import { UsageBanner, LimitExceededDialog } from '@/components/demo';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <UserProvider>
      <UsageProvider>
        <div className="min-h-screen bg-background flex flex-col">
          <Sidebar />
          <div className="lg:pl-64 flex flex-col flex-1">
            <UsageBanner />
            <main className="flex-1">
              <div className="p-6 lg:p-8 pt-16 lg:pt-8">{children}</div>
            </main>
          </div>
          <LimitExceededDialog />
        </div>
      </UsageProvider>
    </UserProvider>
  );
}
