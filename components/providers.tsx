'use client';

/**
 * Application Providers
 *
 * Wraps the app with all necessary context providers.
 * Currently minimal since auth is not required and
 * the protected layout handles UserProvider/UsageProvider.
 */

import type { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <>{children}</>;
}
