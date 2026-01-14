/**
 * Comprehensive Extraction Types
 *
 * Types for AI-extracted matter, transaction, and hold data.
 * Supports detailed legal document extraction including settlements,
 * transaction histories, and hold management.
 */

// ============================================================================
// Transaction Extraction Types
// ============================================================================

export type ExtractedTransactionCategory =
  | 'settlement_funds'
  | 'legal_fees'
  | 'case_costs'
  | 'medical_lien'
  | 'subrogation'
  | 'client_distribution'
  | 'structured_settlement'
  | 'retainer'
  | 'refund'
  | 'other';

export interface ExtractedTransaction {
  transactionId: string | null;
  date: string | null;
  type: 'deposit' | 'disbursement';
  category: ExtractedTransactionCategory;
  description: string;
  amount: number;
  payee: string | null;
  payor: string | null;
  paymentMethod: string | null;
  checkNumber: string | null;
  reference: string | null;
  balanceAfter: number | null;
  recordedBy: string | null;
  approvedBy: string | null;
  // For liens/subrogation
  originalAmount: number | null;
  negotiatedAmount: number | null;
  savings: number | null;
}

// ============================================================================
// Hold Extraction Types
// ============================================================================

export type ExtractedHoldType =
  | 'lien_reserve'
  | 'structured_settlement'
  | 'attorney_lien'
  | 'escrow'
  | 'compliance'
  | 'retainer'
  | 'other';

export type ExtractedHoldStatus = 'active' | 'released' | 'partial';

export interface ExtractedHold {
  holdId: string | null;
  status: ExtractedHoldStatus;
  holdType: ExtractedHoldType;
  amount: number;
  description: string;
  createdDate: string | null;
  createdBy: string | null;
  expectedReleaseDate: string | null;
  releaseConditions: string | null;
  releasedDate: string | null;
  releasedBy: string | null;
  notes: string | null;
}

// ============================================================================
// Settlement Breakdown Types
// ============================================================================

export interface CostItem {
  description: string;
  amount: number;
}

export interface LienItem {
  creditor: string;
  originalAmount: number;
  negotiatedAmount: number;
  savings: number;
}

export interface ExtractedSettlementBreakdown {
  grossSettlement: number | null;
  attorneyFees: number | null;
  attorneyFeePercentage: number | null;
  caseCosts: number | null;
  caseCostItems: CostItem[];
  medicalLiensTotal: number | null;
  medicalLienItems: LienItem[];
  subrogationTotal: number | null;
  subrogationItems: LienItem[];
  clientDistribution: number | null;
  structuredSettlementAmount: number | null;
  pendingLiens: number | null;
  pendingLienDescription: string | null;
}

// ============================================================================
// Financial Summary Types
// ============================================================================

export interface ExtractedFinancialSummary {
  trustBalance: number | null;
  totalDeposits: number | null;
  totalDisbursements: number | null;
  activeHolds: number | null;
  availableBalance: number | null;
}

// ============================================================================
// Comprehensive Matter Extraction Types
// ============================================================================

export type ExtractedMatterType =
  | 'Personal Injury'
  | 'Family Law'
  | 'Real Estate'
  | 'Estate Planning'
  | 'Criminal Defense'
  | 'Business/Corporate'
  | 'Employment Law'
  | 'Immigration'
  | 'Intellectual Property'
  | 'Bankruptcy'
  | 'Medical Malpractice'
  | 'Workers Compensation'
  | 'Other';

export type ExtractedMatterStatus = 'active' | 'pending' | 'settled' | 'closed';

export type ExtractedBillingType = 'hourly' | 'contingency' | 'flat_fee' | 'retainer';

export interface ExtractedMatterInfo {
  // Basic Matter Info
  matterId: string | null;
  matterNumber: string | null;
  matterName: string | null;
  matterType: ExtractedMatterType | null;
  description: string | null;
  status: ExtractedMatterStatus | null;
  openDate: string | null;

  // Client Info
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  clientAddress: string | null;

  // Attorney Info
  responsibleAttorney: string | null;
  billingAttorney: string | null;

  // Billing Info
  billingType: ExtractedBillingType | null;
  billingRate: string | null;
  contingencyPercentage: number | null;
  retainerAmount: number | null;

  // Court Info
  court: string | null;
  courtCaseNumber: string | null;
  jurisdiction: string | null;

  // Opposing Party Info
  opposingParty: string | null;
  opposingCounsel: string | null;

  // Important Dates
  statuteOfLimitations: string | null;
  settlementDate: string | null;
  trialDate: string | null;

  // Settlement Info
  settlementAmount: number | null;
  settlementBreakdown: ExtractedSettlementBreakdown | null;

  // Financial Summary
  financialSummary: ExtractedFinancialSummary | null;

  // Transactions
  transactions: ExtractedTransaction[];

  // Holds
  holds: ExtractedHold[];

  // Confidence
  confidence: {
    overall: 'high' | 'medium' | 'low';
    fields: Record<string, 'high' | 'medium' | 'low'>;
  };
}

// ============================================================================
// API Response Types
// ============================================================================

export interface MatterExtractionResponse {
  success: boolean;
  data: ExtractedMatterInfo;
  metadata: {
    filename: string;
    fileSize: number;
    extractedAt: string;
    transactionCount: number;
    holdCount: number;
    extractionMethod?: 'direct' | 'ocr' | 'provided';
  };
}
