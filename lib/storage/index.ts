/**
 * Storage Operations for IOLTA Manager
 *
 * CRUD operations for all entities using IndexedDB.
 * All queries are scoped by userId and organizationId for data isolation.
 *
 * @see skills/database/SKILL.md for patterns
 */

import { getDatabase, isBrowser } from './db';
import type {
  Client,
  NewClient,
  Matter,
  NewMatter,
  Transaction,
  NewTransaction,
  Hold,
  NewHold,
  AuditLog,
  NewAuditLog,
  ReportHistory,
  NewReportHistory,
  TrustAccountSettings,
  NewTrustAccountSettings,
  MatterWithBalance,
  ClientWithMatters,
} from '@/types/iolta';

const DEBUG = process.env.NODE_ENV === 'development';

// ============================================================================
// Client Operations
// ============================================================================

export async function createClient(data: NewClient): Promise<Client> {
  if (!isBrowser()) throw new Error('Storage operations require browser');

  const db = getDatabase();
  const client: Client = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.clients.add(client);

  if (DEBUG) {
    console.log('[Storage] Created client:', { id: client.id, name: client.name });
  }

  return client;
}

export async function getClient(id: string): Promise<Client | undefined> {
  if (!isBrowser()) return undefined;

  const db = getDatabase();
  return db.clients.get(id);
}

