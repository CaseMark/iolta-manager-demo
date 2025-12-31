# Authentication Skill

## Purpose

This skill covers authentication and authorization using Auth.js (NextAuth.js) in Next.js 15+ applications with support for OAuth providers and session management.

## Key Concepts

- **Auth.js**: Flexible authentication library for modern web apps
- **Session Management**: Server-side sessions with JWT or database
- **OAuth Providers**: Google, GitHub, Microsoft, and more
- **Protected Routes**: Middleware-based route protection
- **Role-Based Access Control (RBAC)**: User permissions and roles

## Setup

### Installation

```bash
bun add next-auth@beta
```

> Note: Use `@beta` for Next.js 15+ compatibility

### Environment Variables

```env
# .env.local
AUTH_SECRET=your-secret-here # Generate with: openssl rand -base64 32
NEXTAUTH_URL=http://localhost:3000

# OAuth Providers
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...

GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
```

## Project Structure

```
/
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts
│   ├── login/
│   │   └── page.tsx
│   └── dashboard/
│       └── page.tsx
├── lib/
│   └── auth/
│       ├── config.ts
│       └── options.ts
├── middleware.ts
└── auth.ts
```

## Configuration

### Basic Setup

```typescript
// auth.ts
import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
      }
      return session;
    },
  },
});
```

### API Route Handler

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from '@/auth';

export const { GET, POST } = handlers;
```

## Middleware Protection

### Protect All Routes

```typescript
// middleware.ts
export { auth as middleware } from '@/auth';

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### Custom Middleware Logic

```typescript
// middleware.ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const { auth: session, nextUrl } = req;
  
  // Public routes
  const isPublic = ['/login', '/register', '/'].includes(nextUrl.pathname);
  
  if (!session && !isPublic) {
    const loginUrl = new URL('/login', nextUrl.origin);
    loginUrl.searchParams.set('callbackUrl', nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  
  // Redirect authenticated users away from login
  if (session && nextUrl.pathname === '/login') {
    return NextResponse.redirect(new URL('/dashboard', nextUrl.origin));
  }
  
  return NextResponse.next();
});

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

## Session Management

### Get Session in Server Component

```typescript
// app/dashboard/page.tsx
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }
  
  return (
    <div>
      <h1>Welcome, {session.user?.name}</h1>
      <p>Email: {session.user?.email}</p>
    </div>
  );
}
```

### Get Session in Client Component

```typescript
'use client';

import { useSession } from 'next-auth/react';

export function UserProfile() {
  const { data: session, status } = useSession();
  
  if (status === 'loading') {
    return <div>Loading...</div>;
  }
  
  if (!session) {
    return <div>Not authenticated</div>;
  }
  
  return (
    <div>
      <p>Signed in as {session.user?.email}</p>
    </div>
  );
}
```

### Session Provider (Required for Client Components)

```typescript
// app/layout.tsx
import { SessionProvider } from 'next-auth/react';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
```

## Authentication UI

### Sign In Page

```typescript
// app/login/page.tsx
import { signIn } from '@/auth';
import { Button } from '@/components/ui/button';
import { redirect } from 'next/navigation';

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="w-full max-w-md space-y-4">
        <h1 className="text-2xl font-bold">Sign In</h1>
        
        <form
          action={async () => {
            'use server';
            const params = await searchParams;
            await signIn('google', { 
              redirectTo: params.callbackUrl || '/dashboard',
            });
          }}
        >
          <Button type="submit" className="w-full">
            Sign in with Google
          </Button>
        </form>
        
        <form
          action={async () => {
            'use server';
            const params = await searchParams;
            await signIn('github', {
              redirectTo: params.callbackUrl || '/dashboard',
            });
          }}
        >
          <Button type="submit" variant="outline" className="w-full">
            Sign in with GitHub
          </Button>
        </form>
      </div>
    </div>
  );
}
```

### Sign Out Button

```typescript
// components/SignOutButton.tsx
import { signOut } from '@/auth';
import { Button } from '@/components/ui/button';

export function SignOutButton() {
  return (
    <form
      action={async () => {
        'use server';
        await signOut({ redirectTo: '/' });
      }}
    >
      <Button type="submit" variant="outline">
        Sign Out
      </Button>
    </form>
  );
}
```

## Protected API Routes

### API Route with Auth Check

```typescript
// app/api/protected/route.ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export const GET = auth(async function GET(req) {
  if (!req.auth) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
  
  const userId = req.auth.user?.id;
  
  // Fetch user-specific data
  const data = await getData(userId);
  
  return NextResponse.json(data);
});
```

## Database Integration

### Drizzle Adapter

```typescript
// auth.ts
import NextAuth from 'next-auth';
import { DrizzleAdapter } from '@auth/drizzle-adapter';
import { db } from '@/lib/db';

