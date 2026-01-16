'use client';

/**
 * Settings Page
 *
 * Configure trust account settings.
 */

import { useEffect, useState } from 'react';
import { useSession } from '@/lib/contexts/user-context';
import { getTrustAccountSettings, saveTrustAccountSettings, createAuditLog } from '@/lib/storage';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle } from '@phosphor-icons/react';
import type { TrustAccountSettings } from '@/types/iolta';

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'District of Columbia', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois',
  'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts',
  'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada',
  'New Hampshire', 'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
  'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington',
  'West Virginia', 'Wisconsin', 'Wyoming',
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<TrustAccountSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Form state
  const [firmName, setFirmName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [state, setState] = useState('');

  useEffect(() => {
    async function loadSettings() {
      if (!session?.user.id) return;

      try {
        const data = await getTrustAccountSettings(session.user.id);
        if (data) {
          setSettings(data);
          setFirmName(data.firmName);
          setBankName(data.bankName);
          setAccountNumber(data.accountNumber);
          setRoutingNumber(data.routingNumber || '');
          setState(data.state);
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, [session?.user.id]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!session?.user.id) return;

    setSaving(true);
    setSaved(false);

    try {
      // Mask account number (keep last 4 digits)
      const maskedAccount = accountNumber.slice(-4).padStart(accountNumber.length, '*');

      const newSettings = await saveTrustAccountSettings({
        firmName,
        bankName,
        accountNumber: maskedAccount,
        routingNumber: routingNumber || undefined,
        state,
        createdBy: session.user.id,
      });

      await createAuditLog({
        entityType: 'settings',
        entityId: newSettings.id,
        action: settings ? 'update' : 'create',
        details: JSON.stringify({ firmName, bankName, state }),
        userId: session.user.id,
        userEmail: session.user.email,
      });

      setSettings(newSettings);
      setSaved(true);

      // Hide saved message after 3 seconds
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Failed to save settings:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-muted rounded w-32" />
        <div className="h-64 bg-muted rounded-lg" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Configure your trust account settings"
      />

      <div className="max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Trust Account Information</CardTitle>
            <CardDescription>
              This information is used for compliance reports and correspondence.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="firmName">Firm Name *</Label>
                <Input
                  id="firmName"
                  value={firmName}
                  onChange={(e) => setFirmName(e.target.value)}
                  placeholder="Smith & Associates, LLP"
                  required
                  disabled={saving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="state">State Bar Jurisdiction *</Label>
                <Select value={state} onValueChange={(v) => v && setState(v)} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select state" />
                  </SelectTrigger>
                  <SelectContent>
                    {US_STATES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  IOLTA compliance rules vary by state.
                </p>
              </div>

              <div className="border-t pt-6">
                <h3 className="font-medium mb-4">Bank Account Details</h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name *</Label>
                    <Input
                      id="bankName"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="First National Bank"
                      required
                      disabled={saving}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number *</Label>
                      <Input
                        id="accountNumber"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="****1234"
                        required
                        disabled={saving}
                      />
                      <p className="text-xs text-muted-foreground">
                        Only the last 4 digits will be stored.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="routingNumber">Routing Number</Label>
                      <Input
                        id="routingNumber"
                        value={routingNumber}
                        onChange={(e) => setRoutingNumber(e.target.value)}
                        placeholder="Optional"
                        disabled={saving}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-4 pt-4">
                {saved && (
                  <div className="flex items-center gap-2 text-primary">
                    <CheckCircle size={20} />
                    <span className="text-sm">Settings saved</span>
                  </div>
                )}
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Settings'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Data Management */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>
              Manage your stored data. All data is stored locally in your browser.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium mb-1">Local Storage Only</h4>
                <p className="text-sm text-muted-foreground mb-3">
                  This is a demo application. All data is stored in your browser's
                  IndexedDB and will persist until you clear your browser data.
                </p>
                <p className="text-sm text-muted-foreground">
                  For production use, connect to a real database using the patterns
                  in <code className="bg-background px-1 rounded">skills/database/SKILL.md</code>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
