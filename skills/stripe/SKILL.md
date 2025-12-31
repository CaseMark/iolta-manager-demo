# Stripe Integration Skill

## Purpose

This skill covers Stripe payment integration for subscriptions, checkout, credit/usage tracking, and webhook handling in legal tech applications.

## Key Concepts

- **Stripe SDK**: Official Stripe Node.js library
- **Subscriptions**: Recurring billing for SaaS
- **Checkout**: Hosted payment pages
- **Webhooks**: Real-time payment event notifications
- **Usage-Based Billing**: Track and bill for API usage/credits
- **Customer Portal**: Self-service subscription management

## Setup

### Installation

```bash
bun add stripe
bun add -D @stripe/stripe-js
```

### Environment Variables

```env
# .env.local
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

### Stripe Client

```typescript
// lib/stripe/client.ts
import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-12-15.clover', // Latest stable API version
  typescript: true,
});
```

## Project Structure

```
/
├── app/
│   ├── api/
│   │   ├── stripe/
│   │   │   ├── checkout/route.ts
│   │   │   ├── portal/route.ts
│   │   │   └── webhooks/route.ts
│   └── ...
├── lib/
│   ├── stripe/
│   │   ├── client.ts
│   │   ├── products.ts
│   │   ├── subscriptions.ts
│   │   └── webhooks.ts
└── ...
```

## Products and Prices

### Creating Products (Stripe Dashboard or API)

```typescript
// lib/stripe/products.ts
import { stripe } from './client';

export async function createProduct() {
  const product = await stripe.products.create({
    name: 'Pro Plan',
    description: 'Professional legal tech features',
  });
  
  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: 4900, // $49.00 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
    },
  });
  
  return { product, price };
}
```

### Listing Products

```typescript
export async function getProducts() {
  const products = await stripe.products.list({
    active: true,
    expand: ['data.default_price'],
  });
  
  return products.data;
}
```

## Checkout Session

### Creating Checkout Session

```typescript
// app/api/stripe/checkout/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getSession();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { priceId } = await request.json();
  
  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      customer_email: session.user.email,
      metadata: {
        userId: session.user.id,
      },
    });
    
    return NextResponse.json({ url: checkoutSession.url });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
```

### Client-Side Checkout Flow

```typescript
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export function SubscribeButton({ priceId }: { priceId: string }) {
  const [loading, setLoading] = useState(false);
  
  const handleSubscribe = async () => {
    setLoading(true);
    
    try {
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });
      
      const { url } = await response.json();
      
      if (url) {
        window.location.href = url;
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Button onClick={handleSubscribe} disabled={loading}>
      {loading ? 'Loading...' : 'Subscribe'}
    </Button>
  );
}
```

## Customer Portal

### Creating Portal Session

```typescript
// app/api/stripe/portal/route.ts
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe/client';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { users } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function POST() {
  const session = await getSession();
  
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Get user's Stripe customer ID from database
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, session.user.id));
  
  if (!user?.stripeCustomerId) {
    return NextResponse.json(
      { error: 'No subscription found' },
      { status: 404 }
    );
  }
  
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  });
  
  return NextResponse.json({ url: portalSession.url });
}
```

## Webhooks

### Setting Up Webhook Endpoint

```typescript
// app/api/stripe/webhooks/route.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe/client';
import { handleSubscriptionCreated, handleSubscriptionUpdated } from '@/lib/stripe/webhooks';

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
    
    console.log(`Webhook received: ${event.type}`);
    
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
        
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
        
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
        
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object);
        break;
        
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook error' },
      { status: 400 }
    );
  }
}
```

### Webhook Handlers

```typescript
// lib/stripe/webhooks.ts
import type Stripe from 'stripe';
import { db } from '@/lib/db';
import { users, subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function handleSubscriptionCreated(
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  const userId = subscription.metadata.userId;
  
  // Update user with Stripe customer ID
  await db
    .update(users)
    .set({ stripeCustomerId: customerId })
    .where(eq(users.id, userId));
  
  // Store subscription in database
  await db.insert(subscriptions).values({
    userId,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerId,
    status: subscription.status,
    priceId: subscription.items.data[0].price.id,
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
  });
}

export async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription
) {
  await db
    .update(subscriptions)
    .set({
      status: subscription.status,
      priceId: subscription.items.data[0].price.id,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
}

export async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription
) {
  await db
    .update(subscriptions)
    .set({ status: 'canceled' })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
}
```

## Usage-Based Billing

### Database Schema

```typescript
// lib/db/schema.ts
export const usageRecords = pgTable('usage_records', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  action: text('action').notNull(), // 'api_call', 'document_analysis', etc.
  quantity: integer('quantity').notNull().default(1),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const credits = pgTable('credits', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  balance: integer('balance').notNull().default(0),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

### Recording Usage

```typescript
// lib/usage/track.ts
import { db } from '@/lib/db';
import { usageRecords, credits } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function trackUsage(
  userId: string,
  action: string,
  quantity: number = 1
) {
  // Record usage
  await db.insert(usageRecords).values({
    userId,
    action,
    quantity,
  });
  
  // Deduct credits
  await db
    .update(credits)
    .set({
      balance: sql`${credits.balance} - ${quantity}`,
      updatedAt: new Date(),
    })
    .where(eq(credits.userId, userId));
}

export async function getCreditsBalance(userId: string) {
  const [result] = await db
    .select()
    .from(credits)
    .where(eq(credits.userId, userId));
  
  return result?.balance || 0;
}

export async function addCredits(userId: string, amount: number) {
  await db
    .update(credits)
    .set({
      balance: sql`${credits.balance} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(eq(credits.userId, userId));
}
```

### Metered Billing with Stripe

```typescript
// lib/stripe/metered-billing.ts
import { stripe } from './client';

export async function reportUsage(
  subscriptionItemId: string,
  quantity: number
) {
  const usageRecord = await stripe.subscriptionItems.createUsageRecord(
    subscriptionItemId,
    {
      quantity,
      timestamp: Math.floor(Date.now() / 1000),
      action: 'increment',
    }
  );
  
  return usageRecord;
}
```

## Subscription Management

### Check Subscription Status

```typescript
// lib/stripe/subscriptions.ts
import { stripe } from './client';
import { db } from '@/lib/db';
import { subscriptions } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function getActiveSubscription(userId: string) {
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));
  
  if (!subscription) {
    return null;
  }
  
  // Check if subscription is active and not expired
  const isActive = ['active', 'trialing'].includes(subscription.status);
  const notExpired = subscription.currentPeriodEnd > new Date();
  
  return isActive && notExpired ? subscription : null;
}

