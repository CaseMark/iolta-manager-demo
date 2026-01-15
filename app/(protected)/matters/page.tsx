'use client';

/**
 * Matters List Page
 *
 * View and manage all legal matters.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from '@/lib/contexts/user-context';
import { getMattersWithBalances } from '@/lib/storage';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, MagnifyingGlass, Briefcase } from '@phosphor-icons/react';
import type { MatterWithBalance } from '@/types/iolta';

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export default function MattersPage() {
  const { data: session } = useSession();
  const [matters, setMatters] = useState<MatterWithBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadMatters() {
      if (!session?.user.id) return;

      try {
        const data = await getMattersWithBalances(session.user.id);
        setMatters(data);
      } catch (error) {
        console.error('Failed to load matters:', error);
      } finally {
        setLoading(false);
      }
    }

    loadMatters();
  }, [session?.user.id]);

  const filteredMatters = matters.filter(
    (matter) =>
      matter.name.toLowerCase().includes(search.toLowerCase()) ||
      matter.matterNumber.toLowerCase().includes(search.toLowerCase()) ||
      (matter.client?.name || '').toLowerCase().includes(search.toLowerCase())
  );

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
        title="Matters"
        description="Manage legal matters and trust balances"
        actions={
          <Link href="/matters/new" className={buttonVariants()}>
            <Plus size={20} className="mr-2" />
            New Matter
          </Link>
        }
      />

      {/* Search */}
      <div className="relative mb-6">
        <MagnifyingGlass
          size={20}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          placeholder="Search matters..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Matters List */}
      {filteredMatters.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Briefcase size={48} className="mx-auto mb-4 text-muted-foreground opacity-50" />
            {matters.length === 0 ? (
              <>
                <h3 className="text-lg font-semibold mb-2">No matters yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first matter to start tracking trust funds.
                </p>
                <Link href="/matters/new" className={buttonVariants()}>
                  <Plus size={20} className="mr-2" />
                  New Matter
                </Link>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold mb-2">No results found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search terms.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredMatters.map((matter) => (
            <Link key={matter.id} href={`/matters/${matter.id}`}>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{matter.name}</h3>
                        <Badge
                          variant={matter.status === 'open' ? 'default' : 'secondary'}
                        >
                          {matter.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {matter.matterNumber}
                        {matter.client && ` • ${matter.client.name}`}
                        {matter.practiceArea && ` • ${matter.practiceArea}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(matter.balance)}</p>
                      {matter.totalHolds > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(matter.availableBalance)} available
                        </p>
                      )}
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
