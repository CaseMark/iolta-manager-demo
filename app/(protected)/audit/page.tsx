'use client';

/**
 * Audit Log Page
 *
 * View all trust account activity for compliance.
 */

import { useEffect, useState } from 'react';
import { useSession } from '@/lib/auth/client';
import { getAuditLogs } from '@/lib/storage';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';
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
  MagnifyingGlass,
  ClockCounterClockwise,
  Plus,
  Pencil,
  Trash,
  Eye,
  Export,
  Funnel,
} from '@phosphor-icons/react';
import type { AuditLog, AuditAction } from '@/types/iolta';

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date));
}

function getActionIcon(action: AuditAction) {
  switch (action) {
    case 'create':
      return <Plus size={16} />;
    case 'update':
      return <Pencil size={16} />;
    case 'delete':
      return <Trash size={16} />;
    case 'view':
      return <Eye size={16} />;
    case 'export':
      return <Export size={16} />;
  }
}

function getActionColor(): string {
  return 'bg-muted text-muted-foreground';
}

export default function AuditPage() {
  const { data: session } = useSession();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');

  useEffect(() => {
    async function loadLogs() {
      if (!session?.user.id) return;

      try {
        const data = await getAuditLogs({ userId: session.user.id }, 500);
        setLogs(data);
      } catch (error) {
        console.error('Failed to load audit logs:', error);
      } finally {
        setLoading(false);
      }
    }

    loadLogs();
  }, [session?.user.id]);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch =
      log.userEmail.toLowerCase().includes(search.toLowerCase()) ||
      log.entityType.toLowerCase().includes(search.toLowerCase()) ||
      log.details.toLowerCase().includes(search.toLowerCase());

    const matchesAction = !actionFilter || log.action === actionFilter;
    const matchesEntity = !entityFilter || log.entityType === entityFilter;

    return matchesSearch && matchesAction && matchesEntity;
  });

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-32" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-16 bg-muted rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Audit Log"
        description="Complete history of all trust account activity"
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <MagnifyingGlass
            size={20}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search audit logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Funnel size={18} className="self-center text-muted-foreground hidden sm:block" />
        <Select value={actionFilter} onValueChange={(v) => setActionFilter(v ?? '')}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Actions</SelectItem>
            <SelectItem value="create">Create</SelectItem>
            <SelectItem value="update">Update</SelectItem>
            <SelectItem value="delete">Delete</SelectItem>
            <SelectItem value="view">View</SelectItem>
            <SelectItem value="export">Export</SelectItem>
          </SelectContent>
        </Select>
        <Select value={entityFilter} onValueChange={(v) => setEntityFilter(v ?? '')}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="All Entities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Entities</SelectItem>
            <SelectItem value="client">Client</SelectItem>
            <SelectItem value="matter">Matter</SelectItem>
            <SelectItem value="transaction">Transaction</SelectItem>
            <SelectItem value="hold">Hold</SelectItem>
            <SelectItem value="report">Report</SelectItem>
            <SelectItem value="settings">Settings</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Logs List */}
      {filteredLogs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClockCounterClockwise
              size={48}
              className="mx-auto mb-4 text-muted-foreground opacity-50"
            />
            {logs.length === 0 ? (
              <>
                <h3 className="text-lg font-semibold mb-2">No activity yet</h3>
                <p className="text-muted-foreground">
                  Actions you take will appear here for compliance tracking.
                </p>
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
          {filteredLogs.map((log) => {
            let details;
            try {
              details = JSON.parse(log.details);
            } catch {
              details = { raw: log.details };
            }

            return (
              <Card key={log.id}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center ${getActionColor()}`}
                    >
                      {getActionIcon(log.action)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="capitalize">
                          {log.entityType}
                        </Badge>
                        <Badge variant="secondary" className="capitalize">
                          {log.action}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(log.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm">
                        <span className="font-medium">{log.userEmail}</span>
                        {' '}
                        {log.action === 'create' && 'created'}
                        {log.action === 'update' && 'updated'}
                        {log.action === 'delete' && 'deleted'}
                        {log.action === 'view' && 'viewed'}
                        {log.action === 'export' && 'exported'}
                        {' '}
                        {log.entityType}
                      </p>
                      {details && Object.keys(details).length > 0 && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {Object.entries(details)
                            .map(([key, value]) => `${key}: ${value}`)
                            .join(', ')}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {filteredLogs.length > 0 && (
        <p className="text-sm text-muted-foreground text-center mt-6">
          Showing {filteredLogs.length} of {logs.length} entries
        </p>
      )}
    </div>
  );
}
