'use client';

/**
 * Reports Page
 *
 * Generate compliance reports for trust accounts.
 */

import { useEffect, useState } from 'react';
import { useSession } from '@/lib/contexts/user-context';
import {
  getMattersWithBalances,
  getTransactionsByUser,
  getReportHistory,
  createReportHistory,
  createAuditLog,
} from '@/lib/storage';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText,
  CalendarBlank,
  ArrowsLeftRight,
  User,
  Eye,
} from '@phosphor-icons/react';
import { ReportPreview } from '@/components/report-preview';
import type { MatterWithBalance, Transaction, ReportHistory, ReportType } from '@/types/iolta';

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(date));
}

interface ReportOption {
  type: ReportType;
  title: string;
  description: string;
  icon: React.ElementType;
}

const REPORT_OPTIONS: ReportOption[] = [
  {
    type: 'monthly_trust',
    title: 'Monthly Trust Summary',
    description: 'Overview of all trust account activity for the period',
    icon: CalendarBlank,
  },
  {
    type: 'reconciliation',
    title: 'Three-Way Reconciliation',
    description: 'Compare bank statements, ledgers, and client balances',
    icon: ArrowsLeftRight,
  },
  {
    type: 'client_ledger',
    title: 'Client Ledger',
    description: 'Detailed transaction history for a specific client',
    icon: User,
  },
];

export default function ReportsPage() {
  const { data: session } = useSession();
  const [matters, setMatters] = useState<MatterWithBalance[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [reportHistory, setReportHistory] = useState<ReportHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewReport, setPreviewReport] = useState<{
    type: ReportType;
    name: string;
  } | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  useEffect(() => {
    async function loadData() {
      if (!session?.user.id) return;

      try {
        const [mattersData, txnsData, historyData] = await Promise.all([
          getMattersWithBalances(session.user.id),
          getTransactionsByUser(session.user.id),
          getReportHistory(session.user.id),
        ]);

        setMatters(mattersData);
        setTransactions(txnsData);
        setReportHistory(historyData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [session?.user.id]);

  const openReportPreview = (type: ReportType) => {
    let reportName = '';

    switch (type) {
      case 'monthly_trust':
        reportName = `Monthly Trust Summary - ${selectedMonth}`;
        break;
      case 'reconciliation':
        reportName = `Three-Way Reconciliation - ${selectedMonth}`;
        break;
      case 'client_ledger':
        reportName = `Client Ledger - ${selectedMonth}`;
        break;
    }

    setPreviewReport({ type, name: reportName });
    setPreviewOpen(true);
  };

  const handleExportComplete = async () => {
    if (!session?.user.id || !previewReport) return;

    try {
      const params: Record<string, unknown> = { month: selectedMonth };

      if (previewReport.type === 'monthly_trust' || previewReport.type === 'reconciliation') {
        params.totalBalance = matters.reduce((sum, m) => sum + m.balance, 0);
        params.matterCount = matters.length;
      }

      // Create report history entry
      const report = await createReportHistory({
        reportType: previewReport.type,
        reportName: previewReport.name,
        parameters: JSON.stringify(params),
        generatedBy: session.user.id,
        status: 'completed',
      });

      await createAuditLog({
        entityType: 'report',
        entityId: report.id,
        action: 'export',
        details: JSON.stringify({ type: previewReport.type, name: previewReport.name }),
        userId: session.user.id,
        userEmail: session.user.email,
      });

      setReportHistory((prev) => [report, ...prev]);
      setPreviewOpen(false);
    } catch (error) {
      console.error('Failed to save report history:', error);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-32" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // Calculate summary stats
  const totalBalance = matters.reduce((sum, m) => sum + m.balance, 0);
  const monthTransactions = transactions.filter((t) => {
    const txnMonth = new Date(t.createdAt).toISOString().slice(0, 7);
    return txnMonth === selectedMonth;
  });
  const monthDeposits = monthTransactions
    .filter((t) => t.type === 'deposit')
    .reduce((sum, t) => sum + t.amount, 0);
  const monthDisbursements = monthTransactions
    .filter((t) => t.type === 'disbursement')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Generate compliance reports for your trust accounts"
      />

      {/* Month Selector */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Report Period</label>
              <Select value={selectedMonth} onValueChange={(v) => v && setSelectedMonth(v)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date();
                    date.setMonth(date.getMonth() - i);
                    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                    const label = date.toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                    });
                    return (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-muted-foreground">Total Balance</p>
                <p className="text-lg font-semibold">{formatCurrency(totalBalance)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Matters</p>
                <p className="text-lg font-semibold">
                  {matters.filter((m) => m.status === 'open').length}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Month Deposits</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(monthDeposits)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Month Disbursements</p>
                <p className="text-lg font-semibold">
                  {formatCurrency(monthDisbursements)}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Types */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {REPORT_OPTIONS.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.type} className="relative overflow-hidden flex flex-col">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon size={20} className="text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{report.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1">
                <CardDescription className="mb-4 flex-1">{report.description}</CardDescription>
                <Button
                  className="w-full"
                  onClick={() => openReportPreview(report.type)}
                >
                  <Eye size={16} className="mr-2" />
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Report Preview Dialog */}
      {previewReport && (
        <ReportPreview
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          reportType={previewReport.type}
          reportName={previewReport.name}
          selectedMonth={selectedMonth}
          matters={matters}
          transactions={transactions}
          onExportComplete={handleExportComplete}
        />
      )}

      {/* Report History */}
      <Card>
        <CardHeader>
          <CardTitle>Report History</CardTitle>
          <CardDescription>Previously generated reports</CardDescription>
        </CardHeader>
        <CardContent>
          {reportHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText size={32} className="mx-auto mb-2 opacity-50" />
              <p>No reports generated yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {reportHistory.map((report) => (
                <div
                  key={report.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <FileText size={20} className="text-muted-foreground" />
                    <div>
                      <p className="font-medium">{report.reportName}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(report.generatedAt)}
                      </p>
                    </div>
                  </div>
                  <Badge variant={report.status === 'completed' ? 'default' : 'secondary'}>
                    {report.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
