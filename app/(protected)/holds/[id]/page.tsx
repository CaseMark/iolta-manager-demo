'use client';

/**
 * Hold Detail Page
 *
 * View and release a trust fund hold.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/lib/auth/client';
import { getHold, getMatter, getClient, releaseHold, deleteHold, createAuditLog } from '@/lib/storage';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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
import { ArrowLeft, Trash, LockOpen, Briefcase } from '@phosphor-icons/react';
import type { Hold, Matter, Client } from '@/types/iolta';

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
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
}

export default function HoldDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const returnTo = searchParams.get('returnTo');
  const [hold, setHold] = useState<Hold | null>(null);
  const [matter, setMatter] = useState<Matter | null>(null);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [releasing, setReleasing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [releaseReason, setReleaseReason] = useState('');
  const [showReleaseDialog, setShowReleaseDialog] = useState(false);

  const holdId = params.id as string;

  useEffect(() => {
    async function loadData() {
      if (!holdId) return;

      try {
        const holdData = await getHold(holdId);
        setHold(holdData || null);

        if (holdData) {
          const matterData = await getMatter(holdData.matterId);
          setMatter(matterData || null);

          if (matterData) {
            const clientData = await getClient(matterData.clientId);
            setClient(clientData || null);
          }
        }
      } catch (error) {
        console.error('Failed to load hold:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [holdId]);

  const handleRelease = async () => {
    if (!session?.user.id || !hold) return;

    setReleasing(true);

    try {
      await releaseHold(hold.id, session.user.id, releaseReason);

      await createAuditLog({
        entityType: 'hold',
        entityId: hold.id,
        action: 'update',
        details: JSON.stringify({ status: 'released', reason: releaseReason }),
        userId: session.user.id,
        userEmail: session.user.email,
      });

      setShowReleaseDialog(false);

      // Navigate back to the return URL or update local state
      if (returnTo) {
        router.push(returnTo);
      } else {
        setHold({
          ...hold,
          status: 'released',
          releasedAt: new Date(),
          releasedBy: session.user.id,
          releaseReason,
        });
      }
    } catch (error) {
      console.error('Failed to release hold:', error);
    } finally {
      setReleasing(false);
    }
  };

  const handleDelete = async () => {
    if (!session?.user.id || !hold) return;

    setDeleting(true);

    try {
      await createAuditLog({
        entityType: 'hold',
        entityId: hold.id,
        action: 'delete',
        details: JSON.stringify({ amount: hold.amount }),
        userId: session.user.id,
        userEmail: session.user.email,
      });

      await deleteHold(hold.id);
      router.push(returnTo || '/holds');
    } catch (error) {
      console.error('Failed to delete hold:', error);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    );
  }

  if (!hold) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Hold not found</h2>
        <p className="text-muted-foreground mb-4">
          The hold you're looking for doesn't exist or has been deleted.
        </p>
        <Link href="/holds" className={buttonVariants()}>
          Back to Holds
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`Hold: ${formatCurrency(hold.amount)}`}
        description={hold.description}
        actions={
          <div className="flex items-center gap-2">
            <Link href={returnTo || '/holds'} className={buttonVariants({ variant: 'ghost' })}>
              <ArrowLeft size={20} className="mr-2" />
              Back
            </Link>
            {hold.status === 'active' && (
              <Button variant="outline" onClick={() => setShowReleaseDialog(true)}>
                <LockOpen size={20} className="mr-2" />
                Release Hold
              </Button>
            )}
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="destructive" disabled={deleting} />}>
                <Trash size={20} className="mr-2" />
                Delete
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Hold?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this hold. This action cannot be undone.
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

      {/* Release Dialog */}
      <AlertDialog open={showReleaseDialog} onOpenChange={setShowReleaseDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Release Hold</AlertDialogTitle>
            <AlertDialogDescription>
              This will release {formatCurrency(hold.amount)} back to the available balance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Label htmlFor="releaseReason">Reason for Release</Label>
            <Textarea
              id="releaseReason"
              value={releaseReason}
              onChange={(e) => setReleaseReason(e.target.value)}
              placeholder="Enter reason for releasing this hold..."
              className="mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={releasing}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRelease} disabled={releasing}>
              {releasing ? 'Releasing...' : 'Release Hold'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hold Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Hold Details</CardTitle>
              <Badge variant={hold.status === 'active' ? 'default' : 'secondary'}>
                {hold.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-muted-foreground">Amount</dt>
                <dd className="text-2xl font-bold">{formatCurrency(hold.amount)}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Type</dt>
                <dd className="capitalize">{hold.type}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Description</dt>
                <dd>{hold.description}</dd>
              </div>
              <div>
                <dt className="text-sm text-muted-foreground">Created</dt>
                <dd>{formatDate(hold.createdAt)}</dd>
              </div>
              {hold.releasedAt && (
                <>
                  <div>
                    <dt className="text-sm text-muted-foreground">Released</dt>
                    <dd>{formatDate(hold.releasedAt)}</dd>
                  </div>
                  {hold.releaseReason && (
                    <div>
                      <dt className="text-sm text-muted-foreground">Release Reason</dt>
                      <dd>{hold.releaseReason}</dd>
                    </div>
                  )}
                </>
              )}
            </dl>
          </CardContent>
        </Card>

        {/* Matter Info */}
        <Card>
          <CardHeader>
            <CardTitle>Matter Information</CardTitle>
          </CardHeader>
          <CardContent>
            {matter ? (
              <Link
                href={`/matters/${matter.id}`}
                className="block p-4 border rounded-lg hover:border-primary/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <Briefcase size={20} className="text-muted-foreground" />
                  </div>
                  <div>
                    <h4 className="font-medium">{matter.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {matter.matterNumber}
                      {client && ` • ${client.name}`}
                    </p>
                  </div>
                </div>
              </Link>
            ) : (
              <p className="text-muted-foreground">Matter not found</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
