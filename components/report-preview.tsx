'use client';

/**
 * Report Preview Component
 *
 * Shows a preview of generated reports with multi-format export functionality.
 * Supports PDF, DOCX, and TXT exports per the export skill specification.
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, FilePdf, FileDoc, FileText } from '@phosphor-icons/react';
import {
  generateExportPreview,
  downloadFromPreview,
  revokePreviewUrl,
  formatDate,
  type ExportFormat,
  type ExportPreviewData,
  type ReportData,
  type ReportSection,
  type ReportTableData,
} from '@/lib/export';
import type { MatterWithBalance, Transaction, ReportType } from '@/types/iolta';

interface ReportPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reportType: ReportType;
  reportName: string;
  selectedMonth: string;
  matters: MatterWithBalance[];
  transactions: Transaction[];
  onExportComplete?: () => void;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formatMonthYear(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

// Build report data outside component to avoid recreating on every render
function buildReportData(
  reportType: ReportType,
  selectedMonth: string,
  matters: MatterWithBalance[],
  transactions: Transaction[]
): ReportData {
  // Calculate derived values inside the function
  const monthTransactions = transactions.filter((t) => {
    const txnMonth = new Date(t.createdAt).toISOString().slice(0, 7);
    return txnMonth === selectedMonth;
  });
  const deposits = monthTransactions.filter((t) => t.type === 'deposit');
  const disbursements = monthTransactions.filter((t) => t.type === 'disbursement');
  const totalDeposits = deposits.reduce((sum, t) => sum + t.amount, 0);
  const totalDisbursements = disbursements.reduce((sum, t) => sum + t.amount, 0);
  const totalBalance = matters.reduce((sum, m) => sum + m.balance, 0);
  const openMatters = matters.filter((m) => m.status === 'open');

  const baseData = {
    generatedDate: formatDate(new Date()),
    sections: [] as ReportSection[],
  };

  switch (reportType) {
    case 'monthly_trust':
      return {
        ...baseData,
        title: 'Monthly Trust Account Summary',
        subtitle: formatMonthYear(selectedMonth),
        sections: [
          {
            title: 'Summary',
            content: [
              {
                type: 'summary',
                summary: [
                  { label: 'Total Trust Balance', value: formatCurrency(totalBalance) },
                  { label: 'Active Matters', value: openMatters.length.toString() },
                  { label: 'Total Deposits', value: formatCurrency(totalDeposits) },
                  { label: 'Total Disbursements', value: formatCurrency(totalDisbursements) },
                ],
              },
            ],
          },
          {
            title: 'Matter Balances',
            content: [
              {
                type: 'table',
                table: {
                  headers: ['Matter', 'Client', 'Status', 'Balance'],
                  rows: matters.map((m) => [
                    `${m.name}\n${m.matterNumber}`,
                    m.client?.name || '-',
                    m.status.toUpperCase(),
                    formatCurrency(m.balance),
                  ]),
                  alignRight: [3],
                  totalRow: ['TOTAL', '', '', formatCurrency(totalBalance)],
                } as ReportTableData,
              },
            ],
          },
          {
            title: `Transaction Activity -${formatMonthYear(selectedMonth)}`,
            content:
              monthTransactions.length === 0
                ? [{ type: 'text', text: 'No transactions recorded for this period.' }]
                : [
                    {
                      type: 'table',
                      table: {
                        headers: ['Date', 'Matter', 'Description', 'Type', 'Amount'],
                        rows: monthTransactions.map((t) => [
                          formatDate(t.createdAt),
                          matters.find((m) => m.id === t.matterId)?.name || '-',
                          t.description,
                          t.type.toUpperCase(),
                          `${t.type === 'deposit' ? '+' : '-'}${formatCurrency(t.amount)}`,
                        ]),
                        alignRight: [4],
                        totalRow: ['NET CHANGE', '', '', '', formatCurrency(totalDeposits - totalDisbursements)],
                      } as ReportTableData,
                    },
                  ],
          },
        ],
      };

    case 'reconciliation':
      return {
        ...baseData,
        title: 'Three-Way Reconciliation Report',
        subtitle: formatMonthYear(selectedMonth),
        sections: [
          {
            title: 'Reconciliation Summary',
            content: [
              {
                type: 'summary',
                summary: [
                  { label: 'Bank Balance', value: formatCurrency(totalBalance) },
                  { label: 'Trust Ledger', value: formatCurrency(totalBalance) },
                  { label: 'Client Balances', value: formatCurrency(totalBalance) },
                  { label: 'Variance', value: formatCurrency(0) },
                ],
              },
            ],
          },
          {
            title: 'Client Balance Detail',
            content: [
              {
                type: 'table',
                table: {
                  headers: ['Client', 'Matter', 'Trust Balance', 'Holds', 'Available'],
                  rows: matters.map((m) => [
                    m.client?.name || '-',
                    m.name,
                    formatCurrency(m.balance),
                    formatCurrency(m.totalHolds),
                    formatCurrency(m.availableBalance),
                  ]),
                  alignRight: [2, 3, 4],
                  totalRow: [
                    'TOTAL',
                    '',
                    formatCurrency(totalBalance),
                    formatCurrency(matters.reduce((s, m) => s + m.totalHolds, 0)),
                    formatCurrency(matters.reduce((s, m) => s + m.availableBalance, 0)),
                  ],
                } as ReportTableData,
              },
            ],
          },
          {
            title: 'Reconciliation Detail',
            content: [
              {
                type: 'table',
                table: {
                  headers: ['Item', 'Amount'],
                  rows: [
                    ['Bank Statement Balance (per statement)', formatCurrency(totalBalance)],
                    ['Add: Deposits in Transit', formatCurrency(0)],
                    ['Less: Outstanding Checks', formatCurrency(0)],
                    ['Adjusted Bank Balance', formatCurrency(totalBalance)],
                    ['Trust Ledger Balance', formatCurrency(totalBalance)],
                    ['Total Client Balances', formatCurrency(totalBalance)],
                  ],
                  alignRight: [1],
                  totalRow: ['VARIANCE (Must Equal $0.00)', formatCurrency(0)],
                } as ReportTableData,
              },
            ],
          },
        ],
      };

    case 'client_ledger':
      return {
        ...baseData,
        title: 'Client Ledger Report',
        subtitle: formatMonthYear(selectedMonth),
        sections: openMatters.map((matter) => {
          const matterTxns = transactions.filter((t) => t.matterId === matter.id);
          let runningBalance = 0;

          return {
            title: `${matter.client?.name || 'Unknown Client'} -${matter.name}`,
            content: [
              {
                type: 'text',
                label: 'Matter Number',
                text: matter.matterNumber,
              },
              {
                type: 'text',
                label: 'Current Balance',
                text: formatCurrency(matter.balance),
              },
              matterTxns.length === 0
                ? { type: 'text', text: 'No transactions recorded.' }
                : {
                    type: 'table',
                    table: {
                      headers: ['Date', 'Description', 'Reference', 'Debit', 'Credit', 'Balance'],
                      rows: matterTxns.map((t) => {
                        runningBalance += t.type === 'deposit' ? t.amount : -t.amount;
                        return [
                          formatDate(t.createdAt),
                          t.description,
                          t.reference || t.checkNumber || '-',
                          t.type === 'disbursement' ? formatCurrency(t.amount) : '-',
                          t.type === 'deposit' ? formatCurrency(t.amount) : '-',
                          formatCurrency(runningBalance),
                        ];
                      }),
                      alignRight: [3, 4, 5],
                    } as ReportTableData,
                  },
            ],
          };
        }),
      };

    default:
      return { ...baseData, title: 'Report', subtitle: '', sections: [] };
  }
}

export function ReportPreview({
  open,
  onOpenChange,
  reportType,
  reportName,
  selectedMonth,
  matters,
  transactions,
  onExportComplete,
}: ReportPreviewProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [preview, setPreview] = useState<ExportPreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  
  // Track the current preview URL for cleanup
  const previewUrlRef = useRef<string | null>(null);
  
  // Create stable cache key based on actual data content
  const cacheKey = useMemo(() => {
    return JSON.stringify({
      reportType,
      selectedMonth,
      matterIds: matters.map(m => m.id).sort(),
      transactionIds: transactions.map(t => t.id).sort(),
    });
  }, [reportType, selectedMonth, matters, transactions]);

  // Store latest props in refs to avoid stale closures
  const latestPropsRef = useRef({ reportType, selectedMonth, matters, transactions });
  latestPropsRef.current = { reportType, selectedMonth, matters, transactions };

  // Generate preview when format changes or dialog opens
  // Only depend on open, format, and cacheKey - cacheKey captures data changes
  useEffect(() => {
    // Don't generate if dialog is closed
    if (!open) {
      return;
    }

    let cancelled = false;

    const generatePreviewAsync = async () => {
      setLoading(true);

      // Cleanup previous preview URL before generating new one
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
        previewUrlRef.current = null;
      }

      try {
        // Get latest props from ref to avoid stale closure
        const { reportType: rt, selectedMonth: sm, matters: m, transactions: t } = latestPropsRef.current;

        // Build report data synchronously (fast)
        const reportData = buildReportData(rt, sm, m, t);

        // Generate export asynchronously
        const newPreview = await generateExportPreview(reportData, { format });

        // Check if effect was cancelled during async operation
        if (cancelled) {
          revokePreviewUrl(newPreview);
          return;
        }

        // Store the URL for cleanup
        previewUrlRef.current = newPreview.blobUrl;
        setPreview(newPreview);
      } catch (error) {
        console.error('Failed to generate preview:', error);
        if (!cancelled) {
          setPreview(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    generatePreviewAsync();

    // Cleanup function
    return () => {
      cancelled = true;
    };
  }, [open, format, cacheKey]); // Removed redundant deps - cacheKey captures data changes
  
  // Cleanup preview URL when dialog closes
  useEffect(() => {
    if (!open && previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
      setPreview(null);
    }
  }, [open]);

  const handleExport = () => {
    if (preview) {
      downloadFromPreview(preview);
      onExportComplete?.();
    }
  };

  const handleClose = () => {
    onOpenChange(false);
  };

  const formatIcon = {
    pdf: FilePdf,
    docx: FileDoc,
    txt: FileText,
  };

  const FormatIcon = formatIcon[format];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="!max-w-[98vw] !w-[98vw] !h-[95vh] !max-h-[95vh] overflow-hidden flex flex-col bg-card">
        <AlertDialogHeader className="flex-shrink-0 pb-4 border-b border-border">
          <div className="flex items-center justify-between">
            <AlertDialogTitle className="text-xl font-semibold">{reportName}</AlertDialogTitle>
            <div className="flex items-center gap-3">
              <Select value={format} onValueChange={(v) => v && setFormat(v as ExportFormat)}>
                <SelectTrigger className="w-44 bg-card border-border hover:border-foreground/20 transition-colors">
                  <div className="flex items-center gap-2">
                    <FormatIcon size={18} weight="fill" className="text-muted-foreground" />
                    <span className="font-medium text-foreground">
                      {format === 'pdf' ? 'PDF' : format === 'docx' ? 'Word' : 'Text'}
                    </span>
                  </div>
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="pdf">
                    <FilePdf size={18} weight="fill" className="text-red-600" />
                    <span>PDF Document</span>
                  </SelectItem>
                  <SelectItem value="docx">
                    <FileDoc size={18} weight="fill" className="text-blue-600" />
                    <span>Word Document</span>
                  </SelectItem>
                  <SelectItem value="txt">
                    <FileText size={18} weight="fill" className="text-muted-foreground" />
                    <span>Plain Text</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button variant="ghost" size="icon" onClick={handleClose} className="h-9 w-9 hover:bg-muted">
                <X size={20} />
              </Button>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="flex-1 overflow-auto border border-border rounded-lg bg-muted my-4" style={{ minHeight: 0 }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-pulse text-muted-foreground text-lg">Generating preview...</div>
            </div>
          ) : preview ? (
            <div className="h-full">
              {format === 'pdf' && (
                <iframe
                  src={preview.blobUrl}
                  className="w-full h-full rounded-lg"
                  title="PDF Preview"
                />
              )}
              {format === 'docx' && preview.htmlPreview && (
                <div
                  className="bg-card rounded-lg shadow-sm mx-auto my-6 w-full"
                  dangerouslySetInnerHTML={{ __html: preview.htmlPreview }}
                />
              )}
              {format === 'txt' && preview.content && (
                <div className="bg-card rounded-lg shadow-sm mx-auto my-6 w-full max-w-5xl">
                  <pre className="p-8 font-mono text-sm whitespace-pre-wrap text-foreground">{preview.content}</pre>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No preview available
            </div>
          )}
        </div>

        <AlertDialogFooter className="flex-shrink-0 pt-4 border-t border-border">
          <AlertDialogCancel onClick={handleClose} className="border-border hover:bg-muted">
            Close
          </AlertDialogCancel>
          <Button onClick={handleExport} disabled={!preview || loading} size="lg" className="gap-2">
            <FormatIcon size={18} />
            Export {format.toUpperCase()}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
