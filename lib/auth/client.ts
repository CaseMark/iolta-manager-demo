/**
 * Auth Client for IOLTA Manager
 *
 * Client-side authentication exports that mirror Better Auth API surface.
 * This enables easy migration between client-side and server-side auth.
 *
 * For client-side (demo) auth: Uses IndexedDB
 * For production: Replace with Better Auth client
 *
 * @see docs/AUTH.md for architecture details
 * @see skills/auth/SKILL.md for Better Auth setup
 */

'use client';

// Re-export hooks from auth context
export {
  AuthProvider,
  useAuth,
  useSession,
  useActiveOrganization,
  useListOrganizations,
} from './auth-context';

// Re-export auth operations (for direct use)
export {
  signInEmail,
  signUpEmail,
  signOut,
  getSession,
  createOrganization,
  getOrganizations,
  getActiveOrganization,
  setActiveOrganization,
} from './local-auth';

// Re-export debug utilities
export {
  listAllUsers,
  deleteUserByEmail,
  clearAllSessions,
  clearAllAuthData,
  validateSessionSync,
} from './local-auth';

// Export a compatible authClient object for direct method access
import { useAuth } from './auth-context';

/**
 * Auth client compatible interface
 *
 * Usage:
 * const { signIn, signOut, organization } = authClient;
 * await signIn.email({ email, password });
 */
export const authClient = {
  get signIn() {
    // This is a getter that returns the signIn methods
    // Note: This won't work outside of React components
    // Use useAuth() hook instead
    throw new Error('Use useAuth() hook to access signIn methods');
  },
  get signUp() {
    throw new Error('Use useAuth() hook to access signUp methods');
  },
  get signOut() {
    throw new Error('Use useAuth() hook to access signOut method');
  },
  get organization() {
    throw new Error('Use useAuth() hook to access organization methods');
  },
};

// For components that need direct access to signIn/signOut functions
import {
  signInEmail as signIn,
  signUpEmail as signUp,
  signOut as signOutFn,
} from './local-auth';

/**
 * Direct sign in function (for use outside of auth context)
 */
export { signIn, signUp, signOutFn };

/**
 * Organization namespace for direct access
 */
export const organization = {
  create: async (data: { name: string; slug: string; logo?: string }, userId: string) => {
    const { createOrganization } = await import('./local-auth');
    return createOrganization(data, userId);
  },
  list: async (userId: string) => {
    const { getOrganizations } = await import('./local-auth');
    return getOrganizations(userId);
  },
  setActive: async (orgId: string) => {
    const { setActiveOrganization } = await import('./local-auth');
    return setActiveOrganization(orgId);
  },
  getActive: async () => {
    const { getActiveOrganization } = await import('./local-auth');
    return getActiveOrganization();
  },
};

/**
 * Two-factor placeholder (not implemented in client-side auth)
 */
export const twoFactor = {
  enable: async () => {
    throw new Error('2FA not available in client-side auth mode');
  },
  disable: async () => {
    throw new Error('2FA not available in client-side auth mode');
  },
  verify: async () => {
    throw new Error('2FA not available in client-side auth mode');
  },
};
