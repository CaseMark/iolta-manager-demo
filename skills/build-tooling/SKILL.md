# Build Tooling Skill

## Purpose

This skill covers Bun runtime, build tooling, TypeScript compilation, and development workflows in the create-legal-app starter kit.

## Key Concepts

- **Bun**: Fast all-in-one JavaScript runtime, bundler, and package manager
- **TypeScript**: Type-safe JavaScript with static type checking
- **Next.js Build**: Production build optimization
- **Development Server**: Hot module replacement and fast refresh

## Bun Runtime

### Why Bun?

Bun is significantly faster than Node.js and npm:
- **3x faster** package installation
- **Built-in TypeScript** support - no ts-node needed
- **Native bundler** - no webpack/rollup configuration
- **Fast module resolution** and execution
- **Drop-in replacement** for Node.js

### Bun Commands

```bash
# Package management
bun install                  # Install dependencies
bun add [package]           # Add package
bun add -D [package]        # Add dev dependency
bun remove [package]        # Remove package
bun update                  # Update all packages

# Running scripts
bun run dev                 # Run development server
bun run build               # Build for production
bun run start               # Start production server
bun run lint                # Run ESLint

# Direct execution
bun index.ts                # Run TypeScript directly
bunx [package]              # Run package without installing
```

### package.json Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "type-check": "tsc --noEmit",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:push": "drizzle-kit push",
    "db:studio": "drizzle-kit studio"
  }
}
```

## TypeScript

### Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Type Checking

```bash
# Check types without emitting files
bun run type-check

# Watch mode
tsc --noEmit --watch

# Check specific file
tsc --noEmit path/to/file.ts
```

### Common TypeScript Patterns

#### Component Props

```typescript
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline';
  onClick?: () => void;
  disabled?: boolean;
}

export function Button({ 
  children, 
  variant = 'default',
  onClick,
  disabled = false 
}: ButtonProps) {
  // Implementation
}
```

#### API Response Types

```typescript
interface ApiResponse<T> {
  data: T;
  error?: string;
  meta?: {
    page: number;
    total: number;
  };
}

type CaseResponse = ApiResponse<Case[]>;
```

#### Utility Types

```typescript
// Make all properties optional
type PartialCase = Partial<Case>;

// Make all properties required
type RequiredCase = Required<Case>;

// Pick specific properties
type CasePreview = Pick<Case, 'id' | 'title' | 'status'>;

// Omit specific properties
type CaseWithoutDates = Omit<Case, 'createdAt' | 'updatedAt'>;
```

## Next.js Build Process

### Development Build

```bash
bun dev
# Starts on http://localhost:3000
# Hot module replacement enabled
# Fast refresh for React components
```

Development mode features:
- Fast refresh for instant updates
- Detailed error messages
- Source maps for debugging
- No optimization for faster builds

### Production Build

```bash
# Build for production
bun run build

# Output analysis
# - Shows bundle sizes
# - Route information
# - Static/dynamic routes
```

Build output example:
```
Route (app)                              Size     First Load JS
┌ ○ /                                    5.2 kB         92 kB
├ ○ /about                               3.1 kB         90 kB
└ ○ /cases/[id]                          4.5 kB         91 kB

○  (Static)  prerendered as static HTML
λ  (Dynamic) dynamically rendered
```

### Running Production Build

```bash
bun start
# Runs optimized production server
```

## Build Optimization

### Code Splitting

Next.js automatically splits code by route:

```typescript
// Automatic code splitting by route
// app/cases/page.tsx is in a separate bundle
// app/dashboard/page.tsx is in another bundle
```

### Dynamic Imports

```typescript
import dynamic from 'next/dynamic';

// Load component only when needed
const DynamicChart = dynamic(() => import('@/components/Chart'), {
  loading: () => <div>Loading chart...</div>,
  ssr: false, // Disable server-side rendering if needed
});

export function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <DynamicChart />
    </div>
  );
}
```

### Image Optimization

```typescript
import Image from 'next/image';

export function Logo() {
  return (
    <Image
      src="/logo.png"
      alt="Logo"
      width={200}
      height={50}
      priority // Load immediately for above-fold images
    />
  );
}
```

### Font Optimization

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({ 
  subsets: ['latin'],
  display: 'swap', // Use swap strategy for better performance
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.className}>
      <body>{children}</body>
    </html>
  );
}
```

