# API Routes Skill

## Purpose

This skill covers creating and working with API routes in Next.js 15+, including REST endpoints, server actions, and data fetching patterns.

## Key Concepts

- **Route Handlers**: API endpoints in the `app/api/` directory
- **Server Actions**: Server-side functions that can be called from client components
- **Server Components**: Can fetch data directly without API routes
- **Edge Runtime**: Optional edge runtime for global performance

## Route Handlers

### Basic GET Endpoint

```typescript
// app/api/cases/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  const cases = await getCases(); // Your data fetching logic
  
  return NextResponse.json(cases);
}
```

### POST Endpoint

```typescript
// app/api/cases/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate the input
    if (!body.title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      );
    }
    
    const newCase = await createCase(body);
    
    return NextResponse.json(newCase, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

### Dynamic Route Handler

```typescript
// app/api/cases/[id]/route.ts
import { NextResponse } from 'next/server';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: Request,
  context: RouteContext
) {
  const { id } = await context.params;
  const caseData = await getCaseById(id);
  
  if (!caseData) {
    return NextResponse.json(
      { error: 'Case not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json(caseData);
}

export async function PATCH(
  request: Request,
  context: RouteContext
) {
  const { id } = await context.params;
  const body = await request.json();
  
  const updated = await updateCase(id, body);
  
  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  context: RouteContext
) {
  const { id } = await context.params;
  
  await deleteCase(id);
  
  return NextResponse.json({ success: true });
}
```

### Query Parameters

```typescript
// app/api/search/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '10');
  
  const results = await search(query, { page, limit });
  
  return NextResponse.json(results);
}
```

### Headers and Cookies

```typescript
// app/api/protected/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  // Read headers
  const authorization = request.headers.get('authorization');
  
  // Read cookies
  const cookieStore = await cookies();
  const token = cookieStore.get('token');
  
  if (!token) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  const data = await getProtectedData();
  
  // Set cookies in response
  const response = NextResponse.json(data);
  response.cookies.set('lastAccess', new Date().toISOString());
  
  return response;
}
```

## Server Actions

Server actions allow you to run server-side code from client components without creating API routes.

### Creating Server Actions

```typescript
// app/actions/cases.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createCase(formData: FormData) {
  const title = formData.get('title') as string;
  const description = formData.get('description') as string;
  
  // Validate
  if (!title) {
    return { error: 'Title is required' };
  }
  
  // Create the case
  const newCase = await db.cases.create({
    title,
    description,
  });
  
  // Revalidate the cases list page
  revalidatePath('/cases');
  
  // Redirect to the new case
  redirect(`/cases/${newCase.id}`);
}

export async function updateCase(id: string, data: any) {
  'use server';
  
  const updated = await db.cases.update({
    where: { id },
    data,
  });
  
  revalidatePath(`/cases/${id}`);
  revalidatePath('/cases');
  
  return { success: true, case: updated };
}
```

### Using Server Actions in Forms

```typescript
// app/cases/new/page.tsx
import { createCase } from '@/app/actions/cases';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function NewCasePage() {
  return (
    <form action={createCase} className="space-y-4">
      <div>
        <label htmlFor="title">Title</label>
        <Input id="title" name="title" required />
      </div>
      
      <div>
        <label htmlFor="description">Description</label>
        <Textarea id="description" name="description" />
      </div>
      
      <Button type="submit">Create Case</Button>
    </form>
  );
}
```

### Using Server Actions with useTransition

```typescript
'use client';

import { useTransition } from 'react';
import { updateCase } from '@/app/actions/cases';
import { Button } from '@/components/ui/button';

export function UpdateButton({ caseId }: { caseId: string }) {
  const [isPending, startTransition] = useTransition();
  
  return (
    <Button
      onClick={() => {
        startTransition(async () => {
          await updateCase(caseId, { status: 'active' });
        });
      }}
      disabled={isPending}
    >
      {isPending ? 'Updating...' : 'Activate'}
    </Button>
  );
}
```

## Data Fetching in Server Components

Server components can fetch data directly without API routes:

```typescript
// app/cases/page.tsx
import { db } from '@/lib/db';
import { CaseCard } from '@/components/CaseCard';

export default async function CasesPage() {
  // Fetch directly in the component
  const cases = await db.cases.findMany({
    orderBy: { createdAt: 'desc' },
  });
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {cases.map((case) => (
        <CaseCard key={case.id} case={case} />
      ))}
    </div>
  );
}
```

### With Error Handling

```typescript
export default async function CasesPage() {
  try {
    const cases = await db.cases.findMany();
    
    return (
      <div>
        {cases.map((case) => (
          <CaseCard key={case.id} case={case} />
        ))}
      </div>
    );
  } catch (error) {
    console.error('Failed to fetch cases:', error);
    return <div>Failed to load cases</div>;
  }
}
```

## Caching and Revalidation

### Revalidate on Time Interval

```typescript
// Revalidate every hour
export const revalidate = 3600;

export default async function Page() {
  const data = await fetch('https://api.example.com/data');
  return <div>{/* Content */}</div>;
}
```

### Revalidate on Demand

```typescript
// app/actions/cases.ts
'use server';

import { revalidatePath, revalidateTag } from 'next/cache';

export async function createCase(data: any) {
  const newCase = await db.cases.create(data);
  
  // Revalidate specific path
  revalidatePath('/cases');
  
  // Or revalidate by tag
  revalidateTag('cases');
  
  return newCase;
}
```

### Fetch with Tags

```typescript
export default async function Page() {
  const cases = await fetch('https://api.example.com/cases', {
    next: { tags: ['cases'] },
  });
  
  return <div>{/* Content */}</div>;
}
```

## Authentication in API Routes

```typescript
// app/api/protected/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getSession();
  
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  const data = await getProtectedData(session.user.id);
  
  return NextResponse.json(data);
}
```

## Webhooks

```typescript
// app/api/webhooks/stripe/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');
  
  if (!signature) {
    return NextResponse.json(
      { error: 'No signature' },
      { status: 400 }
    );
  }
  
  try {
    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    
    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    return NextResponse.json(
      { error: 'Webhook error' },
      { status: 400 }
    );
  }
}
```

## Best Practices

1. **Use Server Components**: Fetch data in server components when possible
2. **Server Actions for Mutations**: Use server actions for create/update/delete
3. **API Routes for External**: Use API routes for webhooks and external APIs
4. **Type Safety**: Define types for request/response bodies
5. **Error Handling**: Always handle errors and return appropriate status codes
6. **Validation**: Validate all input data
7. **Revalidation**: Use revalidatePath/revalidateTag after mutations

## Gotchas

- **Params are Promises**: In Next.js 15+, params must be awaited
- **Server Actions Need 'use server'**: Must include at top of file or function
- **Cookies/Headers**: Must await cookies() and headers() functions
- **FormData**: Server actions receive FormData, not JSON
- **Redirects**: Use redirect() from 'next/navigation' in server actions
- **Edge Runtime**: Some Node.js APIs not available in edge runtime

## Resources

- [Next.js Route Handlers](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)
- [Server Actions](https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations)
- [Data Fetching](https://nextjs.org/docs/app/building-your-application/data-fetching)
