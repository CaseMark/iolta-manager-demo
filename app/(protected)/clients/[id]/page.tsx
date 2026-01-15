'use client';

/**
 * Client Detail Page
 *
 * View client details and their matters.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSession } from '@/lib/contexts/user-context';
import {
  getClientWithMatters,
  updateClient,
  deleteClient,
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
  Briefcase,
  Envelope,
  Phone,
  MapPin,
} from '@phosphor-icons/react';
import type { ClientWithMatters } from '@/types/iolta';

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

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [client, setClient] = useState<ClientWithMatters | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const clientId = params.id as string;

  useEffect(() => {
    async function loadClient() {
      if (!clientId) return;

      try {
        const data = await getClientWithMatters(clientId);
        setClient(data || null);
      } catch (error) {
        console.error('Failed to load client:', error);
      } finally {
        setLoading(false);
      }
    }

    loadClient();
  }, [clientId]);

  const handleDelete = async () => {
    if (!session?.user.id || !client) return;

    setDeleting(true);

    try {
      await createAuditLog({
        entityType: 'client',
        entityId: client.id,
        action: 'delete',
        details: JSON.stringify({ name: client.name }),
        userId: session.user.id,
        userEmail: session.user.email,
      });

      await deleteClient(client.id);
      router.push('/clients');
    } catch (error) {
      console.error('Failed to delete client:', error);
      setDeleting(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!session?.user.id || !client) return;

    const newStatus = client.status === 'active' ? 'inactive' : 'active';

    await updateClient(client.id, { status: newStatus });
    await createAuditLog({
      entityType: 'client',
      entityId: client.id,
      action: 'update',
      details: JSON.stringify({ status: newStatus }),
      userId: session.user.id,
      userEmail: session.user.email,
    });

    setClient({ ...client, status: newStatus });
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold mb-2">Client not found</h2>
        <p className="text-muted-foreground mb-4">
          The client you're looking for doesn't exist or has been deleted.
        </p>
        <Link href="/clients" className={buttonVariants()}>
          Back to Clients
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={client.name}
        description={`Client since ${formatDate(client.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <Link href="/clients" className={buttonVariants({ variant: 'ghost' })}>
              <ArrowLeft size={20} className="mr-2" />
              Back
            </Link>
            <Link href={`/clients/${client.id}/edit`} className={buttonVariants({ variant: 'outline' })}>
              <Pencil size={20} className="mr-2" />
              Edit
            </Link>
            <AlertDialog>
              <AlertDialogTrigger render={<Button variant="destructive" disabled={deleting} />}>
                <Trash size={20} className="mr-2" />
                Delete
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Client?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {client.name} and all associated
                    matters, transactions, and holds. This action cannot be undone.
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Info */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Client Information</CardTitle>
              <Badge
                variant={client.status === 'active' ? 'default' : 'secondary'}
                className="cursor-pointer"
                onClick={handleToggleStatus}
              >
                {client.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Envelope size={20} className="text-muted-foreground mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <a
                  href={`mailto:${client.email}`}
                  className="text-primary hover:underline"
                >
                  {client.email}
                </a>
              </div>
            </div>

            {client.phone && (
              <div className="flex items-start gap-3">
                <Phone size={20} className="text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <a
                    href={`tel:${client.phone}`}
                    className="text-primary hover:underline"
                  >
                    {client.phone}
                  </a>
                </div>
              </div>
            )}

            {client.address && (
              <div className="flex items-start gap-3">
                <MapPin size={20} className="text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p>{client.address}</p>
                </div>
              </div>
            )}

            {client.notes && (
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-1">Notes</p>
                <p className="text-sm">{client.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Matters */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Matters</CardTitle>
                <CardDescription>
                  Total balance: {formatCurrency(client.totalBalance)}
                </CardDescription>
              </div>
              <Link href={`/matters/new?clientId=${client.id}`} className={buttonVariants()}>
                <Plus size={20} className="mr-2" />
                New Matter
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {client.matters.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Briefcase size={32} className="mx-auto mb-2 opacity-50" />
                <p>No matters yet</p>
                <Link href={`/matters/new?clientId=${client.id}`} className={buttonVariants({ variant: 'link', size: 'sm' })}>
                  Create the first matter
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {client.matters.map((matter) => (
                  <Link
                    key={matter.id}
                    href={`/matters/${matter.id}`}
                    className="flex items-center justify-between p-4 border rounded-lg hover:border-primary/50 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{matter.name}</h4>
                        <Badge
                          variant={matter.status === 'open' ? 'default' : 'secondary'}
                        >
                          {matter.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {matter.matterNumber}
                        {matter.practiceArea && ` • ${matter.practiceArea}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatCurrency(matter.balance)}</p>
                      {matter.totalHolds > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(matter.totalHolds)} held
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
    </div>
  );
}
