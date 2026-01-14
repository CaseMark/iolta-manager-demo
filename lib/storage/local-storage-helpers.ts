/**
 * localStorage Helpers for IOLTA Manager
 *
 * Utilities for storing small state data like session references,
 * preferences, and UI state.
 *
 * @see skills/local-storage/SKILL.md for patterns
 */

const DEBUG = process.env.NODE_ENV === 'development';

// ============================================================================
// Storage Keys
// ============================================================================

export const STORAGE_KEYS = {
  // Auth
  SESSION: 'iolta:session',
  ACTIVE_ORG: 'iolta:activeOrg',
  ANONYMOUS_USER: 'iolta:anonymousUserId',

  // Preferences (per-user)
  PREFERENCES: (userId: string) => `iolta:prefs:${userId}`,

  // UI State
  ACTIVE_MATTER: 'iolta:activeMatter',
  DASHBOARD_STATE: 'iolta:dashboardState',
  SIDEBAR_COLLAPSED: 'iolta:sidebarCollapsed',

  // Version
  STORAGE_VERSION: 'iolta:version',
} as const;

export const STORAGE_VERSION = 1;

// ============================================================================
// Date Serialization
// ============================================================================

/**
 * Serialize dates to ISO strings for storage
 */
export function serializeDates<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  if (obj instanceof Date) {
    return obj.toISOString() as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map(serializeDates) as unknown as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = serializeDates(value);
    }
    return result as T;
  }

  return obj;
}

/**
 * Deserialize ISO strings back to Date objects
 */
export function deserializeDates<T>(obj: T, dateFields: string[] = []): T {
  if (obj === null || obj === undefined) return obj;

  const defaultDateFields = [
    'createdAt',
    'updatedAt',
    'timestamp',
    'expiresAt',
    'openDate',
    'closeDate',
    'releasedAt',
    'generatedAt',
  ];

  const allDateFields = [...new Set([...defaultDateFields, ...dateFields])];

  if (Array.isArray(obj)) {
    return obj.map((item) => deserializeDates(item, dateFields)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (allDateFields.includes(key) && typeof value === 'string') {
        const parsed = new Date(value);
        result[key] = isNaN(parsed.getTime()) ? value : parsed;
      } else if (typeof value === 'object') {
        result[key] = deserializeDates(value, dateFields);
      } else {
        result[key] = value;
      }
    }
    return result as T;
  }

  return obj;
}

// ============================================================================
// Core Operations
// ============================================================================

/**
 * Safe load from localStorage with error handling
 */
export function loadFromLocalStorage<T>(
  key: string,
  options?: {
    dateFields?: string[];
    validator?: (data: unknown) => data is T;
  }
): T | null {
  if (typeof window === 'undefined') return null;

  try {
    const rawData = localStorage.getItem(key);

    if (!rawData) {
      if (DEBUG) {
        console.log(`[Storage] Key "${key}" not found in localStorage`);
      }
      return null;
    }

    const parsed = JSON.parse(rawData);
    const deserialized = deserializeDates<T>(parsed, options?.dateFields);

    if (options?.validator && !options.validator(deserialized)) {
      console.warn(`[Storage] Validation failed for key "${key}"`);
      return null;
    }

    if (DEBUG) {
      console.log(`[Storage] Loaded from "${key}":`, deserialized);
    }

    return deserialized;
  } catch (error) {
    console.error(`[Storage] Failed to load from "${key}":`, error);
    return null;
  }
}

/**
 * Safe save to localStorage with error handling
 */
export function saveToLocalStorage<T>(key: string, data: T): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const serialized = serializeDates(data);
    const jsonString = JSON.stringify(serialized);

    localStorage.setItem(key, jsonString);

    if (DEBUG) {
      console.log(`[Storage] Saved to "${key}":`, {
        data: serialized,
        size: `${(jsonString.length / 1024).toFixed(2)} KB`,
      });
    }

    return true;
  } catch (error) {
    console.error(`[Storage] Failed to save to "${key}":`, error);

    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      console.error('[Storage] localStorage quota exceeded');
    }

    return false;
  }
}

