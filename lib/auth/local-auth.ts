/**
 * Client-Side Authentication for IOLTA Manager
 *
 * Implements local authentication using IndexedDB for users/sessions.
 * This mirrors the Better Auth API surface for easy migration to production.
 *
 * @see docs/AUTH.md for architecture details
 */

import { getDatabase, isBrowser } from '@/lib/storage/db';
import {
  STORAGE_KEYS,
  saveToLocalStorage,
  loadFromLocalStorage,
  removeFromLocalStorage,
  setAuthCookie,
  clearAuthCookie,
} from '@/lib/storage/local-storage-helpers';
import type { User, Session, Organization, Member } from '@/types/iolta';

// ============================================================================
// Password Hashing (SHA-256 via Web Crypto API)
// ============================================================================

async function hashPassword(password: string): Promise<string> {
  // Ensure we're in a secure context with Web Crypto API available
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) {
    throw new Error(
      'Web Crypto API is not available. Please ensure you are accessing the app via localhost or HTTPS.'
    );
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================================
// Token Generation
// ============================================================================

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ============================================================================
// Session Reference (stored in localStorage)
// ============================================================================

interface SessionRef {
  sessionId: string;
  token: string;
  activeOrgId?: string;
}

function getSessionRef(): SessionRef | null {
  return loadFromLocalStorage<SessionRef>(STORAGE_KEYS.SESSION);
}

function setSessionRef(ref: SessionRef): void {
  saveToLocalStorage(STORAGE_KEYS.SESSION, ref);
  setAuthCookie(ref.token, 7);
}

function clearSessionRef(): void {
  removeFromLocalStorage(STORAGE_KEYS.SESSION);
  clearAuthCookie();
}

// ============================================================================
// Sign Up
// ============================================================================

export interface SignUpData {
  email: string;
  password: string;
  name: string;
}

export interface SignUpResult {
  user: User;
  session: Session;
}

export async function signUpEmail(data: SignUpData): Promise<SignUpResult> {
  if (!isBrowser()) throw new Error('Auth operations require browser');

  const db = getDatabase();
  const { email, password, name } = data;

  // Check if email already exists
  const existingUser = await db.users.where('email').equals(email.toLowerCase()).first();
  if (existingUser) {
    throw new Error('Email already registered');
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user
  const user: User = {
    id: crypto.randomUUID(),
    email: email.toLowerCase(),
    name,
    passwordHash,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.users.add(user);

  // Create session
  const token = generateToken();
  const session: Session = {
    id: crypto.randomUUID(),
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    createdAt: new Date(),
  };

  await db.sessions.add(session);

  // Store session reference
  setSessionRef({ sessionId: session.id, token });

  return { user, session };
}

// ============================================================================
// Sign In
// ============================================================================

export interface SignInData {
  email: string;
  password: string;
}

export async function signInEmail(data: SignInData): Promise<SignUpResult> {
  if (!isBrowser()) throw new Error('Auth operations require browser');

  const db = getDatabase();
  const { email, password } = data;

  // Find user
  const user = await db.users.where('email').equals(email.toLowerCase()).first();
  if (!user) {
    throw new Error('Invalid email or password');
  }

  // Verify password
  const passwordHash = await hashPassword(password);
  if (passwordHash !== user.passwordHash) {
    throw new Error('Invalid email or password');
  }

  // Create new session
  const token = generateToken();
  const session: Session = {
    id: crypto.randomUUID(),
    userId: user.id,
    token,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    createdAt: new Date(),
  };

  await db.sessions.add(session);

  // Store session reference
  setSessionRef({ sessionId: session.id, token });

  return { user, session };
}

// ============================================================================
// Sign Out
// ============================================================================

export async function signOut(): Promise<void> {
  if (!isBrowser()) return;

  const db = getDatabase();
  const sessionRef = getSessionRef();

  if (sessionRef) {
    await db.sessions.delete(sessionRef.sessionId);
  }

  clearSessionRef();

  // Dispatch storage event for multi-tab sync
  window.dispatchEvent(
    new StorageEvent('storage', {
      key: STORAGE_KEYS.SESSION,
    })
  );
}

// ============================================================================
// Get Session
// ============================================================================

export interface SessionData {
  user: Omit<User, 'passwordHash'>;
  session: Session;
}

export async function getSession(): Promise<SessionData | null> {
  if (!isBrowser()) return null;

  const db = getDatabase();
  const sessionRef = getSessionRef();

  if (!sessionRef) {
    return null;
  }

  // Fetch session from IndexedDB
  const session = await db.sessions.get(sessionRef.sessionId);

  if (!session) {
    clearSessionRef();
    return null;
  }

  // Verify token matches
  if (session.token !== sessionRef.token) {
    clearSessionRef();
    return null;
  }

  // Check expiration
  if (new Date(session.expiresAt) < new Date()) {
    await db.sessions.delete(session.id);
    clearSessionRef();
    return null;
  }

  // Fetch user
  const user = await db.users.get(session.userId);

  if (!user) {
    await db.sessions.delete(session.id);
    clearSessionRef();
    return null;
  }

  // Refresh cookie expiry
  setAuthCookie(session.token, 7);

  // Return user without password hash
  const { passwordHash: _, ...safeUser } = user;

  return {
    user: safeUser as Omit<User, 'passwordHash'>,
    session,
  };
}

// ============================================================================
// Organization Operations
// ============================================================================

export interface CreateOrgData {
  name: string;
  slug: string;
  logo?: string;
}

export async function createOrganization(
  data: CreateOrgData,
  userId: string
): Promise<Organization> {
  if (!isBrowser()) throw new Error('Auth operations require browser');

  const db = getDatabase();

  // Check if slug already exists
  const existing = await db.organizations.where('slug').equals(data.slug).first();
  if (existing) {
    throw new Error('Organization slug already taken');
  }

  // Create organization
  const org: Organization = {
    id: crypto.randomUUID(),
    name: data.name,
    slug: data.slug,
    logo: data.logo,
    createdAt: new Date(),
  };

  await db.organizations.add(org);

  // Create membership (owner)
  const member: Member = {
    id: crypto.randomUUID(),
    userId,
    organizationId: org.id,
    role: 'owner',
    createdAt: new Date(),
  };

  await db.members.add(member);

  // Set as active org
  const sessionRef = getSessionRef();
  if (sessionRef) {
    setSessionRef({ ...sessionRef, activeOrgId: org.id });
  }

  return org;
}

export async function getOrganizations(userId: string): Promise<Organization[]> {
  if (!isBrowser()) return [];

  const db = getDatabase();

  // Get memberships
  const memberships = await db.members.where('userId').equals(userId).toArray();
  const orgIds = memberships.map((m) => m.organizationId);

  // Get organizations
  const orgs: Organization[] = [];
  for (const id of orgIds) {
    const org = await db.organizations.get(id);
    if (org) orgs.push(org);
  }

  return orgs;
}

export async function getActiveOrganization(): Promise<Organization | null> {
  if (!isBrowser()) return null;

  const sessionRef = getSessionRef();
  if (!sessionRef?.activeOrgId) return null;

  const db = getDatabase();
  return (await db.organizations.get(sessionRef.activeOrgId)) || null;
}

export async function setActiveOrganization(orgId: string): Promise<void> {
  if (!isBrowser()) return;

  const sessionRef = getSessionRef();
  if (sessionRef) {
    setSessionRef({ ...sessionRef, activeOrgId: orgId });
  }
}

// ============================================================================
// Debug/Admin Utilities
// ============================================================================

export async function listAllUsers(): Promise<Omit<User, 'passwordHash'>[]> {
  if (!isBrowser()) return [];

  const db = getDatabase();
  const users = await db.users.toArray();

  return users.map(({ passwordHash: _, ...user }) => user as Omit<User, 'passwordHash'>);
}

export async function deleteUserByEmail(email: string): Promise<void> {
  if (!isBrowser()) return;

  const db = getDatabase();

  const user = await db.users.where('email').equals(email.toLowerCase()).first();
  if (!user) return;

  await db.transaction('rw', [db.users, db.sessions, db.members], async () => {
    await db.sessions.where('userId').equals(user.id).delete();
    await db.members.where('userId').equals(user.id).delete();
    await db.users.delete(user.id);
  });
}

export async function clearAllSessions(): Promise<void> {
  if (!isBrowser()) return;

  const db = getDatabase();
  await db.sessions.clear();
  clearSessionRef();
}

export async function clearAllAuthData(): Promise<void> {
  if (!isBrowser()) return;

  const db = getDatabase();
  await db.transaction(
    'rw',
    [db.users, db.sessions, db.organizations, db.members],
    async () => {
      await db.sessions.clear();
      await db.members.clear();
      await db.organizations.clear();
      await db.users.clear();
    }
  );
  clearSessionRef();
}

export async function validateSessionSync(): Promise<{
  valid: boolean;
  details: Record<string, unknown>;
}> {
  if (!isBrowser()) return { valid: false, details: { error: 'Not in browser' } };

  const sessionRef = getSessionRef();
  const db = getDatabase();

  const details: Record<string, unknown> = {
    hasLocalStorageRef: !!sessionRef,
    sessionId: sessionRef?.sessionId,
  };

  if (!sessionRef) {
    return { valid: false, details };
  }

  const session = await db.sessions.get(sessionRef.sessionId);
  details.hasIndexedDBSession = !!session;
  details.tokenMatch = session?.token === sessionRef.token;
  details.notExpired = session ? new Date(session.expiresAt) > new Date() : false;

  if (session) {
    const user = await db.users.get(session.userId);
    details.hasUser = !!user;
  }

  const valid =
    !!session &&
    session.token === sessionRef.token &&
    new Date(session.expiresAt) > new Date();

  return { valid, details };
}
