/**
 * IndexedDB Database Schema for IOLTA Manager
 *
 * Uses Dexie.js for a cleaner API over raw IndexedDB.
 * All data is stored client-side in the browser.
 *
 * @see skills/database/SKILL.md for patterns
 */

import Dexie, { type EntityTable } from 'dexie';
import type {
  Client,
  Matter,
  Transaction,
  Hold,
  AuditLog,
  ReportHistory,
  TrustAccountSettings,
  User,
  Session,
  Organization,
  Member,
} from '@/types/iolta';

/**
 * IOLTA Manager Database
 *
 * Tables:
 * - clients: Law firm clients
 * - matters: Legal matters/cases
 * - transactions: Financial transactions
 * - holds: Trust fund holds
 * - auditLogs: Action history for compliance
 * - reportHistory: Generated reports
 * - trustAccountSettings: Firm configuration
 * - users: User accounts (client-side auth)
 * - sessions: Auth sessions
 * - organizations: Firms/organizations
 * - members: Org memberships
 */
class IOLTADatabase extends Dexie {
  // Typed table declarations
  clients!: EntityTable<Client, 'id'>;
  matters!: EntityTable<Matter, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;
  holds!: EntityTable<Hold, 'id'>;
  auditLogs!: EntityTable<AuditLog, 'id'>;
  reportHistory!: EntityTable<ReportHistory, 'id'>;
  trustAccountSettings!: EntityTable<TrustAccountSettings, 'id'>;
  users!: EntityTable<User, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  organizations!: EntityTable<Organization, 'id'>;
  members!: EntityTable<Member, 'id'>;

  constructor() {
    super('IOLTAManager');

    this.version(1).stores({
      // Clients: indexed by user scope and status
      clients: 'id, createdBy, organizationId, status, name, createdAt',

      // Matters: indexed by client, user, and status
      matters: 'id, clientId, createdBy, organizationId, status, matterNumber, openDate',

      // Transactions: indexed by matter and type
      transactions: 'id, matterId, createdBy, organizationId, type, status, createdAt',

      // Holds: indexed by matter and status
      holds: 'id, matterId, createdBy, organizationId, status, type, createdAt',

      // Audit logs: indexed by entity and action
      auditLogs: 'id, entityType, entityId, action, userId, timestamp',

      // Report history: indexed by type and date
      reportHistory: 'id, reportType, generatedBy, organizationId, status, generatedAt',

      // Trust account settings: one per org
      trustAccountSettings: 'id, createdBy, organizationId',

      // Auth tables
      users: 'id, email',
      sessions: 'id, userId, token, expiresAt',
      organizations: 'id, slug',
      members: 'id, userId, organizationId',
    });
  }
}

// Singleton database instance
let dbInstance: IOLTADatabase | null = null;

/**
 * Get the database instance (singleton pattern)
 */
export function getDatabase(): IOLTADatabase {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in the browser');
  }

  if (!dbInstance) {
    dbInstance = new IOLTADatabase();
  }

  return dbInstance;
}

/**
 * Check if running in browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Reset the entire database (for testing or user-initiated clear)
 */
export async function resetDatabase(): Promise<void> {
  if (!isBrowser()) return;

  const db = getDatabase();
  await db.delete();
  dbInstance = null;
}

/**
 * Clear all app data (keeps auth data)
 */
export async function clearAppData(): Promise<void> {
  if (!isBrowser()) return;

  const db = getDatabase();
  await db.transaction(
    'rw',
    [
      db.clients,
      db.matters,
      db.transactions,
      db.holds,
      db.auditLogs,
      db.reportHistory,
      db.trustAccountSettings,
    ],
    async () => {
      await db.clients.clear();
      await db.matters.clear();
      await db.transactions.clear();
      await db.holds.clear();
      await db.auditLogs.clear();
      await db.reportHistory.clear();
      await db.trustAccountSettings.clear();
    }
  );
}

/**
 * Clear all auth data (keeps app data)
 */
export async function clearAuthData(): Promise<void> {
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
}

export { IOLTADatabase };
export const db = typeof window !== 'undefined' ? getDatabase() : null;
