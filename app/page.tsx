'use client';

/**
 * Home Page
 *
 * Landing page that introduces the app and invites users to start using it.
 */

import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { 
  CurrencyDollar, 
  Users, 
  ChartLineUp, 
  FileText,
  Scales,
  ShieldCheck,
  ArrowRight 
} from '@phosphor-icons/react';

export default function HomePage() {
  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="w-full px-8 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Scales size={22} weight="duotone" className="text-primary" />
            <span className="text-foreground font-sans text-[15px]">IOLTA Manager</span>
          </div>
          <div className="flex items-center gap-2">
            <Link 
              href="/dashboard" 
              className={buttonVariants({ variant: 'outline', size: 'default' })}
            >
              Dashboard
            </Link>
            <Link 
              href="/dashboard" 
              className={buttonVariants({ size: 'default' })}
            >
              Open App
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section 
        className="py-20 px-6 border-b border-border"
        style={{ 
          background: 'linear-gradient(180deg, hsl(35 40% 96%) 0%, hsl(40 30% 94%) 100%)'
        }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl tracking-tight mb-6 text-foreground">
            Trust Account Management
          </h1>
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
            Manage client trust funds with confidence. Track deposits, disbursements, 
            and holds while maintaining full compliance with IOLTA regulations.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link 
              href="/dashboard" 
              className={buttonVariants({ size: 'lg' })}
            >
              <CurrencyDollar size={20} weight="bold" />
              Start Managing
            </Link>
            <Link 
              href="/dashboard" 
              className={buttonVariants({ size: 'lg', variant: 'outline' })}
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl text-center mb-12 text-foreground">
            Features Built for Legal Professionals
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Feature 1 */}
            <div className="border border-border bg-card p-6">
              <div 
                className="w-12 h-12 flex items-center justify-center mb-4"
                style={{ backgroundColor: 'hsl(24 100% 95%)' }}
              >
                <Users size={24} weight="fill" className="text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2 font-sans text-base">
                Client & Matter Management
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Organize clients and legal matters with trust account balances. 
                Track multiple matters per client with ease.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="border border-border bg-card p-6">
              <div 
                className="w-12 h-12 flex items-center justify-center mb-4"
                style={{ backgroundColor: 'hsl(24 100% 95%)' }}
              >
                <ChartLineUp size={24} weight="fill" className="text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2 font-sans text-base">
                Transaction Tracking
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Record deposits, disbursements, and holds with complete audit trails. 
                Attach references and check numbers to every transaction.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="border border-border bg-card p-6">
              <div 
                className="w-12 h-12 flex items-center justify-center mb-4"
                style={{ backgroundColor: 'hsl(24 100% 95%)' }}
              >
                <FileText size={24} weight="fill" className="text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-2 font-sans text-base">
                Compliance Reports
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Generate monthly trust summaries, client ledgers, and three-way 
                reconciliation reports. Export to PDF, Word, or text.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Secondary Features */}
      <section className="py-12 px-6 border-t border-border bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex items-start gap-4 p-5 border border-border bg-card">
              <div 
                className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'hsl(24 100% 95%)' }}
              >
                <ShieldCheck size={20} weight="fill" className="text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1 font-sans text-sm">
                  Hold Management
                </h3>
                <p className="text-sm text-muted-foreground">
                  Place holds on client funds with expiration dates. Prevent 
                  accidental disbursements of earmarked money.
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-5 border border-border bg-card">
              <div 
                className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'hsl(24 100% 95%)' }}
              >
                <Scales size={20} weight="fill" className="text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1 font-sans text-sm">
                  Full Audit Trail
                </h3>
                <p className="text-sm text-muted-foreground">
                  Every action is logged with timestamps. Maintain complete 
                  records for bar compliance and client inquiries.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-6 border-t border-border">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl mb-4 text-foreground">
            Ready to streamline your trust accounting?
          </h2>
          <p className="text-muted-foreground mb-6">
            This demo runs entirely in your browser. No sign-up required to explore.
          </p>
          <Link 
            href="/dashboard" 
            className={buttonVariants({ size: 'lg' })}
          >
            Start Demo
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>
    </div>
  );
}