export const { auth, handlers, signIn, signOut } = NextAuth({
  adapter: DrizzleAdapter(db),
  providers: [
    // Your providers
  ],
});
```

### Database Schema

```typescript
// lib/db/schema.ts
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name'),
  email: text('email').notNull().unique(),
  emailVerified: timestamp('email_verified'),
  image: text('image'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const accounts = pgTable('accounts', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  provider: text('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(),
  refreshToken: text('refresh_token'),
  accessToken: text('access_token'),
  expiresAt: timestamp('expires_at'),
  tokenType: text('token_type'),
  scope: text('scope'),
  idToken: text('id_token'),
  sessionState: text('session_state'),
});

export const sessions = pgTable('sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  sessionToken: text('session_token').notNull().unique(),
  expires: timestamp('expires').notNull(),
});

export const verificationTokens = pgTable('verification_tokens', {
  identifier: text('identifier').notNull(),
  token: text('token').notNull().unique(),
  expires: timestamp('expires').notNull(),
});
```

## Role-Based Access Control

### Extended User Type

```typescript
// types/next-auth.d.ts
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: 'admin' | 'user';
      email: string;
      name?: string;
      image?: string;
    };
  }
  
  interface User {
    role: 'admin' | 'user';
  }
}
```

### Add Role to Session

```typescript
// auth.ts
export const { auth, handlers, signIn, signOut } = NextAuth({
  // ... other config
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub!;
        session.user.role = token.role as 'admin' | 'user';
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
      }
      return token;
    },
  },
});
```

### Check Role in Component

```typescript
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export default async function AdminPage() {
  const session = await auth();
  
  if (!session || session.user.role !== 'admin') {
    redirect('/unauthorized');
  }
  
  return <div>Admin Dashboard</div>;
}
```

## Common Patterns

### Utility Function for Auth Check

```typescript
// lib/auth/utils.ts
import { auth } from '@/auth';
import { redirect } from 'next/navigation';

export async function requireAuth() {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }
  
  return session;
}

export async function requireAdmin() {
  const session = await requireAuth();
  
  if (session.user.role !== 'admin') {
    redirect('/unauthorized');
  }
  
  return session;
}
```

### Usage in Server Components

```typescript
import { requireAuth } from '@/lib/auth/utils';

export default async function ProtectedPage() {
  const session = await requireAuth();
  
  return <div>Welcome, {session.user.name}</div>;
}
```

## OAuth Provider Setup

### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
6. Copy Client ID and Client Secret to `.env.local`

### GitHub OAuth

1. Go to GitHub Settings → Developer settings → OAuth Apps
2. Create a new OAuth App
3. Authorization callback URL: `http://localhost:3000/api/auth/callback/github`
4. Copy Client ID and generate Client Secret
5. Add to `.env.local`

## Best Practices

1. **Use Middleware**: Protect routes at the middleware level for better performance
2. **Type Safety**: Extend Next Auth types for custom user properties
3. **Database Adapter**: Use database adapter for production apps
4. **Secure Secrets**: Use strong AUTH_SECRET, never commit to git
5. **Callback URLs**: Always validate and sanitize callback URLs
6. **Session Duration**: Set appropriate session expiration times
7. **Error Handling**: Implement custom error pages for auth failures

## Gotchas

- **Beta Version**: Use `next-auth@beta` for Next.js 15+ support
- **Session Provider**: Required for client-side session access
- **Middleware Matcher**: Be careful with matcher patterns to avoid auth loops
- **Params are Promises**: In Next.js 15+, searchParams must be awaited
- **JWT vs Database**: Choose session strategy based on your needs
- **OAuth Redirects**: Configure correct callback URLs in provider settings
- **Server Actions**: Use 'use server' for sign in/out forms

## Resources

- [Auth.js Documentation](https://authjs.dev)
- [Next.js Authentication](https://nextjs.org/docs/app/building-your-application/authentication)
- [Auth.js Providers](https://authjs.dev/getting-started/providers)
- [Drizzle Adapter](https://authjs.dev/reference/adapter/drizzle)
