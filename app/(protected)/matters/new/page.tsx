'use client';

/**
 * New Matter Page
 *
 * Form to create a new matter with AI document extraction support.
 */

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/lib/auth/client';
import {
  createMatter,
  createClient,
  createTransaction,
  createHold,
  getClientsByUser,
  generateMatterNumber,
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
import { ArrowLeft, Sparkle, CheckCircle, ArrowDown, ArrowUp, Clock } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { DocumentExtractor, type ExtractedMatterInfo, type ExtractedClientInfo } from '@/components/document-extractor';
import type { Client, NewMatter, NewTransaction, NewHold, HoldType } from '@/types/iolta';

const PRACTICE_AREAS = [
  'Bankruptcy',
  'Business/Corporate',
  'Criminal Defense',
  'Employment Law',
  'Estate Planning',
  'Family Law',
  'Immigration',
  'Intellectual Property',
  'Medical Malpractice',
  'Personal Injury',
  'Real Estate',
  'Workers Compensation',
  'Other',
];

export default function NewMatterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string>(
    searchParams.get('clientId') || ''
  );
  const [matterNumber, setMatterNumber] = useState('');
  const [showExtractor, setShowExtractor] = useState(false);

  // Store newly created client to ensure proper display in Select
  const [createdClient, setCreatedClient] = useState<Client | null>(null);

  // Store full extracted data for creating transactions/holds after matter creation
  const [extractedData, setExtractedData] = useState<ExtractedMatterInfo | null>(null);

  // Form field refs for AI population
  const nameRef = useRef<HTMLInputElement>(null);
  const responsibleAttorneyRef = useRef<HTMLInputElement>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  // Controlled state for select fields (Select doesn't work well with refs)
  const [selectedPracticeArea, setSelectedPracticeArea] = useState<string>('');

  useEffect(() => {
    async function loadClients() {
      if (!session?.user.id) return;

      try {
        const data = await getClientsByUser(session.user.id);
        setClients(data.filter((c) => c.status === 'active'));
      } catch (error) {
        console.error('Failed to load clients:', error);
      } finally {
        setLoadingClients(false);
      }
    }

    loadClients();
  }, [session?.user.id]);

  useEffect(() => {
    async function generateNumber() {
      if (selectedClientId) {
        const number = await generateMatterNumber(selectedClientId);
        setMatterNumber(number);
      }
    }

    generateNumber();
  }, [selectedClientId]);

  const handleExtractedData = (data: ExtractedMatterInfo) => {
    // Store the full extracted data for creating transactions/holds later
    setExtractedData(data);

    // Populate form fields with extracted data
    if (data.matterName && nameRef.current) {
      nameRef.current.value = data.matterName;
    }

    if (data.matterNumber) {
      setMatterNumber(data.matterNumber);
    }

    // Map the extracted matter type to our predefined practice areas
    if (data.matterType) {
      // Direct match first (e.g., "Personal Injury" -> "Personal Injury")
      const directMatch = PRACTICE_AREAS.find(
        (area) => area.toLowerCase() === data.matterType!.toLowerCase()
      );
      if (directMatch) {
        setSelectedPracticeArea(directMatch);
      } else {
        // Fuzzy match for similar names
        const matchedArea = PRACTICE_AREAS.find(
          (area) =>
            area.toLowerCase().includes(data.matterType!.toLowerCase()) ||
            data.matterType!.toLowerCase().includes(area.toLowerCase())
        );
        if (matchedArea) {
          setSelectedPracticeArea(matchedArea);
        }
      }
    }

    if (data.responsibleAttorney && responsibleAttorneyRef.current) {
      responsibleAttorneyRef.current.value = data.responsibleAttorney;
    }

    if (data.description && descriptionRef.current) {
      descriptionRef.current.value = data.description;
    }

    // Hide the extractor after applying
    setShowExtractor(false);
  };

  const handleClientCreated = async (clientInfo: ExtractedClientInfo, matterData: ExtractedMatterInfo) => {
    if (!session?.user.id) return;

    try {
      // Create the new client
      const newClient = await createClient({
        name: clientInfo.name,
        email: clientInfo.email || '',
        phone: clientInfo.phone,
        address: clientInfo.address,
        status: 'active',
        createdBy: session.user.id,
      });

      // Create audit log
      await createAuditLog({
        entityType: 'client',
        entityId: newClient.id,
        action: 'create',
        details: JSON.stringify({
          name: newClient.name,
          source: 'document_extraction'
        }),
        userId: session.user.id,
        userEmail: session.user.email,
      });

      // Store the created client and auto-select
      setCreatedClient(newClient);
      setClients((prev) => [newClient, ...prev]);
      setSelectedClientId(newClient.id);

      // Apply the extracted matter data to the form
      handleExtractedData(matterData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create client');
    }
  };

  // Map extracted hold types to IOLTA hold types
  const mapHoldType = (extractedType: string): HoldType => {
    const typeMap: Record<string, HoldType> = {
      lien_reserve: 'escrow',
      structured_settlement: 'settlement',
      attorney_lien: 'retainer',
      escrow: 'escrow',
      compliance: 'compliance',
      retainer: 'retainer',
      other: 'other',
    };
    return typeMap[extractedType] || 'other';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session?.user.id) return;

    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);

    try {
      const matterData: NewMatter = {
        clientId: formData.get('clientId') as string,
        name: formData.get('name') as string,
        matterNumber: formData.get('matterNumber') as string,
        description: (formData.get('description') as string) || undefined,
        status: 'open',
        practiceArea: (formData.get('practiceArea') as string) || undefined,
        responsibleAttorney: (formData.get('responsibleAttorney') as string) || undefined,
        openDate: new Date(),
        createdBy: session.user.id,
      };

      const matter = await createMatter(matterData);

      // Create audit log for matter
      await createAuditLog({
        entityType: 'matter',
        entityId: matter.id,
        action: 'create',
        details: JSON.stringify({ name: matter.name, matterNumber: matter.matterNumber }),
        userId: session.user.id,
        userEmail: session.user.email,
      });

      // Create extracted transactions if any
      if (extractedData?.transactions && extractedData.transactions.length > 0) {
        for (const txn of extractedData.transactions) {
          const transactionData: NewTransaction = {
            matterId: matter.id,
            type: txn.type === 'deposit' ? 'deposit' : 'disbursement',
            amount: Math.round((txn.amount || 0) * 100), // Convert to cents
            description: txn.description || `Extracted ${txn.category} transaction`,
            payee: txn.payee || undefined,
            payor: txn.payor || undefined,
            checkNumber: txn.checkNumber || undefined,
            reference: txn.reference || undefined,
            status: 'completed',
            createdBy: session.user.id,
          };

          const transaction = await createTransaction(transactionData);

          await createAuditLog({
            entityType: 'transaction',
            entityId: transaction.id,
            action: 'create',
            details: JSON.stringify({
              type: transaction.type,
              amount: transaction.amount,
              source: 'document_extraction',
            }),
            userId: session.user.id,
            userEmail: session.user.email,
          });
        }
      }

      // Create extracted holds if any
      if (extractedData?.holds && extractedData.holds.length > 0) {
        for (const hold of extractedData.holds) {
          // Only create active holds
          if (hold.status !== 'active') continue;

          const holdData: NewHold = {
            matterId: matter.id,
            amount: Math.round((hold.amount || 0) * 100), // Convert to cents
            type: mapHoldType(hold.holdType),
            description: hold.description || `Extracted ${hold.holdType} hold`,
            status: 'active',
            createdBy: session.user.id,
          };

          const createdHold = await createHold(holdData);

          await createAuditLog({
            entityType: 'hold',
            entityId: createdHold.id,
            action: 'create',
            details: JSON.stringify({
              type: createdHold.type,
              amount: createdHold.amount,
              source: 'document_extraction',
            }),
            userId: session.user.id,
            userEmail: session.user.email,
          });
        }
      }

      router.push(`/matters/${matter.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create matter');
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Create New Matter"
        description="Open a new legal matter"
        actions={
          <Link href="/matters" className={buttonVariants({ variant: 'ghost' })}>
            <ArrowLeft size={20} className="mr-2" />
            Back to Matters
          </Link>
        }
      />

      <div className="max-w-2xl space-y-6">
        {/* AI Document Extractor */}
        {showExtractor ? (
          <DocumentExtractor
            onExtracted={handleExtractedData}
            onClientCreated={handleClientCreated}
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

        {/* Extracted Data Summary */}
        {extractedData && (extractedData.transactions?.length > 0 || extractedData.holds?.length > 0) && (
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-start gap-3">
                <CheckCircle size={20} className="text-primary shrink-0 mt-0.5" weight="fill" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    Extracted data will be imported with this matter
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {extractedData.transactions && extractedData.transactions.length > 0 && (
                      <>
                        <Badge variant="secondary">
                          <ArrowDown size={12} className="mr-1" />
                          {extractedData.transactions.filter(t => t.type === 'deposit').length} deposits
                        </Badge>
                        <Badge variant="secondary">
                          <ArrowUp size={12} className="mr-1" />
                          {extractedData.transactions.filter(t => t.type === 'disbursement').length} disbursements
                        </Badge>
                      </>
                    )}
                    {extractedData.holds && extractedData.holds.filter(h => h.status === 'active').length > 0 && (
                      <Badge variant="secondary">
                        <Clock size={12} className="mr-1" />
                        {extractedData.holds.filter(h => h.status === 'active').length} active holds
                      </Badge>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setExtractedData(null)}
                    className="text-xs text-muted-foreground hover:text-foreground mt-2 underline"
                  >
                    Clear extracted data
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Matter Form */}
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="clientId">Client *</Label>
                {loadingClients ? (
                  <div className="h-10 bg-muted rounded animate-pulse" />
                ) : clients.length === 0 && !selectedClientId ? (
                  <div className="text-sm text-muted-foreground">
                    No clients available.{' '}
                    <Link href="/clients/new" className="text-primary hover:underline">
                      Create a client first
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Hidden input ensures clientId is always submitted even during state transitions */}
                    <input type="hidden" name="clientId" value={selectedClientId} />
                    <Select
                      key={`client-select-${clients.map((c) => c.id).join('-')}-${selectedClientId}`}
                      value={selectedClientId}
                      onValueChange={(v) => v && setSelectedClientId(v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {/* Include createdClient if not already in clients list */}
                        {createdClient && !clients.find(c => c.id === createdClient.id) && (
                          <SelectItem key={createdClient.id} value={createdClient.id}>
                            {createdClient.name}
                          </SelectItem>
                        )}
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Matter Name *</Label>
                  <Input
                    ref={nameRef}
                    id="name"
                    name="name"
                    placeholder="Smith v. Jones"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="matterNumber">Matter Number *</Label>
                  <Input
                    id="matterNumber"
                    name="matterNumber"
                    value={matterNumber}
                    onChange={(e) => setMatterNumber(e.target.value)}
                    placeholder="2024-001"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="practiceArea">Practice Area</Label>
                  <Select
                    name="practiceArea"
                    value={selectedPracticeArea}
                    onValueChange={(v) => v && setSelectedPracticeArea(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRACTICE_AREAS.map((area) => (
                        <SelectItem key={area} value={area}>
                          {area}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="responsibleAttorney">Responsible Attorney</Label>
                  <Input
                    ref={responsibleAttorneyRef}
                    id="responsibleAttorney"
                    name="responsibleAttorney"
                    placeholder="Jane Doe"
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  ref={descriptionRef}
                  id="description"
                  name="description"
                  placeholder="Brief description of the matter..."
                  rows={3}
                  disabled={loading}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive" role="alert">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-4">
                <Link href="/matters" className={buttonVariants({ variant: 'outline' })}>
                  Cancel
                </Link>
                <Button type="submit" disabled={loading || (!selectedClientId && clients.length === 0)}>
                  {loading
                    ? 'Creating...'
                    : extractedData?.transactions?.length
                      ? `Create Matter & Import ${extractedData.transactions.length} Transactions`
                      : 'Create Matter'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
