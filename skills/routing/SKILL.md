# Routing Skill

## Purpose

This skill covers the Next.js 15+ App Router, including pages, layouts, navigation, and route organization.

## Key Concepts

- **App Router**: Next.js 15+ uses the `app/` directory for routing
- **File-based Routing**: Folders define routes, special files define UI
- **Server Components**: Default component type (no `'use client'` needed)
- **Layouts**: Shared UI that wraps pages

## Special Files

- `page.tsx` - Unique UI for a route, makes route publicly accessible
- `layout.tsx` - Shared UI for a segment and its children
- `loading.tsx` - Loading UI for a segment
- `error.tsx` - Error UI for a segment
- `not-found.tsx` - Not found UI
- `route.ts` - API endpoint

## Creating Pages

### Basic Page

```typescript
// app/about/page.tsx
export default function AboutPage() {
  return (
    <div>
      <h1>About</h1>
      <p>Welcome to our about page.</p>
    </div>
  );
}
```

### Page with Metadata

```typescript
// app/about/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Learn more about our company',
};

export default function AboutPage() {
  return <div>{/* Content */}</div>;
}
```

### Dynamic Routes

```typescript
// app/cases/[id]/page.tsx
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CasePage({ params }: PageProps) {
  const { id } = await params;
  
  return (
    <div>
      <h1>Case {id}</h1>
    </div>
  );
}
```

### Multiple Dynamic Segments

```typescript
// app/teams/[teamId]/cases/[caseId]/page.tsx
interface PageProps {
  params: Promise<{ 
    teamId: string; 
    caseId: string;
  }>;
}

export default async function TeamCasePage({ params }: PageProps) {
  const { teamId, caseId } = await params;
  
  return (
    <div>
      <h1>Team {teamId} - Case {caseId}</h1>
    </div>
  );
}
```

## Layouts

### Root Layout

```typescript
// app/layout.tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Create Legal App',
  description: 'Legal tech application',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

### Nested Layout

```typescript
// app/dashboard/layout.tsx
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

## Navigation

### Link Component

```typescript
import Link from 'next/link';

export function Nav() {
  return (
    <nav>
      <Link href="/">Home</Link>
      <Link href="/about">About</Link>
      <Link href="/cases">Cases</Link>
    </nav>
  );
}
```

### Programmatic Navigation

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

export function GoButton() {
  const router = useRouter();
  
  return (
    <Button onClick={() => router.push('/dashboard')}>
      Go to Dashboard
    </Button>
  );
}
```

### With Search Params

```typescript
'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export function FilterControls() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set(key, value);
    router.push(`?${params.toString()}`);
  };
  
  return (
    <button onClick={() => updateFilter('status', 'active')}>
      Show Active
    </button>
  );
}
```

## Loading States

```typescript
// app/cases/loading.tsx
import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-1/3" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
```

## Error Handling

```typescript
// app/cases/error.tsx
'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
```

## Route Groups

Use parentheses to organize routes without affecting the URL:

```
app/
├── (marketing)/
│   ├── about/
│   │   └── page.tsx        # /about
│   └── contact/
│       └── page.tsx        # /contact
└── (app)/
    ├── dashboard/
    │   └── page.tsx        # /dashboard
    └── settings/
        └── page.tsx        # /settings
```

## Parallel Routes

```typescript
// app/dashboard/layout.tsx
export default function Layout({
  children,
  analytics,
  team,
}: {
  children: React.ReactNode;
  analytics: React.ReactNode;
  team: React.ReactNode;
}) {
  return (
    <div>
      {children}
      <div className="grid grid-cols-2 gap-4">
        {analytics}
        {team}
      </div>
    </div>
  );
}
```

```
app/dashboard/
├── @analytics/
│   └── page.tsx
├── @team/
│   └── page.tsx
├── layout.tsx
└── page.tsx
```

## Best Practices

1. **Server Components First**: Use server components by default
2. **Consistent Naming**: Always use lowercase for route folders
3. **Metadata**: Define metadata for SEO on every public page
4. **Loading States**: Provide loading.tsx for pages with data fetching
5. **Error Boundaries**: Add error.tsx for graceful error handling
6. **Route Groups**: Use route groups for organization without URL changes

## Gotchas

- **Params are Promises**: In Next.js 15+, params must be awaited
- **Client Hooks**: `useRouter`, `useSearchParams` need `'use client'`
- **Layout Persistence**: Layouts don't remount on navigation
- **Metadata in Layouts**: You can export metadata from layouts too
- **File Names**: `page.tsx` not `Page.tsx` (lowercase)

## Common Patterns

### Protected Route

```typescript
// app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function DashboardPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }
  
  return <div>Dashboard</div>;
}
```

### Search Params in Server Component

```typescript
// app/cases/page.tsx
interface PageProps {
  searchParams: Promise<{ status?: string; page?: string }>;
}

export default async function CasesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = params.status || 'all';
  const page = parseInt(params.page || '1');
  
  return (
    <div>
      <h1>Cases - {status}</h1>
      {/* Content */}
    </div>
  );
}
```

## Resources

- [Next.js App Router Documentation](https://nextjs.org/docs/app)
- [Routing Fundamentals](https://nextjs.org/docs/app/building-your-application/routing)
- [Layouts and Templates](https://nextjs.org/docs/app/building-your-application/routing/layouts-and-templates)