## Environment Variables

### Setup

```env
# .env.local (not committed to git)
DATABASE_URL=postgresql://...
NEXT_PUBLIC_API_URL=https://api.example.com
STRIPE_SECRET_KEY=sk_test_...
CASE_API_KEY=...
```

### Usage

```typescript
// Server-side only
const dbUrl = process.env.DATABASE_URL;

// Client-side accessible (must have NEXT_PUBLIC_ prefix)
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

### Type Safety for Environment Variables

```typescript
// env.d.ts
declare namespace NodeJS {
  interface ProcessEnv {
    DATABASE_URL: string;
    NEXT_PUBLIC_API_URL: string;
    STRIPE_SECRET_KEY: string;
    STRIPE_WEBHOOK_SECRET: string;
    CASE_API_KEY: string;
    OPENAI_API_KEY: string;
    NEXTAUTH_SECRET: string;
    NEXTAUTH_URL: string;
  }
}
```

## Linting and Formatting

### ESLint Configuration

```javascript
// eslint.config.mjs
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];

export default eslintConfig;
```

### Running Linter

```bash
# Check for issues
bun run lint

# Fix auto-fixable issues
bun run lint -- --fix
```

## Debugging

### Development Console

```typescript
// Server-side logging (appears in terminal)
console.log('Server log:', data);

// Client-side logging (appears in browser console)
'use client';
console.log('Client log:', data);
```

### TypeScript Debugging

```typescript
// Use type assertions when you know better
const element = document.getElementById('root') as HTMLDivElement;

// Use satisfies for type checking without widening
const config = {
  apiUrl: 'https://api.example.com',
  timeout: 5000,
} satisfies Config;
```

### Source Maps

Development builds include source maps automatically. To debug production:

```javascript
// next.config.ts
const config: NextConfig = {
  productionBrowserSourceMaps: true, // Enable for production debugging
};
```

## Performance Analysis

### Analyze Bundle Size

```bash
# Install analyzer
bun add -D @next/bundle-analyzer

# Update next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);

# Run analysis
ANALYZE=true bun run build
```

### Lighthouse Scores

Run Lighthouse in Chrome DevTools:
1. Open DevTools (F12)
2. Go to Lighthouse tab
3. Generate report
4. Review Performance, Accessibility, Best Practices, SEO scores

## Common Development Tasks

### Starting Development

```bash
# Install dependencies
bun install

# Start dev server
bun dev
```

### Adding Dependencies

```bash
# Add runtime dependency
bun add [package]

# Add dev dependency
bun add -D [package]

# Example
bun add zod
bun add -D @types/node
```

### Type Checking During Development

```bash
# Run type check
bun run type-check

# Watch for changes
tsc --noEmit --watch
```

### Building for Production

```bash
# Type check first
bun run type-check

# Run linter
bun run lint

# Build
bun run build

# Test production build locally
bun start
```

## Best Practices

1. **Use Bun for Speed**: Leverage Bun's performance advantages
2. **Type Everything**: Avoid `any`, use proper TypeScript types
3. **Check Types**: Run type-check before building
4. **Environment Variables**: Use type-safe env variables
5. **Code Splitting**: Use dynamic imports for large components
6. **Optimize Images**: Always use Next.js Image component
7. **Analyze Bundle**: Regularly check bundle sizes
8. **Cache Dependencies**: Bun caches globally for faster installs

## Common Issues and Solutions

### Type Errors

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules bun.lockb
bun install

# Check types
bun run type-check
```

### Build Errors

```bash
# Clear all caches
rm -rf .next node_modules bun.lockb
bun install
bun run build
```

### Port Already in Use

```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port
PORT=3001 bun dev
```

## Gotchas

- **Bun vs Node**: Some npm packages may not work with Bun (rare)
- **Client vs Server**: Environment variables need NEXT_PUBLIC_ prefix for client
- **Type Checking**: `bun run dev` doesn't type check - run type-check separately
- **Import Paths**: Use `@/` alias, not relative paths
- **Build Cache**: Clear `.next` folder if seeing stale builds
- **Lockfile**: Commit `bun.lockb` for consistent installs

## Resources

- [Bun Documentation](https://bun.sh/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Next.js Compilation](https://nextjs.org/docs/architecture/nextjs-compiler)
- [Next.js Optimizations](https://nextjs.org/docs/app/building-your-application/optimizing)
