'use client';

/**
 * Anonymous User Context
 *
 * Provides user isolation for demo mode using localStorage.
 * No authentication required - users get a persistent anonymous ID.
 */

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getAnonymousUserId } from '@/lib/storage/local-storage-helpers';

interface User {
  id: string;
  name: string;
  email: string;
}

interface UserContextType {
  user: User;
  isReady: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

/**
 * Generate a display name from anonymous ID
 */
function generateDisplayName(id: string): string {
  // Use last 4 chars of ID for display
  const suffix = id.slice(-4).toUpperCase();
  return `Demo User ${suffix}`;
}

/**
 * Generate a fake email from anonymous ID
 */
function generateEmail(id: string): string {
  const suffix = id.slice(-8).toLowerCase();
  return `demo-${suffix}@iolta.local`;
}

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Get or create anonymous user ID
    const userId = getAnonymousUserId();

    setUser({
      id: userId,
      name: generateDisplayName(userId),
      email: generateEmail(userId),
    });
    setIsReady(true);
  }, []);

  // Don't render until user is ready
  if (!isReady || !user) {
    return null;
  }

  return (
    <UserContext.Provider value={{ user, isReady }}>
      {children}
    </UserContext.Provider>
  );
}

/**
 * Hook to access the current user
 */
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

/**
 * Hook that mimics useSession for compatibility
 * Returns { data: { user }, isPending }
 */
export function useSession() {
  const context = useContext(UserContext);

  if (context === undefined) {
    return { data: null, isPending: true };
  }

  return {
    data: context.isReady ? { user: context.user } : null,
    isPending: !context.isReady,
  };
}
