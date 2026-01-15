'use client';

/**
 * Dashboard Page
 *
 * Overview of trust account balances and recent activity.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/contexts/user-context';
import { getDashboardStats, getMattersWithBalances } from '@/lib/storage';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import {
  Users,
  Briefcase,
  CurrencyDollar,
  Lock,
  Plus,
  ArrowRight,
} from '@phosphor-icons/react';
import type { Transaction, MatterWithBalance } from '@/types/iolta';

interface DashboardStats {
  totalClients: number;
  activeMatters: number;
  totalBalance: number;
  recentTransactions: Transaction[];
  pendingHolds: number;
}

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

export default function DashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [matters, setMatters] = useState<MatterWithBalance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!session?.user.id) return;

      try {
        const [dashboardStats, mattersData] = await Promise.all([
          getDashboardStats(session.user.id),
          getMattersWithBalances(session.user.id),
        ]);

        setStats(dashboardStats);
        setMatters(mattersData.slice(0, 5)); // Top 5 matters
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [session?.user.id]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your trust account activity"
        actions={
          <Link href="/transactions/new" className={buttonVariants()}>
            <Plus size={20} className="mr-2" />
            New Transaction
          </Link>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Clients
            </CardTitle>
            <Users size={20} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalClients || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Matters
            </CardTitle>
            <Briefcase size={20} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.activeMatters || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Trust Balance
            </CardTitle>
            <CurrencyDollar size={20} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.totalBalance || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Holds
            </CardTitle>
            <Lock size={20} className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingHolds || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Latest trust account activity</CardDescription>
              </div>
              <Link href="/transactions" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                View all
                <ArrowRight size={16} className="ml-1" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {stats?.recentTransactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CurrencyDollar size={32} className="mx-auto mb-2 opacity-50" />
                <p>No transactions yet</p>
                <Link href="/transactions/new" className={buttonVariants({ variant: 'link', size: 'sm' })}>
                  Record your first transaction
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {stats?.recentTransactions.map((txn) => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <div>
                      <p className="font-medium">{txn.description}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(txn.createdAt)}
                      </p>
                    </div>
                    <span className="font-medium">
                      {txn.type === 'deposit' ? '+' : '-'}
                      {formatCurrency(txn.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Matter Balances */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Matter Balances</CardTitle>
                <CardDescription>Current trust balances by matter</CardDescription>
              </div>
              <Link href="/matters" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
                View all
                <ArrowRight size={16} className="ml-1" />
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {matters.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase size={32} className="mx-auto mb-2 opacity-50" />
                <p>No matters yet</p>
                <Link href="/matters/new" className={buttonVariants({ variant: 'link', size: 'sm' })}>
                  Create your first matter
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {matters.map((matter) => (
                  <Link
                    key={matter.id}
                    href={`/matters/${matter.id}`}
                    className="flex items-center justify-between py-2 border-b last:border-0 hover:bg-muted/50 -mx-2 px-2 rounded"
                  >
                    <div>
                      <p className="font-medium">{matter.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {matter.matterNumber}
                        {matter.client && ` • ${matter.client.name}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(matter.balance)}</p>
                      {matter.totalHolds > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(matter.availableBalance)} available
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Empty State */}
      {stats?.totalClients === 0 && (
        <Card className="mt-6">
          <CardContent className="py-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Get Started with IOLTA Manager</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Start by adding a client, then create matters to track their trust funds.
            </p>
            <div className="flex items-center justify-center gap-4">
              <Link href="/clients/new" className={buttonVariants()}>
                <Users size={20} className="mr-2" />
                Add Client
              </Link>
              <Link href="/settings" className={buttonVariants({ variant: 'outline' })}>
                Configure Settings
              </Link>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
