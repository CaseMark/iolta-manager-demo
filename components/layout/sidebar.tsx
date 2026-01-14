'use client';

/**
 * Sidebar Navigation for IOLTA Manager
 */

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuth, useSession } from '@/lib/auth/client';
import {
  House,
  Users,
  Briefcase,
  CurrencyDollar,
  Lock,
  FileText,
  ClockCounterClockwise,
  Gear,
  SignOut,
  List,
  X,
} from '@phosphor-icons/react';
import { useState } from 'react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: House },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/matters', label: 'Matters', icon: Briefcase },
  { href: '/transactions', label: 'Transactions', icon: CurrencyDollar },
  { href: '/holds', label: 'Holds', icon: Lock },
  { href: '/reports', label: 'Reports', icon: FileText },
  { href: '/audit', label: 'Audit Log', icon: ClockCounterClockwise },
  { href: '/settings', label: 'Settings', icon: Gear },
];

export function Sidebar() {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const { data: session } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/login';
  };

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="bg-white"
        >
          {mobileOpen ? <X size={20} /> : <List size={20} />}
        </Button>
      </div>

      {/* Backdrop for mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - Dark professional style */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-full w-64 bg-sidebar text-sidebar-foreground flex flex-col z-40 transition-transform duration-200',
          'lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="p-6 border-b border-sidebar-border">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-sidebar-primary flex items-center justify-center">
              <CurrencyDollar size={22} className="text-sidebar-primary-foreground" weight="bold" />
            </div>
            <div>
              <span className="text-base text-sidebar-foreground font-heading">IOLTA Manager</span>
              <p className="text-xs text-sidebar-foreground/60">Trust Accounting</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 overflow-y-auto">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground'
                    )}
                  >
                    <Icon size={20} weight={isActive ? 'fill' : 'regular'} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-sidebar-border">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="w-9 h-9 rounded-full bg-sidebar-accent flex items-center justify-center">
              <span className="text-sm font-semibold text-sidebar-foreground">
                {session?.user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">{session?.user.name}</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {session?.user.email}
              </p>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={handleSignOut}
          >
            <SignOut size={20} className="mr-2" />
            Sign Out
          </Button>
        </div>
      </aside>
    </>
  );
}