export async function getClientsByUser(
  userId: string,
  organizationId?: string
): Promise<Client[]> {
  if (!isBrowser()) return [];

  const db = getDatabase();
  let clients = await db.clients.where('createdBy').equals(userId).toArray();

  if (organizationId) {
    clients = clients.filter((c) => c.organizationId === organizationId);
  }

  return clients.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function updateClient(
  id: string,
  updates: Partial<Omit<Client, 'id' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  if (!isBrowser()) return;

  const db = getDatabase();
  await db.clients.update(id, {
    ...updates,
    updatedAt: new Date(),
  });
}

export async function deleteClient(id: string): Promise<void> {
  if (!isBrowser()) return;

  const db = getDatabase();
  await db.transaction(
    'rw',
    [db.clients, db.matters, db.transactions, db.holds],
    async () => {
      // Get all matters for this client
      const matters = await db.matters.where('clientId').equals(id).toArray();
      const matterIds = matters.map((m) => m.id);

      // Delete related data
      for (const matterId of matterIds) {
        await db.holds.where('matterId').equals(matterId).delete();
        await db.transactions.where('matterId').equals(matterId).delete();
      }

      await db.matters.where('clientId').equals(id).delete();
      await db.clients.delete(id);
    }
  );
}

// ============================================================================
// Matter Operations
// ============================================================================

export async function createMatter(data: NewMatter): Promise<Matter> {
  if (!isBrowser()) throw new Error('Storage operations require browser');

  const db = getDatabase();
  const matter: Matter = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.matters.add(matter);

  if (DEBUG) {
    console.log('[Storage] Created matter:', { id: matter.id, name: matter.name });
  }

  return matter;
}

export async function getMatter(id: string): Promise<Matter | undefined> {
  if (!isBrowser()) return undefined;

  const db = getDatabase();
  return db.matters.get(id);
}

export async function getMattersByUser(
  userId: string,
  organizationId?: string
): Promise<Matter[]> {
  if (!isBrowser()) return [];

  const db = getDatabase();
  let matters = await db.matters.where('createdBy').equals(userId).toArray();

  if (organizationId) {
    matters = matters.filter((m) => m.organizationId === organizationId);
  }

  return matters.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getMattersByClient(clientId: string): Promise<Matter[]> {
  if (!isBrowser()) return [];

  const db = getDatabase();
  return db.matters.where('clientId').equals(clientId).toArray();
}

export async function updateMatter(
  id: string,
  updates: Partial<Omit<Matter, 'id' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  if (!isBrowser()) return;

  const db = getDatabase();
  await db.matters.update(id, {
    ...updates,
    updatedAt: new Date(),
  });
}

export async function deleteMatter(id: string): Promise<void> {
  if (!isBrowser()) return;

  const db = getDatabase();
  await db.transaction('rw', [db.matters, db.transactions, db.holds], async () => {
    await db.holds.where('matterId').equals(id).delete();
    await db.transactions.where('matterId').equals(id).delete();
    await db.matters.delete(id);
  });
}

// ============================================================================
// Transaction Operations
// ============================================================================

export async function createTransaction(data: NewTransaction): Promise<Transaction> {
  if (!isBrowser()) throw new Error('Storage operations require browser');

  const db = getDatabase();
  const transaction: Transaction = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };

  await db.transactions.add(transaction);

  if (DEBUG) {
    console.log('[Storage] Created transaction:', {
      id: transaction.id,
      type: transaction.type,
      amount: transaction.amount,
    });
  }

  return transaction;
}

export async function getTransaction(id: string): Promise<Transaction | undefined> {
  if (!isBrowser()) return undefined;

  const db = getDatabase();
  return db.transactions.get(id);
}

export async function getTransactionsByMatter(matterId: string): Promise<Transaction[]> {
  if (!isBrowser()) return [];

  const db = getDatabase();
  const transactions = await db.transactions.where('matterId').equals(matterId).toArray();
  return transactions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function getTransactionsByUser(
  userId: string,
  organizationId?: string
): Promise<Transaction[]> {
  if (!isBrowser()) return [];

  const db = getDatabase();
  let transactions = await db.transactions.where('createdBy').equals(userId).toArray();

  if (organizationId) {
    transactions = transactions.filter((t) => t.organizationId === organizationId);
  }

  return transactions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function updateTransaction(
  id: string,
  updates: Partial<Omit<Transaction, 'id' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  if (!isBrowser()) return;

  const db = getDatabase();
  await db.transactions.update(id, updates);
}

export async function deleteTransaction(id: string): Promise<void> {
  if (!isBrowser()) return;

  const db = getDatabase();
  await db.transactions.delete(id);
}

// ============================================================================
// Hold Operations
// ============================================================================

export async function createHold(data: NewHold): Promise<Hold> {
  if (!isBrowser()) throw new Error('Storage operations require browser');

  const db = getDatabase();
  const hold: Hold = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date(),
  };

  await db.holds.add(hold);

  if (DEBUG) {
    console.log('[Storage] Created hold:', { id: hold.id, amount: hold.amount });
  }

  return hold;
}

export async function getHold(id: string): Promise<Hold | undefined> {
  if (!isBrowser()) return undefined;

  const db = getDatabase();
  return db.holds.get(id);
}

export async function getHoldsByMatter(matterId: string): Promise<Hold[]> {
  if (!isBrowser()) return [];

  const db = getDatabase();
  return db.holds.where('matterId').equals(matterId).toArray();
}

export async function getHoldsByUser(
  userId: string,
  organizationId?: string
): Promise<Hold[]> {
  if (!isBrowser()) return [];

  const db = getDatabase();
  let holds = await db.holds.where('createdBy').equals(userId).toArray();

  if (organizationId) {
    holds = holds.filter((h) => h.organizationId === organizationId);
  }

  return holds.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function updateHold(
  id: string,
  updates: Partial<Omit<Hold, 'id' | 'createdAt' | 'createdBy'>>
): Promise<void> {
  if (!isBrowser()) return;

  const db = getDatabase();
  await db.holds.update(id, updates);
}

export async function releaseHold(
  id: string,
  releasedBy: string,
  releaseReason: string
): Promise<void> {
  if (!isBrowser()) return;

  const db = getDatabase();
  await db.holds.update(id, {
    status: 'released',
    releasedAt: new Date(),
    releasedBy,
    releaseReason,
  });
}

export async function deleteHold(id: string): Promise<void> {
  if (!isBrowser()) return;

  const db = getDatabase();
  await db.holds.delete(id);
}

// ============================================================================
// Audit Log Operations
// ============================================================================

export async function createAuditLog(data: NewAuditLog): Promise<AuditLog> {
  if (!isBrowser()) throw new Error('Storage operations require browser');

  const db = getDatabase();
  const log: AuditLog = {
    ...data,
    id: crypto.randomUUID(),
    timestamp: new Date(),
  };

  await db.auditLogs.add(log);
  return log;
}

export async function getAuditLogs(
  filters?: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    action?: string;
  },
  limit: number = 100
): Promise<AuditLog[]> {
  if (!isBrowser()) return [];

  const db = getDatabase();
  let logs = await db.auditLogs.toArray();

  if (filters?.entityType) {
    logs = logs.filter((l) => l.entityType === filters.entityType);
  }
  if (filters?.entityId) {
    logs = logs.filter((l) => l.entityId === filters.entityId);
  }
  if (filters?.userId) {
    logs = logs.filter((l) => l.userId === filters.userId);
  }
  if (filters?.action) {
    logs = logs.filter((l) => l.action === filters.action);
  }

  return logs
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

// ============================================================================
// Report History Operations
// ============================================================================

export async function createReportHistory(data: NewReportHistory): Promise<ReportHistory> {
  if (!isBrowser()) throw new Error('Storage operations require browser');

  const db = getDatabase();
  const report: ReportHistory = {
    ...data,
    id: crypto.randomUUID(),
    generatedAt: new Date(),
  };

  await db.reportHistory.add(report);
  return report;
}

export async function getReportHistory(
  userId: string,
  organizationId?: string
): Promise<ReportHistory[]> {
  if (!isBrowser()) return [];

  const db = getDatabase();
  let reports = await db.reportHistory.where('generatedBy').equals(userId).toArray();

  if (organizationId) {
    reports = reports.filter((r) => r.organizationId === organizationId);
  }

  return reports.sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  );
}

// ============================================================================
// Trust Account Settings Operations
// ============================================================================

export async function getTrustAccountSettings(
  userId: string,
  organizationId?: string
): Promise<TrustAccountSettings | undefined> {
  if (!isBrowser()) return undefined;

  const db = getDatabase();
  const settings = await db.trustAccountSettings.toArray();

  return settings.find(
    (s) =>
      s.createdBy === userId &&
      (organizationId ? s.organizationId === organizationId : true)
  );
}

export async function saveTrustAccountSettings(
  data: NewTrustAccountSettings
): Promise<TrustAccountSettings> {
  if (!isBrowser()) throw new Error('Storage operations require browser');

  const db = getDatabase();

  // Check if settings already exist
  const existing = await getTrustAccountSettings(data.createdBy, data.organizationId);

  if (existing) {
    const updated: TrustAccountSettings = {
      ...existing,
      ...data,
      updatedAt: new Date(),
    };
    await db.trustAccountSettings.put(updated);
    return updated;
  }

  const settings: TrustAccountSettings = {
    ...data,
    id: crypto.randomUUID(),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.trustAccountSettings.add(settings);
  return settings;
}

// ============================================================================
// Computed / Aggregated Data
// ============================================================================

/**
 * Get matter with computed balance
 */
export async function getMatterWithBalance(
  matterId: string
): Promise<MatterWithBalance | undefined> {
  if (!isBrowser()) return undefined;

  const db = getDatabase();

  const matter = await db.matters.get(matterId);
  if (!matter) return undefined;

  const transactions = await db.transactions.where('matterId').equals(matterId).toArray();
  const holds = await db.holds
    .where('matterId')
    .equals(matterId)
    .filter((h) => h.status === 'active')
    .toArray();

  const client = await db.clients.get(matter.clientId);

  const totalDeposits = transactions
    .filter((t) => t.type === 'deposit' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalDisbursements = transactions
    .filter((t) => t.type === 'disbursement' && t.status === 'completed')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalHolds = holds.reduce((sum, h) => sum + h.amount, 0);

  const balance = totalDeposits - totalDisbursements;
  const availableBalance = balance - totalHolds;

  return {
    ...matter,
    balance,
    totalDeposits,
    totalDisbursements,
    totalHolds,
    availableBalance,
    client,
  };
}

/**
 * Get all matters with balances for a user
 */
export async function getMattersWithBalances(
  userId: string,
  organizationId?: string
): Promise<MatterWithBalance[]> {
  if (!isBrowser()) return [];

  const matters = await getMattersByUser(userId, organizationId);
  const results: MatterWithBalance[] = [];

  for (const matter of matters) {
    const withBalance = await getMatterWithBalance(matter.id);
    if (withBalance) {
      results.push(withBalance);
    }
  }

  return results;
}

/**
 * Get client with all matters and total balance
 */
export async function getClientWithMatters(
  clientId: string
): Promise<ClientWithMatters | undefined> {
  if (!isBrowser()) return undefined;

  const db = getDatabase();

  const client = await db.clients.get(clientId);
  if (!client) return undefined;

  const mattersList = await db.matters.where('clientId').equals(clientId).toArray();
  const matters: MatterWithBalance[] = [];

  for (const matter of mattersList) {
    const withBalance = await getMatterWithBalance(matter.id);
    if (withBalance) {
      matters.push(withBalance);
    }
  }

  const totalBalance = matters.reduce((sum, m) => sum + m.balance, 0);

  return {
    ...client,
    matters,
    totalBalance,
  };
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(
  userId: string,
  organizationId?: string
): Promise<{
  totalClients: number;
  activeMatters: number;
  totalBalance: number;
  recentTransactions: Transaction[];
  pendingHolds: number;
}> {
  if (!isBrowser()) {
    return {
      totalClients: 0,
      activeMatters: 0,
      totalBalance: 0,
      recentTransactions: [],
      pendingHolds: 0,
    };
  }

  const clients = await getClientsByUser(userId, organizationId);
  const matters = await getMattersWithBalances(userId, organizationId);
  const transactions = await getTransactionsByUser(userId, organizationId);
  const holds = await getHoldsByUser(userId, organizationId);

  return {
    totalClients: clients.length,
    activeMatters: matters.filter((m) => m.status === 'open').length,
    totalBalance: matters.reduce((sum, m) => sum + m.balance, 0),
    recentTransactions: transactions.slice(0, 5),
    pendingHolds: holds.filter((h) => h.status === 'active').length,
  };
}

// ============================================================================
// Helper: Generate unique matter number
// ============================================================================

export async function generateMatterNumber(
  clientId: string,
  prefix: string = ''
): Promise<string> {
  if (!isBrowser()) return `${prefix}001`;

  const db = getDatabase();
  const matters = await db.matters.where('clientId').equals(clientId).toArray();
  const nextNum = matters.length + 1;
  return `${prefix}${String(nextNum).padStart(3, '0')}`;
}
