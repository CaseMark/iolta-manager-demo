'use client';

/**
 * Application Providers
 *
 * Wraps the app with all necessary context providers.
 */

import { AuthProvider } from '@/lib/auth/client';
import type { ReactNode } from 'react';

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return <AuthProvider>{children}</AuthProvider>;
}
