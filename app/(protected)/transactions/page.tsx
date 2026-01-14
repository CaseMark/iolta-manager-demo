'use client';

/**
 * Transactions List Page
 *
 * View all trust account transactions.
 */

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/auth/client';
import { getTransactionsByUser, getMatter, getClient, getClientsByUser } from '@/lib/storage';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  MagnifyingGlass,
  CurrencyDollar,
  ArrowUp,
  ArrowDown,
  Funnel,
} from '@phosphor-icons/react';
import type { Transaction, Matter, Client } from '@/types/iolta';

interface TransactionWithDetails extends Transaction {
  matter?: Matter;
  client?: Client;
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

export default function TransactionsPage() {
  const { data: session } = useSession();
  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [clientFilter, setClientFilter] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      if (!session?.user.id) return;

      try {
        const [txns, clientsData] = await Promise.all([
          getTransactionsByUser(session.user.id),
          getClientsByUser(session.user.id),
        ]);

        // Load matter and client details
        const txnsWithDetails = await Promise.all(
          txns.map(async (txn) => {
            const matter = await getMatter(txn.matterId);
            const client = matter ? await getClient(matter.clientId) : undefined;
            return { ...txn, matter, client };
          })
        );

        setTransactions(txnsWithDetails);
        setClients(clientsData);
      } catch (error) {
        console.error('Failed to load transactions:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [session?.user.id]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((txn) => {
      const matchesSearch =
        txn.description.toLowerCase().includes(search.toLowerCase()) ||
        (txn.matter?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (txn.client?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (txn.payee || '').toLowerCase().includes(search.toLowerCase()) ||
        (txn.payor || '').toLowerCase().includes(search.toLowerCase());

      const matchesType = !typeFilter || txn.type === typeFilter;
      const matchesClient = !clientFilter || txn.client?.id === clientFilter;

      return matchesSearch && matchesType && matchesClient;
    });
  }, [transactions, search, typeFilter, clientFilter]);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-32" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="All trust account deposits and disbursements"
        actions={
          <Link href="/transactions/new" className={buttonVariants()}>
            <Plus size={20} className="mr-2" />
            New Transaction
          </Link>
        }
      />

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Funnel size={18} className="self-center text-muted-foreground" />
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v ?? '')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="By Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Types</SelectItem>
            <SelectItem value="deposit">Deposits</SelectItem>
            <SelectItem value="disbursement">Disbursements</SelectItem>
          </SelectContent>
        </Select>
        <Select value={clientFilter} onValueChange={(v) => setClientFilter(v ?? '')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="By Client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Clients</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CurrencyDollar
              size={48}
              className="mx-auto mb-4 text-muted-foreground opacity-50"
            />
            {transactions.length === 0 ? (
              <>
                <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
                <p className="text-muted-foreground mb-4">
                  Record your first transaction to start tracking trust funds.
                </p>
                <Link href="/transactions/new" className={buttonVariants()}>
                  <Plus size={20} className="mr-2" />
                  New Transaction
                </Link>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or filters.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredTransactions.map((txn) => (
            <Card key={txn.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-muted text-muted-foreground">
                      {txn.type === 'deposit' ? (
                        <ArrowDown size={20} />
                      ) : (
                        <ArrowUp size={20} />
                      )}
                    </div>
                    <div>
                      <h3 className="font-medium">{txn.description}</h3>
                      <p className="text-sm text-muted-foreground">
                        {txn.matter?.name || 'Unknown Matter'}
                        {txn.client && ` • ${txn.client.name}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(txn.createdAt)}
                        {txn.type === 'deposit' && txn.payor && ` • From: ${txn.payor}`}
                        {txn.type === 'disbursement' && txn.payee && ` • To: ${txn.payee}`}
                        {txn.checkNumber && ` • Check #${txn.checkNumber}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant={txn.status === 'completed' ? 'default' : 'secondary'}>
                      {txn.status}
                    </Badge>
                    <span className="text-lg font-semibold">
                      {txn.type === 'deposit' ? '+' : '-'}
                      {formatCurrency(txn.amount)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
