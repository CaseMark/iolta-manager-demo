'use client';

/**
 * New Hold Page
 *
 * Form to create a new trust fund hold.
 */

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/lib/contexts/user-context';
import {
  createHold,
  getMattersWithBalances,
  getMatterWithBalance,
  createAuditLog,
} from '@/lib/storage';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft } from '@phosphor-icons/react';
import type { MatterWithBalance, NewHold, HoldType } from '@/types/iolta';

const HOLD_TYPES: { value: HoldType; label: string }[] = [
  { value: 'retainer', label: 'Retainer' },
  { value: 'settlement', label: 'Settlement' },
  { value: 'escrow', label: 'Escrow' },
  { value: 'compliance', label: 'Compliance' },
  { value: 'other', label: 'Other' },
];

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export default function NewHoldPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [matters, setMatters] = useState<MatterWithBalance[]>([]);
  const [selectedMatter, setSelectedMatter] = useState<MatterWithBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMatters, setLoadingMatters] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const defaultMatterId = searchParams.get('matterId') || '';
  const returnTo = searchParams.get('returnTo');
  const [selectedMatterId, setSelectedMatterId] = useState<string>(defaultMatterId);

  useEffect(() => {
    async function loadMatters() {
      if (!session?.user.id) return;

      try {
        const data = await getMattersWithBalances(session.user.id);
        setMatters(data.filter((m) => m.status === 'open' && m.availableBalance > 0));

        if (defaultMatterId) {
          const matter = await getMatterWithBalance(defaultMatterId);
          if (matter) {
            setSelectedMatter(matter);
          }
        }
      } catch (error) {
        console.error('Failed to load matters:', error);
      } finally {
        setLoadingMatters(false);
      }
    }

    loadMatters();
  }, [session?.user.id, defaultMatterId]);

  useEffect(() => {
    async function loadMatter() {
      if (selectedMatterId) {
        const matter = await getMatterWithBalance(selectedMatterId);
        setSelectedMatter(matter || null);
      } else {
        setSelectedMatter(null);
      }
    }

    loadMatter();
  }, [selectedMatterId]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session?.user.id || !selectedMatter) return;

    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const amountStr = formData.get('amount') as string;
    const amount = Math.round(parseFloat(amountStr) * 100);

    // Validate amount doesn't exceed available balance
    if (amount > selectedMatter.availableBalance) {
      setError(
        `Amount exceeds available balance: ${formatCurrency(selectedMatter.availableBalance)}`
      );
      setLoading(false);
      return;
    }

    try {
      const holdData: NewHold = {
        matterId: selectedMatterId,
        amount,
        type: formData.get('type') as HoldType,
        description: formData.get('description') as string,
        status: 'active',
        createdBy: session.user.id,
      };

      const hold = await createHold(holdData);

      await createAuditLog({
        entityType: 'hold',
        entityId: hold.id,
        action: 'create',
        details: JSON.stringify({
          amount: hold.amount,
          type: hold.type,
          matterId: hold.matterId,
        }),
        userId: session.user.id,
        userEmail: session.user.email,
      });

      router.push(returnTo || `/matters/${selectedMatterId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create hold');
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="New Hold"
        description="Create a new trust fund restriction"
        actions={
          <Link href={returnTo || '/holds'} className={buttonVariants({ variant: 'ghost' })}>
            <ArrowLeft size={20} className="mr-2" />
            Back
          </Link>
        }
      />

      <Card className="max-w-2xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Matter Selection */}
            <div className="space-y-2">
              <Label htmlFor="matterId">Matter *</Label>
              {loadingMatters ? (
                <div className="h-10 bg-muted rounded animate-pulse" />
              ) : matters.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No matters with available balance.
                </div>
              ) : (
                <Select
                  value={selectedMatterId}
                  onValueChange={(v) => v && setSelectedMatterId(v)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a matter" />
                  </SelectTrigger>
                  <SelectContent>
                    {matters.map((matter) => (
                      <SelectItem key={matter.id} value={matter.id}>
                        {matter.name} ({formatCurrency(matter.availableBalance)} available)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {selectedMatter && (
                <div className="text-sm p-3 bg-muted rounded-lg">
                  <div className="flex justify-between">
                    <span>Total Balance:</span>
                    <span className="font-medium">{formatCurrency(selectedMatter.balance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Available for Hold:</span>
                    <span className="font-medium">
                      {formatCurrency(selectedMatter.availableBalance)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Hold Type */}
            <div className="space-y-2">
              <Label htmlFor="type">Hold Type *</Label>
              <Select name="type" defaultValue="retainer" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select hold type" />
                </SelectTrigger>
                <SelectContent>
                  {HOLD_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedMatter ? selectedMatter.availableBalance / 100 : undefined}
                  placeholder="0.00"
                  className="pl-7"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Reason for this hold..."
                required
                disabled={loading}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-4">
              <Link href={returnTo || '/holds'} className={buttonVariants({ variant: 'outline' })}>
                Cancel
              </Link>
              <Button type="submit" disabled={loading || matters.length === 0 || !selectedMatterId}>
                {loading ? 'Creating...' : 'Create Hold'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
