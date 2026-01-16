'use client';

/**
 * Document Extractor Component
 *
 * Upload a document and extract comprehensive matter information using AI.
 * Supports:
 * - TXT files: Read directly
 * - PDF/DOCX files: OCR via Case.dev API (requires Vercel Blob storage)
 * - Manual text input: Paste text directly
 *
 * Extracts matter details, transactions, holds, and settlement breakdowns.
 */

import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  FileText,
  Upload,
  X,
  Sparkle,
  Warning,
  CheckCircle,
  Spinner,
  UserPlus,
  TextT,
  CaretDown,
  CaretRight,
  ArrowDown,
  ArrowUp,
  Info,
} from '@phosphor-icons/react';
import { useUsage } from '@/lib/contexts/usage-context';
import type { ExtractedMatterInfo } from '@/types/extraction';

// Re-export the type for backwards compatibility
export type { ExtractedMatterInfo };

export interface ExtractedClientInfo {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

interface DocumentExtractorProps {
  onExtracted: (data: ExtractedMatterInfo) => void;
  onClientCreated?: (client: ExtractedClientInfo, matterData: ExtractedMatterInfo) => void;
  onClose?: () => void;
}

type InputMode = 'file' | 'text';

export function DocumentExtractor({ onExtracted, onClientCreated, onClose }: DocumentExtractorProps) {
  const [inputMode, setInputMode] = useState<InputMode>('file');
  const [file, setFile] = useState<File | null>(null);
  const [manualText, setManualText] = useState('');
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ExtractedMatterInfo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [extractionProgress, setExtractionProgress] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { getUsageHeader, addLLMUsage, isLimitExceeded } = useUsage();

  // Collapsible sections - only matter expanded by default
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['matter'])
  );

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      setError(null);
      setExtractedData(null);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
      setExtractedData(null);
    }
  }, []);

  const getFileTypeInfo = (file: File) => {
    const fileName = file.name.toLowerCase();
    const isPDF = file.type === 'application/pdf' || fileName.endsWith('.pdf');
    const isDOCX =
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      fileName.endsWith('.docx');
    const isTXT = file.type === 'text/plain' || fileName.endsWith('.txt');
    return { isPDF, isDOCX, isTXT, requiresOCR: isPDF || isDOCX };
  };

  const handleExtract = async () => {
    if (inputMode === 'file' && !file) return;
    if (inputMode === 'text' && !manualText.trim()) {
      setError('Please enter some text to extract information from.');
      return;
    }

    // Check if limits are already exceeded
    if (isLimitExceeded) {
      setError('Demo usage limit reached. Create an account at console.case.dev for unlimited access.');
      return;
    }

    setExtracting(true);
    setError(null);
    setExtractionProgress(null);

    try {
      const formData = new FormData();

      if (inputMode === 'file' && file) {
        const { requiresOCR, isTXT } = getFileTypeInfo(file);

        if (requiresOCR) {
          setExtractionProgress('Uploading document for OCR processing...');
        } else if (isTXT) {
          setExtractionProgress('Reading document...');
        }

        formData.append('file', file);
        // For TXT files, we can also send the text content as a fallback
        if (isTXT) {
          const textContent = await file.text();
          formData.append('textContent', textContent);
        }
      } else {
        // Manual text input
        const textContent = manualText.trim();
        if (textContent.length < 50) {
          throw new Error('Text is too short. Please provide more document content for accurate extraction.');
        }
        const blob = new Blob([textContent], { type: 'text/plain' });
        formData.append('file', blob, 'pasted-text.txt');
        formData.append('textContent', textContent);
      }

      setExtractionProgress('Analyzing document with AI...');

      // Build headers with usage info
      const headers: Record<string, string> = {};
      const usageHeader = getUsageHeader();
      if (usageHeader) {
        headers['X-Demo-Usage'] = usageHeader;
      }

      const response = await fetch('/api/extract-matter', {
        method: 'POST',
        headers,
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        // Handle rate limit response
        if (response.status === 429) {
          throw new Error(result.message || 'Demo usage limit reached. Create an account at console.case.dev for unlimited access.');
        }
        throw new Error(result.error || 'Failed to extract information');
      }

      // Track usage (estimate ~2000 input tokens, ~1500 output tokens for matter extraction)
      addLLMUsage(2000, 1500);

      setExtractedData(result.data);
      setExtractionProgress(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract information');
      setExtractionProgress(null);
    } finally {
      setExtracting(false);
    }
  };

  const handleApply = () => {
    if (extractedData) {
      onExtracted(extractedData);
    }
  };

  const handleCreateClient = () => {
    if (extractedData?.clientName && onClientCreated) {
      onClientCreated(
        {
          name: extractedData.clientName,
          email: extractedData.clientEmail || undefined,
          phone: extractedData.clientPhone || undefined,
          address: extractedData.clientAddress || undefined,
        },
        extractedData
      );
    }
  };

  const hasClientInfo = extractedData?.clientName;

  const getConfidenceBadge = (confidence: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return <Badge variant="default">High</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium</Badge>;
      case 'low':
        return <Badge variant="outline">Low</Badge>;
    }
  };

  const formatCurrency = (amount: number | null | undefined) => {
    if (amount == null) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (date: string | null | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      settlement_funds: 'Settlement',
      legal_fees: 'Legal Fees',
      case_costs: 'Case Costs',
      medical_lien: 'Medical Lien',
      subrogation: 'Subrogation',
      client_distribution: 'Client Dist.',
      structured_settlement: 'Structured',
      retainer: 'Retainer',
      refund: 'Refund',
      other: 'Other',
    };
    return labels[category] || category;
  };

  const getHoldTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      lien_reserve: 'Lien Reserve',
      structured_settlement: 'Structured',
      attorney_lien: 'Attorney Lien',
      escrow: 'Escrow',
      compliance: 'Compliance',
      retainer: 'Retainer',
      other: 'Other',
    };
    return labels[type] || type;
  };

  // Section Header Component - no icons
  const SectionHeader = ({ id, title, count }: { id: string; title: string; count?: number }) => (
    <button
      type="button"
      onClick={() => toggleSection(id)}
      className="w-full flex items-center gap-2 px-3 py-3 text-left"
    >
      {expandedSections.has(id) ? <CaretDown size={14} /> : <CaretRight size={14} />}
      <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground flex-1">{title}</span>
      {count !== undefined && count > 0 && (
        <Badge variant="secondary" className="text-xs">{count}</Badge>
      )}
    </button>
  );

  return (
    <Card className="border-2 border-dashed border-primary/20">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Sparkle size={20} className="text-primary-foreground" weight="fill" />
            </div>
            <div>
              <CardTitle className="text-xl tracking-tight">
                AI Document Extraction
              </CardTitle>
              <CardDescription className="text-sm mt-0.5">
                Upload a document to auto-fill matter details
              </CardDescription>
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X size={16} />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {!extractedData ? (
          <>
            {/* Mode Toggle */}
            <div className="flex gap-2 p-1 bg-muted rounded-lg">
              <button
                type="button"
                onClick={() => {
                  setInputMode('file');
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  inputMode === 'file'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Upload size={16} />
                Upload File
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputMode('text');
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  inputMode === 'text'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <TextT size={16} />
                Paste Text
              </button>
            </div>

            {inputMode === 'file' && (
              <div
                className={`
                  relative border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer
                  ${isDragging ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'}
                  ${file ? 'bg-muted/50' : ''}
                `}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                  onChange={handleFileSelect}
                  className="hidden"
                />

                {file ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText size={20} className="text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(1)} KB
                        {file && getFileTypeInfo(file).requiresOCR && (
                          <span className="ml-2 text-primary">(OCR)</span>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                      }}
                    >
                      <X size={16} />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center">
                    <Upload size={32} className="mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm font-medium">Drop a document here</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Supports .txt, .pdf, and .docx files
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* OCR Info Note */}
            {inputMode === 'file' && file && getFileTypeInfo(file).requiresOCR && (
              <div className="flex items-start gap-2 p-3 bg-muted text-muted-foreground rounded-lg text-xs">
                <Info size={14} className="shrink-0 mt-0.5" />
                <p>
                  PDF and DOCX files use OCR processing. Requires BLOB_READ_WRITE_TOKEN to be configured.
                </p>
              </div>
            )}

            {inputMode === 'text' && (
              <div className="space-y-2">
                <Textarea
                  placeholder="Paste the document text here...

Supports:
- Matter summaries
- Settlement statements
- Transaction histories
- Client ledger reports"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  className="min-h-[160px] text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {manualText.length > 0 && `${manualText.length.toLocaleString()} characters`}
                </p>
              </div>
            )}

            {extractionProgress && (
              <div className="flex items-center gap-2 p-3 bg-primary/10 text-primary rounded-lg text-sm">
                <Spinner size={16} className="animate-spin shrink-0" />
                <p>{extractionProgress}</p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                <Warning size={18} className="shrink-0 mt-0.5" />
                <div>
                  <p>{error}</p>
                  {inputMode === 'file' && error.includes('paste') && (
                    <button
                      type="button"
                      onClick={() => setInputMode('text')}
                      className="mt-2 text-xs underline hover:no-underline"
                    >
                      Switch to Paste Text mode
                    </button>
                  )}
                </div>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleExtract}
              disabled={(inputMode === 'file' ? !file : !manualText.trim()) || extracting}
            >
              {extracting ? (
                <>
                  <Spinner size={16} className="mr-2 animate-spin" />
                  {extractionProgress || 'Extracting...'}
                </>
              ) : (
                <>
                  <Sparkle size={16} className="mr-2" weight="fill" />
                  Extract Matter Info
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            {/* Extracted Results Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CheckCircle size={20} className="text-primary" weight="fill" />
                <span className="font-medium">Extraction Complete</span>
              </div>
              {getConfidenceBadge(extractedData.confidence?.overall || 'medium')}
            </div>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {/* Matter Information Section */}
              <div className="border rounded-lg">
                <SectionHeader id="matter" title="Matter Information" />
                {expandedSections.has('matter') && (
                  <div className="px-3 pb-3 space-y-1.5 text-sm">
                    {extractedData.matterName && (
                      <div className="flex justify-between py-1 border-b border-dashed">
                        <span className="text-muted-foreground">Name</span>
                        <span className="font-medium text-right max-w-[60%]">{extractedData.matterName}</span>
                      </div>
                    )}
                    {extractedData.matterNumber && (
                      <div className="flex justify-between py-1 border-b border-dashed">
                        <span className="text-muted-foreground">Number</span>
                        <span className="font-medium">{extractedData.matterNumber}</span>
                      </div>
                    )}
                    {extractedData.matterType && (
                      <div className="flex justify-between py-1 border-b border-dashed">
                        <span className="text-muted-foreground">Type</span>
                        <Badge variant="secondary">{extractedData.matterType}</Badge>
                      </div>
                    )}
                    {extractedData.status && (
                      <div className="flex justify-between py-1 border-b border-dashed">
                        <span className="text-muted-foreground">Status</span>
                        <Badge variant={extractedData.status === 'active' ? 'default' : 'secondary'}>
                          {extractedData.status}
                        </Badge>
                      </div>
                    )}
                    {extractedData.responsibleAttorney && (
                      <div className="flex justify-between py-1 border-b border-dashed">
                        <span className="text-muted-foreground">Attorney</span>
                        <span className="font-medium">{extractedData.responsibleAttorney}</span>
                      </div>
                    )}
                    {extractedData.court && (
                      <div className="flex justify-between py-1 border-b border-dashed">
                        <span className="text-muted-foreground">Court</span>
                        <span className="font-medium text-right text-xs max-w-[60%]">{extractedData.court}</span>
                      </div>
                    )}
                    {extractedData.opposingParty && (
                      <div className="flex justify-between py-1 border-b border-dashed">
                        <span className="text-muted-foreground">Opposing Party</span>
                        <span className="font-medium">{extractedData.opposingParty}</span>
                      </div>
                    )}
                    {extractedData.description && (
                      <div className="py-1">
                        <span className="text-muted-foreground text-xs">Description</span>
                        <p className="text-xs mt-1 bg-muted/50 p-2 rounded">{extractedData.description}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Client Information */}
              {hasClientInfo && (
                <div className="border rounded-lg">
                  <SectionHeader id="client" title="Client Information" />
                  {expandedSections.has('client') && (
                    <div className="px-3 pb-3 space-y-1.5 text-sm">
                      {extractedData.clientName && (
                        <div className="flex justify-between py-1 border-b border-dashed">
                          <span className="text-muted-foreground">Name</span>
                          <span className="font-medium">{extractedData.clientName}</span>
                        </div>
                      )}
                      {extractedData.clientEmail && (
                        <div className="flex justify-between py-1 border-b border-dashed">
                          <span className="text-muted-foreground">Email</span>
                          <span className="font-medium text-xs">{extractedData.clientEmail}</span>
                        </div>
                      )}
                      {extractedData.clientPhone && (
                        <div className="flex justify-between py-1 border-b border-dashed">
                          <span className="text-muted-foreground">Phone</span>
                          <span className="font-medium">{extractedData.clientPhone}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Financial Summary */}
              {extractedData.financialSummary && (
                <div className="border rounded-lg">
                  <SectionHeader id="financial" title="Financial Summary" />
                  {expandedSections.has('financial') && (
                    <div className="px-3 pb-3 space-y-1.5 text-sm">
                      {extractedData.financialSummary.trustBalance != null && (
                        <div className="flex justify-between py-1 border-b border-dashed">
                          <span className="text-muted-foreground">Trust Balance</span>
                          <span className="font-medium">{formatCurrency(extractedData.financialSummary.trustBalance)}</span>
                        </div>
                      )}
                      {extractedData.financialSummary.totalDeposits != null && (
                        <div className="flex justify-between py-1 border-b border-dashed">
                          <span className="text-muted-foreground">Total Deposits</span>
                          <span className="font-medium">{formatCurrency(extractedData.financialSummary.totalDeposits)}</span>
                        </div>
                      )}
                      {extractedData.financialSummary.totalDisbursements != null && (
                        <div className="flex justify-between py-1 border-b border-dashed">
                          <span className="text-muted-foreground">Total Disbursements</span>
                          <span className="font-medium">{formatCurrency(extractedData.financialSummary.totalDisbursements)}</span>
                        </div>
                      )}
                      {extractedData.financialSummary.activeHolds != null && (
                        <div className="flex justify-between py-1 border-b border-dashed">
                          <span className="text-muted-foreground">Active Holds</span>
                          <span className="font-medium">{formatCurrency(extractedData.financialSummary.activeHolds)}</span>
                        </div>
                      )}
                      {extractedData.financialSummary.availableBalance != null && (
                        <div className="flex justify-between py-1 bg-muted/50 px-2 rounded">
                          <span className="font-medium">Available Balance</span>
                          <span className="font-semibold">{formatCurrency(extractedData.financialSummary.availableBalance)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Settlement Breakdown */}
              {extractedData.settlementBreakdown && extractedData.settlementBreakdown.grossSettlement && (
                <div className="border rounded-lg">
                  <SectionHeader id="settlement" title="Settlement Breakdown" />
                  {expandedSections.has('settlement') && (
                    <div className="px-3 pb-3 space-y-1.5 text-sm">
                      <div className="flex justify-between py-1 border-b">
                        <span className="font-medium">Gross Settlement</span>
                        <span className="font-semibold">{formatCurrency(extractedData.settlementBreakdown.grossSettlement)}</span>
                      </div>
                      {extractedData.settlementBreakdown.attorneyFees != null && (
                        <div className="flex justify-between py-1 border-b border-dashed text-xs">
                          <span className="text-muted-foreground">
                            Attorney Fees {extractedData.settlementBreakdown.attorneyFeePercentage && `(${extractedData.settlementBreakdown.attorneyFeePercentage}%)`}
                          </span>
                          <span className="text-muted-foreground">-{formatCurrency(extractedData.settlementBreakdown.attorneyFees)}</span>
                        </div>
                      )}
                      {extractedData.settlementBreakdown.caseCosts != null && (
                        <div className="flex justify-between py-1 border-b border-dashed text-xs">
                          <span className="text-muted-foreground">Case Costs</span>
                          <span className="text-muted-foreground">-{formatCurrency(extractedData.settlementBreakdown.caseCosts)}</span>
                        </div>
                      )}
                      {extractedData.settlementBreakdown.medicalLiensTotal != null && (
                        <div className="flex justify-between py-1 border-b border-dashed text-xs">
                          <span className="text-muted-foreground">Medical Liens</span>
                          <span className="text-muted-foreground">-{formatCurrency(extractedData.settlementBreakdown.medicalLiensTotal)}</span>
                        </div>
                      )}
                      {extractedData.settlementBreakdown.subrogationTotal != null && (
                        <div className="flex justify-between py-1 border-b border-dashed text-xs">
                          <span className="text-muted-foreground">Subrogation</span>
                          <span className="text-muted-foreground">-{formatCurrency(extractedData.settlementBreakdown.subrogationTotal)}</span>
                        </div>
                      )}
                      {extractedData.settlementBreakdown.clientDistribution != null && (
                        <div className="flex justify-between py-1 bg-muted/50 px-2 rounded">
                          <span className="font-medium">Client Distribution</span>
                          <span className="font-semibold">{formatCurrency(extractedData.settlementBreakdown.clientDistribution)}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Transactions */}
              {extractedData.transactions && extractedData.transactions.length > 0 && (
                <div className="border rounded-lg">
                  <SectionHeader id="transactions" title="Transactions" count={extractedData.transactions.length} />
                  {expandedSections.has('transactions') && (
                    <div className="px-3 pb-3">
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {extractedData.transactions.map((txn, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 bg-muted/50 rounded text-xs">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 bg-muted text-muted-foreground">
                              {txn.type === 'deposit' ? <ArrowDown size={12} weight="bold" /> : <ArrowUp size={12} weight="bold" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-[10px] px-1 py-0">{getCategoryLabel(txn.category)}</Badge>
                                <span className="text-muted-foreground">{formatDate(txn.date)}</span>
                              </div>
                              <p className="truncate text-muted-foreground">{txn.description}</p>
                            </div>
                            <span className="font-semibold shrink-0">
                              {txn.type === 'deposit' ? '+' : '-'}{formatCurrency(txn.amount)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Holds */}
              {extractedData.holds && extractedData.holds.length > 0 && (
                <div className="border rounded-lg">
                  <SectionHeader id="holds" title="Holds" count={extractedData.holds.length} />
                  {expandedSections.has('holds') && (
                    <div className="px-3 pb-3">
                      <div className="space-y-2">
                        {extractedData.holds.map((hold, idx) => (
                          <div key={idx} className="p-2 bg-muted/50 rounded text-xs">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant={hold.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">
                                  {hold.status}
                                </Badge>
                                <Badge variant="outline" className="text-[10px]">{getHoldTypeLabel(hold.holdType)}</Badge>
                              </div>
                              <span className="font-semibold">{formatCurrency(hold.amount)}</span>
                            </div>
                            <p className="text-muted-foreground mt-1 truncate">{hold.description}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* No data message */}
              {!extractedData.matterName && !extractedData.clientName && !extractedData.matterType &&
               (!extractedData.transactions || extractedData.transactions.length === 0) && (
                <div className="text-center py-4 text-muted-foreground">
                  <Warning size={24} className="mx-auto mb-2" />
                  <p>No information could be extracted from this document.</p>
                  <p className="text-xs mt-1">Try uploading a different document or pasting the text directly.</p>
                </div>
              )}
            </div>

            {/* Create Client Option */}
            {hasClientInfo && onClientCreated && (
              <div className="p-4 bg-muted rounded-lg border mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <UserPlus size={20} className="text-primary" />
                    <div>
                      <p className="font-medium">Client not in system?</p>
                      <p className="text-sm text-muted-foreground">
                        Create &quot;{extractedData?.clientName}&quot; as a new client
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCreateClient}
                  >
                    Create Client
                  </Button>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setExtractedData(null);
                  setFile(null);
                  setManualText('');
                }}
              >
                Try Another
              </Button>
              <Button className="flex-1" onClick={handleApply}>
                Apply to Form
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
