/**
 * IOLTA Manager Type Definitions
 *
 * Type definitions for the trust account management system.
 * These types mirror the original PostgreSQL schema but work with IndexedDB.
 */

// ============================================================================
// Enums / Constants
// ============================================================================

export type ClientStatus = 'active' | 'inactive';

export type MatterStatus = 'open' | 'closed' | 'pending';

export type TransactionType = 'deposit' | 'disbursement' | 'transfer';

export type TransactionStatus = 'pending' | 'completed' | 'void';

export type HoldType = 'retainer' | 'settlement' | 'escrow' | 'compliance' | 'other';

export type HoldStatus = 'active' | 'released' | 'partial';

export type AuditAction = 'create' | 'update' | 'delete' | 'view' | 'export';

export type ReportType = 'monthly_trust' | 'client_ledger' | 'reconciliation';

export type ReportStatus = 'pending' | 'completed' | 'failed';

// ============================================================================
// Core Data Types
// ============================================================================

/**
 * Client - Law firm clients who have trust accounts
 */
export interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  notes?: string;
  status: ClientStatus;
  createdBy: string;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NewClient = Omit<Client, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Matter - Legal matters/cases linked to clients
 */
export interface Matter {
  id: string;
  clientId: string;
  name: string;
  matterNumber: string;
  description?: string;
  status: MatterStatus;
  practiceArea?: string;
  responsibleAttorney?: string;
  openDate: Date;
  closeDate?: Date;
  createdBy: string;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NewMatter = Omit<Matter, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Transaction - Financial transactions (deposits/disbursements)
 */
export interface Transaction {
  id: string;
  matterId: string;
  type: TransactionType;
  amount: number; // Stored in cents
  description: string;
  payee?: string;
  payor?: string;
  checkNumber?: string;
  reference?: string;
  status: TransactionStatus;
  createdBy: string;
  organizationId?: string;
  createdAt: Date;
}

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt'>;

/**
 * Hold - Funds on hold within a matter
 */
export interface Hold {
  id: string;
  matterId: string;
  amount: number; // Stored in cents
  type: HoldType;
  description: string;
  status: HoldStatus;
  createdBy: string;
  organizationId?: string;
  createdAt: Date;
  releasedAt?: Date;
  releasedBy?: string;
  releaseReason?: string;
}

export type NewHold = Omit<Hold, 'id' | 'createdAt'>;

/**
 * Audit Log - Record of all actions for compliance
 */
export interface AuditLog {
  id: string;
  entityType: 'client' | 'matter' | 'transaction' | 'hold' | 'report' | 'settings';
  entityId: string;
  action: AuditAction;
  details: string; // JSON string with action details
  userId: string;
  userEmail: string;
  ipAddress?: string;
  timestamp: Date;
}

export type NewAuditLog = Omit<AuditLog, 'id' | 'timestamp'>;

/**
 * Report History - Generated compliance reports
 */
export interface ReportHistory {
  id: string;
  reportType: ReportType;
  reportName: string;
  parameters: string; // JSON string with report parameters
  generatedBy: string;
  filePath?: string;
  status: ReportStatus;
  organizationId?: string;
  generatedAt: Date;
}

export type NewReportHistory = Omit<ReportHistory, 'id' | 'generatedAt'>;

/**
 * Trust Account Settings - Firm configuration
 */
export interface TrustAccountSettings {
  id: string;
  firmName: string;
  firmLogo?: string; // Base64 encoded
  bankName: string;
  accountNumber: string; // Only last 4 digits stored
  routingNumber?: string;
  state: string;
  createdBy: string;
  organizationId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NewTrustAccountSettings = Omit<TrustAccountSettings, 'id' | 'createdAt' | 'updatedAt'>;

// ============================================================================
// Auth Types (for client-side auth)
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  createdAt: Date;
}

export interface Member {
  id: string;
  userId: string;
  organizationId: string;
  role: 'owner' | 'admin' | 'member';
  createdAt: Date;
}

// ============================================================================
// Computed / View Types
// ============================================================================

/**
 * Matter with computed balance from transactions
 */
export interface MatterWithBalance extends Matter {
  balance: number;
  totalDeposits: number;
  totalDisbursements: number;
  totalHolds: number;
  availableBalance: number;
  client?: Client;
}

/**
 * Client with related matters
 */
export interface ClientWithMatters extends Client {
  matters: MatterWithBalance[];
  totalBalance: number;
}

/**
 * Transaction with related matter info
 */
export interface TransactionWithMatter extends Transaction {
  matter?: Matter;
  client?: Client;
}

/**
 * Hold with matter info
 */
export interface HoldWithMatter extends Hold {
  matter?: Matter;
  client?: Client;
}

// ============================================================================
// Report Types
// ============================================================================

/**
 * Monthly Trust Summary Report
 */
export interface MonthlyTrustSummary {
  reportDate: Date;
  openingBalance: number;
  totalDeposits: number;
  totalDisbursements: number;
  closingBalance: number;
  matterCount: number;
  transactionCount: number;
  matters: MatterWithBalance[];
}

/**
 * Client Ledger Report
 */
export interface ClientLedgerReport {
  client: Client;
  matter: Matter;
  transactions: Transaction[];
  holds: Hold[];
  openingBalance: number;
  closingBalance: number;
  availableBalance: number;
}

/**
 * Three-Way Reconciliation Report
 */
export interface ReconciliationReport {
  reportDate: Date;
  bankBalance: number;
  ledgerBalance: number;
  clientLedgerTotal: number;
  isReconciled: boolean;
  discrepancy: number;
  matterBalances: Array<{
    matter: Matter;
    balance: number;
  }>;
}

// ============================================================================
// State Types (for localStorage)
// ============================================================================

export interface ActiveMatter {
  id: string;
  name: string;
  matterNumber: string;
  clientName: string;
}

export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system';
  defaultView?: 'dashboard' | 'matters' | 'transactions';
  showInactiveClients?: boolean;
  showClosedMatters?: boolean;
  dateFormat?: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  currencyDisplay?: 'symbol' | 'code';
}

export interface DashboardState {
  selectedPeriod: 'week' | 'month' | 'quarter' | 'year';
  selectedMatterId?: string;
}
