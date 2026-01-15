'use client';

/**
 * Matter Detail Page
 *
 * View matter details, transactions, and holds.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/lib/contexts/user-context';
import {
  getMatterWithBalance,
  getTransactionsByMatter,
  getHoldsByMatter,
  updateMatter,
  deleteMatter,
  createAuditLog,
} from '@/lib/storage';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Pencil,
  Trash,
  Plus,
  CurrencyDollar,
  Lock,
  ArrowUp,
  ArrowDown,
} from '@phosphor-icons/react';
import type { MatterWithBalance, Transaction, Hold } from '@/types/iolta';

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

export default function MatterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [matter, setMatter] = useState<MatterWithBalance | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [holds, setHolds] = useState<Hold[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const matterId = params.id as string;

  useEffect(() => {
    async function loadData() {
      if (!matterId) return;

      try {
        const [matterData, txns, holdsData] = await Promise.all([
          getMatterWithBalance(matterId),
          getTransactionsByMatter(matterId),
          getHoldsByMatter(matterId),
        ]);

        setMatter(matterData || null);
        setTransactions(txns);
        setHolds(holdsData);
      } catch (error) {
        console.error('Failed to load matter:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [matterId]);

  const handleDelete = async () => {
    if (!session?.user.id || !matter) return;

    setDeleting(true);

    try {
      await createAuditLog({
        entityType: 'matter',
        entityId: matter.id,
        action: 'delete',
        details: JSON.stringify({ name: matter.name }),
        userId: session.user.id,
        userEmail: session.user.email,
      });

      await deleteMatter(matter.id);
      router.push('/matters');
    } catch (error) {
      console.error('Failed to delete matter:', error);
      setDeleting(false);
    }
  };

  const handleCloseMatter = async () => {
    if (!session?.user.id || !matter) return;

    await updateMatter(matter.id, {
      status: 'closed',
      closeDate: new Date(),
    });

    await createAuditLog({
      entityType: 'matter',
      entityId: matter.id,
      action: 'update',
      details: JSON.stringify({ status: 'closed' }),
      userId: session.user.id,
      userEmail: session.user.email,
    });

    setMatter({ ...matter, status: 'closed', closeDate: new Date() });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    );
  }

  if (!matter) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Matter not found</h2>
        <p className="text-muted-foreground mb-4">
          The matter you're looking for doesn't exist or has been deleted.
        </p>
        <Link href="/matters" className={buttonVariants()}>
          Back to Matters
        </Link>
      </div>
    );
  }

  const activeHolds = holds.filter((h) => h.status === 'active');

  return (
    <div>
      <PageHeader
        title={matter.name}
        description={`${matter.matterNumber} • ${matter.client?.name || 'Unknown Client'}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/matters" className={buttonVariants({ variant: 'ghost' })}>
              <ArrowLeft size={20} className="mr-2" />
              Back
            </Link>
            {matter.status === 'open' && (
              <Button variant="outline" onClick={handleCloseMatter}>
                Close Matter
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="destructive" disabled={deleting} />}>
                <Trash size={20} className="mr-2" />
                Delete
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Matter?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {matter.name} and all transactions
                    and holds. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} className="bg-destructive">
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        }
      />

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Trust Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(matter.balance)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Deposits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(matter.totalDeposits)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Disbursements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(matter.totalDisbursements)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(matter.availableBalance)}
            </div>
            {matter.totalHolds > 0 && (
              <p className="text-xs text-muted-foreground">
                {formatCurrency(matter.totalHolds)} held
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transactions */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Transactions</CardTitle>
                <CardDescription>All deposits and disbursements</CardDescription>
              </div>
              {matter.status === 'open' && (
                <div className="flex gap-2">
                  <Link href={`/transactions/new?matterId=${matter.id}&type=deposit&returnTo=/matters/${matter.id}`} className={buttonVariants({ size: 'sm' })}>
                    <ArrowDown size={16} className="mr-1" />
                    Deposit
                  </Link>
                  <Link href={`/transactions/new?matterId=${matter.id}&type=disbursement&returnTo=/matters/${matter.id}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                    <ArrowUp size={16} className="mr-1" />
                    Disburse
                  </Link>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CurrencyDollar size={32} className="mx-auto mb-2 opacity-50" />
                <p>No transactions yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                        {txn.type === 'deposit' ? (
                          <ArrowDown size={16} />
                        ) : (
                          <ArrowUp size={16} />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{txn.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(txn.createdAt)}
                          {txn.payor && ` • From: ${txn.payor}`}
                          {txn.payee && ` • To: ${txn.payee}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={txn.status === 'completed' ? 'default' : 'secondary'}>
                        {txn.status}
                      </Badge>
                      <span className="font-semibold">
                        {txn.type === 'deposit' ? '+' : '-'}
                        {formatCurrency(txn.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Holds */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Holds</CardTitle>
                <CardDescription>
                  {activeHolds.length} active hold{activeHolds.length !== 1 && 's'}
                </CardDescription>
              </div>
              {matter.status === 'open' && (
                <Link href={`/holds/new?matterId=${matter.id}&returnTo=/matters/${matter.id}`} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
                  <Plus size={16} className="mr-1" />
                  Add
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {holds.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Lock size={32} className="mx-auto mb-2 opacity-50" />
                <p>No holds</p>
              </div>
            ) : (
              <div className="space-y-2">
                {holds.map((hold) => (
                  <Link
                    key={hold.id}
                    href={`/holds/${hold.id}?returnTo=/matters/${matter.id}`}
                    className="block p-3 border rounded-lg hover:border-primary/50"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge
                        variant={hold.status === 'active' ? 'default' : 'secondary'}
                      >
                        {hold.status}
                      </Badge>
                      <span className="font-semibold">
                        {formatCurrency(hold.amount)}
                      </span>
                    </div>
                    <p className="text-sm">{hold.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {hold.type} • {formatDate(hold.createdAt)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Matter Info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Matter Information</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <dt className="text-sm text-muted-foreground">Status</dt>
              <dd>
                <Badge variant={matter.status === 'open' ? 'default' : 'secondary'}>
                  {matter.status}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted-foreground">Open Date</dt>
              <dd>{formatDate(matter.openDate)}</dd>
            </div>
            {matter.closeDate && (
              <div>
                <dt className="text-sm text-muted-foreground">Close Date</dt>
                <dd>{formatDate(matter.closeDate)}</dd>
              </div>
            )}
            {matter.practiceArea && (
              <div>
                <dt className="text-sm text-muted-foreground">Practice Area</dt>
                <dd>{matter.practiceArea}</dd>
              </div>
            )}
            {matter.responsibleAttorney && (
              <div>
                <dt className="text-sm text-muted-foreground">Responsible Attorney</dt>
                <dd>{matter.responsibleAttorney}</dd>
              </div>
            )}
            {matter.description && (
              <div className="md:col-span-3">
                <dt className="text-sm text-muted-foreground">Description</dt>
                <dd>{matter.description}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
