'use client';

/**
 * Auth Context for IOLTA Manager
 *
 * React context providing authentication state and methods.
 * Mirrors Better Auth API surface for easy migration.
 *
 * @see docs/AUTH.md for architecture details
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import {
  getSession,
  signInEmail,
  signUpEmail,
  signOut as localSignOut,
  getOrganizations,
  getActiveOrganization,
  setActiveOrganization,
  createOrganization,
  type SessionData,
  type SignInData,
  type SignUpData,
  type CreateOrgData,
} from './local-auth';
import type { Organization } from '@/types/iolta';

// ============================================================================
// Types
// ============================================================================

interface AuthContextType {
  // Session state
  session: SessionData | null;
  isLoading: boolean;
  error: string | null;

  // Auth methods
  signIn: {
    email: (data: SignInData) => Promise<void>;
  };
  signUp: {
    email: (data: SignUpData) => Promise<void>;
  };
  signOut: () => Promise<void>;

  // Organization state and methods
  activeOrganization: Organization | null;
  organizations: Organization[];
  organization: {
    create: (data: CreateOrgData) => Promise<Organization>;
    setActive: (orgId: string) => Promise<void>;
  };
}

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<SessionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeOrganization, setActiveOrgState] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  // Load session on mount
  useEffect(() => {
    async function loadSession() {
      try {
        const sessionData = await getSession();
        setSession(sessionData);

        if (sessionData) {
          // Load organizations
          const orgs = await getOrganizations(sessionData.user.id);
          setOrganizations(orgs);

          // Load active org
          const activeOrg = await getActiveOrganization();
          setActiveOrgState(activeOrg);
        }
      } catch (err) {
        console.error('[Auth] Failed to load session:', err);
        setError(err instanceof Error ? err.message : 'Failed to load session');
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();

    // Listen for storage events (multi-tab sync)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'iolta:session') {
        loadSession();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Sign in with email
  const signInWithEmail = useCallback(async (data: SignInData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signInEmail(data);
      setSession({
        user: result.user,
        session: result.session,
      });

      // Load organizations
      const orgs = await getOrganizations(result.user.id);
      setOrganizations(orgs);

      const activeOrg = await getActiveOrganization();
      setActiveOrgState(activeOrg);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign in failed';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sign up with email
  const signUpWithEmail = useCallback(async (data: SignUpData) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await signUpEmail(data);
      setSession({
        user: result.user,
        session: result.session,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign up failed';
      setError(message);
      throw new Error(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sign out
  const handleSignOut = useCallback(async () => {
    setIsLoading(true);

    try {
      await localSignOut();
      setSession(null);
      setActiveOrgState(null);
      setOrganizations([]);
    } catch (err) {
      console.error('[Auth] Sign out failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Create organization
  const handleCreateOrg = useCallback(
    async (data: CreateOrgData) => {
      if (!session) throw new Error('Must be logged in');

      const org = await createOrganization(data, session.user.id);
      setOrganizations((prev) => [...prev, org]);
      setActiveOrgState(org);

      return org;
    },
    [session]
  );

  // Set active organization
  const handleSetActiveOrg = useCallback(async (orgId: string) => {
    await setActiveOrganization(orgId);
    const org = await getActiveOrganization();
    setActiveOrgState(org);
  }, []);

  const value: AuthContextType = {
    session,
    isLoading,
    error,
    signIn: {
      email: signInWithEmail,
    },
    signUp: {
      email: signUpWithEmail,
    },
    signOut: handleSignOut,
    activeOrganization,
    organizations,
    organization: {
      create: handleCreateOrg,
      setActive: handleSetActiveOrg,
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Get auth context
 */
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

/**
 * Get session data (Better Auth API compatible)
 */
export function useSession() {
  const { session, isLoading, error } = useAuth();

  return {
    data: session
      ? {
          user: session.user,
          session: {
            ...session.session,
            activeOrganizationId: undefined, // Will be set from activeOrg
          },
        }
      : null,
    isPending: isLoading,
    error: error ? new Error(error) : null,
  };
}

/**
 * Get active organization (Better Auth API compatible)
 */
export function useActiveOrganization() {
  const { activeOrganization, isLoading } = useAuth();

  return {
    data: activeOrganization,
    isPending: isLoading,
  };
}

/**
 * Get list of organizations (Better Auth API compatible)
 */
export function useListOrganizations() {
  const { organizations, isLoading } = useAuth();

  return {
    data: organizations,
    isPending: isLoading,
  };
}
