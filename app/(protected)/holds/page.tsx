'use client';

/**
 * Holds List Page
 *
 * View and manage all trust fund holds.
 */

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/contexts/user-context';
import { getHoldsByUser, getMatter, getClient, getClientsByUser } from '@/lib/storage';
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
import { Plus, MagnifyingGlass, Lock, Funnel } from '@phosphor-icons/react';
import type { Hold, Matter, Client } from '@/types/iolta';

interface HoldWithDetails extends Hold {
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

export default function HoldsPage() {
  const { data: session } = useSession();
  const [holds, setHolds] = useState<HoldWithDetails[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [clientFilter, setClientFilter] = useState<string>('');

  useEffect(() => {
    async function loadData() {
      if (!session?.user.id) return;

      try {
        const [holdsData, clientsData] = await Promise.all([
          getHoldsByUser(session.user.id),
          getClientsByUser(session.user.id),
        ]);

        // Load matter and client details
        const holdsWithDetails = await Promise.all(
          holdsData.map(async (hold) => {
            const matter = await getMatter(hold.matterId);
            const client = matter ? await getClient(matter.clientId) : undefined;
            return { ...hold, matter, client };
          })
        );

        setHolds(holdsWithDetails);
        setClients(clientsData);
      } catch (error) {
        console.error('Failed to load holds:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [session?.user.id]);

  const filteredHolds = useMemo(() => {
    return holds.filter((hold) => {
      const matchesSearch =
        hold.description.toLowerCase().includes(search.toLowerCase()) ||
        (hold.matter?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (hold.client?.name || '').toLowerCase().includes(search.toLowerCase());

      const matchesStatus = !statusFilter || hold.status === statusFilter;
      const matchesClient = !clientFilter || hold.client?.id === clientFilter;

      return matchesSearch && matchesStatus && matchesClient;
    });
  }, [holds, search, statusFilter, clientFilter]);

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
        title="Holds"
        description="Manage trust fund holds and restrictions"
        actions={
          <Link href="/holds/new" className={buttonVariants()}>
            <Plus size={20} className="mr-2" />
            New Hold
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
            placeholder="Search holds..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Funnel size={18} className="self-center text-muted-foreground" />
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? '')}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="By Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="released">Released</SelectItem>
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

      {/* Holds List */}
      {filteredHolds.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Lock size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
            {holds.length === 0 ? (
              <>
                <h3 className="text-lg font-semibold mb-2">No holds yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create a hold to restrict funds in a matter.
                </p>
                <Link href="/holds/new" className={buttonVariants()}>
                  <Plus size={20} className="mr-2" />
                  New Hold
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
          {filteredHolds.map((hold) => (
            <Link key={hold.id} href={`/holds/${hold.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <Lock size={20} className="text-muted-foreground" />
                      </div>
                      <div>
                        <h3 className="font-medium">{hold.description}</h3>
                        <p className="text-sm text-muted-foreground">
                          {hold.matter?.name || 'Unknown Matter'}
                          {hold.client && ` • ${hold.client.name}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {hold.type} • Created {formatDate(hold.createdAt)}
                          {hold.releasedAt && ` • Released ${formatDate(hold.releasedAt)}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge
                        variant={hold.status === 'active' ? 'default' : 'secondary'}
                      >
                        {hold.status}
                      </Badge>
                      <span className="text-lg font-semibold">
                        {formatCurrency(hold.amount)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