export async function hasActiveSubscription(userId: string) {
  const subscription = await getActiveSubscription(userId);
  return subscription !== null;
}
```

### Cancel Subscription

```typescript
export async function cancelSubscription(subscriptionId: string) {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
  
  return subscription;
}
```

## Testing

### Test Mode

Use test keys for development:
- Secret: `sk_test_...`
- Publishable: `pk_test_...`

### Test Cards

```
4242 4242 4242 4242  - Successful payment
4000 0000 0000 9995  - Declined payment
4000 0025 0000 3155  - 3D Secure required
```

### Testing Webhooks Locally

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login to Stripe
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/api/stripe/webhooks

# Copy the webhook signing secret to .env.local
# STRIPE_WEBHOOK_SECRET=whsec_...

# Trigger test events
stripe trigger customer.subscription.created
```

## Best Practices

1. **Use Webhooks**: Always handle subscription changes via webhooks
2. **Idempotency**: Webhook handlers should be idempotent
3. **Verify Signatures**: Always verify webhook signatures
4. **Store Customer IDs**: Link Stripe customer IDs to your users
5. **Handle Failures**: Implement retry logic for failed payments
6. **Test Mode**: Use test mode during development
7. **Secure Keys**: Never expose secret keys to client
8. **Track Usage**: Record all billable actions in database

## Common Patterns

### Protected Route with Subscription Check

```typescript
// app/dashboard/page.tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import { hasActiveSubscription } from '@/lib/stripe/subscriptions';

export default async function DashboardPage() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }
  
  const hasSubscription = await hasActiveSubscription(session.user.id);
  
  if (!hasSubscription) {
    redirect('/pricing');
  }
  
  return <div>Dashboard content</div>;
}
```

### Credits Check Middleware

```typescript
// lib/middleware/credits.ts
export async function checkCredits(userId: string, required: number = 1) {
  const balance = await getCreditsBalance(userId);
  
  if (balance < required) {
    throw new Error('Insufficient credits');
  }
  
  return true;
}
```

## Gotchas

- **Webhook Ordering**: Webhooks may arrive out of order
- **Idempotency**: Handle duplicate webhook events gracefully
- **Amounts in Cents**: Stripe uses cents, not dollars
- **Customer Email**: Use customer_email in checkout if no customer exists yet
- **Metadata Limits**: Max 500 characters per metadata value
- **Test Clocks**: Use Stripe test clocks to simulate subscription periods

## Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Testing Stripe](https://stripe.com/docs/testing)