/**
 * Remove a key from localStorage
 */
export function removeFromLocalStorage(key: string): boolean {
  if (typeof window === 'undefined') return false;

  try {
    localStorage.removeItem(key);
    if (DEBUG) {
      console.log(`[Storage] Removed key "${key}"`);
    }
    return true;
  } catch (error) {
    console.error(`[Storage] Failed to remove "${key}":`, error);
    return false;
  }
}

// ============================================================================
// Clear Operations
// ============================================================================

/**
 * Clear all app data from localStorage (prefix: iolta:)
 */
export function clearAllStorageData(): void {
  if (typeof window === 'undefined') return;

  try {
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('iolta:')) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key));

    if (DEBUG) {
      console.log(`[Storage] Cleared ${keysToRemove.length} keys:`, keysToRemove);
    }
  } catch (error) {
    console.error('[Storage] Failed to clear all storage data:', error);
  }
}

/**
 * Clear session data only (for logout)
 */
export function clearSessionStorage(): void {
  removeFromLocalStorage(STORAGE_KEYS.SESSION);
  removeFromLocalStorage(STORAGE_KEYS.ACTIVE_ORG);
}

// ============================================================================
// Anonymous User ID
// ============================================================================

/**
 * Get or create an anonymous user ID for demo mode
 */
export function getAnonymousUserId(): string {
  if (typeof window === 'undefined') return 'anon-server';

  let id = localStorage.getItem(STORAGE_KEYS.ANONYMOUS_USER);

  if (!id) {
    id = `anon-${crypto.randomUUID()}`;
    localStorage.setItem(STORAGE_KEYS.ANONYMOUS_USER, id);
  }

  return id;
}

// ============================================================================
// Cookie Operations (for middleware)
// ============================================================================

/**
 * Set a cookie for middleware to detect auth
 */
export function setAuthCookie(value: string, days: number = 7): void {
  if (typeof document === 'undefined') return;

  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `iolta:local-session=${value}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
}

/**
 * Clear auth cookie (for logout)
 */
export function clearAuthCookie(): void {
  if (typeof document === 'undefined') return;

  document.cookie = 'iolta:local-session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

// ============================================================================
// Storage Diagnostics
// ============================================================================

/**
 * Get storage usage info
 */
export function getStorageInfo(): {
  used: number;
  available: number;
  items: number;
  appItems: number;
} {
  if (typeof window === 'undefined') {
    return { used: 0, available: 0, items: 0, appItems: 0 };
  }

  let used = 0;
  let appItems = 0;

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      if (value) {
        used += key.length + value.length;
      }
      if (key.startsWith('iolta:')) {
        appItems++;
      }
    }
  }

  const available = 5 * 1024 * 1024 - used;

  return {
    used,
    available,
    items: localStorage.length,
    appItems,
  };
}

// ============================================================================
// Version Check
// ============================================================================

/**
 * Check and migrate storage version if needed
 */
export function checkStorageVersion(): void {
  if (typeof window === 'undefined') return;

  try {
    const storedVersion = localStorage.getItem(STORAGE_KEYS.STORAGE_VERSION);
    const currentVersion = storedVersion ? parseInt(storedVersion, 10) : 0;

    if (currentVersion < STORAGE_VERSION) {
      console.log(`[Storage] Migrating from v${currentVersion} to v${STORAGE_VERSION}`);
      // Add migration logic here if needed
      localStorage.setItem(STORAGE_KEYS.STORAGE_VERSION, STORAGE_VERSION.toString());
    }
  } catch (error) {
    console.error('[Storage] Failed to check storage version:', error);
  }
}

// Initialize version check
if (typeof window !== 'undefined') {
  checkStorageVersion();
}
