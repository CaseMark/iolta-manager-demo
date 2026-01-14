'use client';

/**
 * New Transaction Page
 *
 * Form to create a new deposit or disbursement with AI document extraction support.
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/lib/auth/client';
import {
  createTransaction,
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
import { ArrowLeft, ArrowDown, ArrowUp, Sparkle } from '@phosphor-icons/react';
import { TransactionExtractor, type ExtractedTransactionInfo } from '@/components/transaction-extractor';
import type { MatterWithBalance, NewTransaction, TransactionType } from '@/types/iolta';

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

export default function NewTransactionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [matters, setMatters] = useState<MatterWithBalance[]>([]);
  const [selectedMatter, setSelectedMatter] = useState<MatterWithBalance | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMatters, setLoadingMatters] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showExtractor, setShowExtractor] = useState(false);

  // Form field refs for AI population
  const amountRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  const payorRef = useRef<HTMLInputElement>(null);
  const payeeRef = useRef<HTMLInputElement>(null);
  const checkNumberRef = useRef<HTMLInputElement>(null);
  const referenceRef = useRef<HTMLInputElement>(null);

  const defaultMatterId = searchParams.get('matterId') || '';
  const defaultType = (searchParams.get('type') as TransactionType) || 'deposit';
  const returnTo = searchParams.get('returnTo');

  const [selectedMatterId, setSelectedMatterId] = useState<string>(defaultMatterId);
  const [transactionType, setTransactionType] = useState<TransactionType>(defaultType);

  useEffect(() => {
    async function loadMatters() {
      if (!session?.user.id) return;

      try {
        const data = await getMattersWithBalances(session.user.id);
        setMatters(data.filter((m) => m.status === 'open'));

        // Load initial matter if provided
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

  const handleExtractedData = (data: ExtractedTransactionInfo) => {
    // Set transaction type if extracted
    if (data.transactionType) {
      setTransactionType(data.transactionType);
    }

    // Populate amount
    if (data.amount && amountRef.current) {
      amountRef.current.value = data.amount.toFixed(2);
    }

    // Populate description
    if (data.description && descriptionRef.current) {
      descriptionRef.current.value = data.description;
    } else if (data.memo && descriptionRef.current) {
      descriptionRef.current.value = data.memo;
    }

    // Populate payor (for deposits)
    if (data.payor && payorRef.current) {
      payorRef.current.value = data.payor;
    }

    // Populate payee (for disbursements)
    if (data.payee && payeeRef.current) {
      payeeRef.current.value = data.payee;
    }

    // Populate check number
    if (data.checkNumber && checkNumberRef.current) {
      checkNumberRef.current.value = data.checkNumber;
    }

    // Populate reference number
    if (data.referenceNumber && referenceRef.current) {
      referenceRef.current.value = data.referenceNumber;
    }

    // Try to match matter by reference
    if (data.matterReference && matters.length > 0) {
      const matchedMatter = matters.find(
        (m) =>
          m.matterNumber.toLowerCase().includes(data.matterReference!.toLowerCase()) ||
          data.matterReference!.toLowerCase().includes(m.matterNumber.toLowerCase()) ||
          m.name.toLowerCase().includes(data.matterReference!.toLowerCase())
      );
      if (matchedMatter) {
        setSelectedMatterId(matchedMatter.id);
      }
    }

    // Hide the extractor after applying
    setShowExtractor(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session?.user.id || !selectedMatter) return;

    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const amountStr = formData.get('amount') as string;
    const amount = Math.round(parseFloat(amountStr) * 100); // Convert to cents

    // Validate disbursement doesn't exceed available balance
    if (transactionType === 'disbursement' && amount > selectedMatter.availableBalance) {
      setError(
        `Insufficient funds. Available balance: ${formatCurrency(selectedMatter.availableBalance)}`
      );
      setLoading(false);
      return;
    }

    try {
      const transactionData: NewTransaction = {
        matterId: selectedMatterId,
        type: transactionType,
        amount,
        description: formData.get('description') as string,
        payor: transactionType === 'deposit' ? (formData.get('payor') as string) : undefined,
        payee: transactionType === 'disbursement' ? (formData.get('payee') as string) : undefined,
        checkNumber: (formData.get('checkNumber') as string) || undefined,
        reference: (formData.get('reference') as string) || undefined,
        status: 'completed',
        createdBy: session.user.id,
      };

      const transaction = await createTransaction(transactionData);

      // Create audit log
      await createAuditLog({
        entityType: 'transaction',
        entityId: transaction.id,
        action: 'create',
        details: JSON.stringify({
          type: transaction.type,
          amount: transaction.amount,
          matterId: transaction.matterId,
        }),
        userId: session.user.id,
        userEmail: session.user.email,
      });

      router.push(returnTo || `/matters/${selectedMatterId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create transaction');
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="New Transaction"
        description="Record a trust account deposit or disbursement"
        actions={
          <Link href={returnTo || '/transactions'} className={buttonVariants({ variant: 'ghost' })}>
            <ArrowLeft size={20} className="mr-2" />
            Back
          </Link>
        }
      />

      <div className="max-w-2xl space-y-6">
        {/* AI Transaction Extractor */}
        {showExtractor ? (
          <TransactionExtractor
            onExtracted={handleExtractedData}
            onClose={() => setShowExtractor(false)}
          />
        ) : (
          <Button
            variant="outline"
            className="w-full border-dashed"
            onClick={() => setShowExtractor(true)}
          >
            <Sparkle size={18} className="mr-2" weight="fill" />
            Extract from Document (AI)
          </Button>
        )}

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
            {/* Transaction Type */}
            <div className="space-y-2">
              <Label>Transaction Type *</Label>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant={transactionType === 'deposit' ? 'default' : 'outline'}
                  className="h-20"
                  onClick={() => setTransactionType('deposit')}
                >
                  <div className="flex flex-col items-center gap-2">
                    <ArrowDown size={24} />
                    <span>Deposit</span>
                  </div>
                </Button>
                <Button
                  type="button"
                  variant={transactionType === 'disbursement' ? 'default' : 'outline'}
                  className="h-20"
                  onClick={() => setTransactionType('disbursement')}
                >
                  <div className="flex flex-col items-center gap-2">
                    <ArrowUp size={24} />
                    <span>Disbursement</span>
                  </div>
                </Button>
              </div>
            </div>

            {/* Matter Selection */}
            <div className="space-y-2">
              <Label htmlFor="matterId">Matter *</Label>
              {loadingMatters ? (
                <div className="h-10 bg-muted rounded animate-pulse" />
              ) : matters.length === 0 ? (
                <div className="text-sm text-muted-foreground">
                  No open matters available.{' '}
                  <Link href="/matters/new" className="text-primary hover:underline">
                    Create a matter first
                  </Link>
                </div>
              ) : (
                <Select
                  value={selectedMatterId}
                  onValueChange={(v) => v && setSelectedMatterId(v)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {matters.map((matter) => (
                      <SelectItem key={matter.id} value={matter.id}>
                        {matter.name} - {matter.matterNumber}
                        {matter.client && ` (${matter.client.name})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {selectedMatter && (
                <div className="text-sm p-3 bg-muted rounded-lg">
                  <div className="flex justify-between">
                    <span>Current Balance:</span>
                    <span className="font-medium">{formatCurrency(selectedMatter.balance)}</span>
                  </div>
                  {selectedMatter.totalHolds > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Available Balance:</span>
                      <span>{formatCurrency(selectedMatter.availableBalance)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount">Amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  ref={amountRef}
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  min="0.01"
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
                ref={descriptionRef}
                id="description"
                name="description"
                placeholder={
                  transactionType === 'deposit'
                    ? 'e.g., Retainer payment received'
                    : 'e.g., Payment to vendor'
                }
                required
                disabled={loading}
              />
            </div>

            {/* Payor/Payee */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {transactionType === 'deposit' ? (
                <div className="space-y-2">
                  <Label htmlFor="payor">Received From</Label>
                  <Input
                    ref={payorRef}
                    id="payor"
                    name="payor"
                    placeholder="Payor name"
                    disabled={loading}
                  />
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="payee">Paid To *</Label>
                  <Input
                    ref={payeeRef}
                    id="payee"
                    name="payee"
                    placeholder="Payee name"
                    required
                    disabled={loading}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="checkNumber">Check Number</Label>
                <Input
                  ref={checkNumberRef}
                  id="checkNumber"
                  name="checkNumber"
                  placeholder="Optional"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Reference */}
            <div className="space-y-2">
              <Label htmlFor="reference">Reference Number</Label>
              <Input
                ref={referenceRef}
                id="reference"
                name="reference"
                placeholder="Invoice or reference number"
                disabled={loading}
              />
            </div>

            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-4">
              <Link href={returnTo || '/transactions'} className={buttonVariants({ variant: 'outline' })}>
                Cancel
              </Link>
              <Button type="submit" disabled={loading || matters.length === 0 || !selectedMatterId}>
                {loading
                  ? 'Processing...'
                  : transactionType === 'deposit'
                    ? 'Record Deposit'
                    : 'Record Disbursement'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
