# AGENTS.md

This document provides comprehensive guidance for AI agents working on the create-legal-app starter kit.

## Project Overview

This is a Next.js 15+ starter kit designed specifically for building legal tech applications with AI agent assistance. The codebase is structured to be agent-friendly with clear conventions, comprehensive documentation, and a well-defined architecture.

## Core Principles

1. **Clarity**: Every file, function, and component should have a clear, single purpose
2. **Consistency**: Follow established patterns throughout the codebase
3. **Documentation**: Maintain SKILL.md files for each major area of functionality
4. **Type Safety**: Use TypeScript strictly, avoid `any` types
5. **Agent-Friendly**: Structure code and documentation to accelerate AI-assisted development

## Tech Stack

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **UI Library**: Shadcn UI (Maia theme preset)
- **Icons**: Phosphor Icons
- **Font**: Inter
- **Styling**: Tailwind CSS with CSS variables
- **Runtime**: Bun
- **Database**: Neon (PostgreSQL)
- **ORM**: Drizzle
- **Authentication**: Auth.js / WorkOS
- **AI**: Vercel AI SDK 6
- **Payments**: Stripe
- **SDK**: Case.dev SDK

## Project Structure

```
/
├── app/                    # Next.js App Router pages and layouts
├── components/             # React components
│   ├── ui/                # Shadcn UI components
│   └── ...                # Custom components
├── lib/                   # Utility functions and shared code
├── public/                # Static assets
├── skills/                # SKILL.md documentation files
├── AGENTS.md              # This file - agent guidance
└── package.json
```

## Design System

This project uses the **Maia** preset from Shadcn UI with the following configuration:

- **Base**: Base (neutral foundation)
- **Style**: Maia
- **Base Color**: Neutral
- **Theme**: Neutral
- **Icon Library**: Phosphor
- **Font**: Inter
- **Menu Accent**: Subtle
- **Radius**: Default

### Color Usage

The theme uses CSS variables for colors. Reference these in your components:
- Primary actions: `bg-primary text-primary-foreground`
- Secondary actions: `bg-secondary text-secondary-foreground`
- Destructive actions: `bg-destructive text-destructive-foreground`
- Muted backgrounds: `bg-muted text-muted-foreground`

### Typography

- Use Inter font family (automatically configured)
- Heading hierarchy: `h1`, `h2`, `h3`, `h4`
- Body text: Use semantic HTML with Tailwind classes

## Component Guidelines

### Using Shadcn Components

1. All UI primitives are in `components/ui/`
2. Import components from `@/components/ui/[component-name]`
3. Customize variants using className prop
4. Never modify files in `components/ui/` directly

### Custom Components

1. Place in `components/` directory
2. Use PascalCase for filenames: `ComponentName.tsx`
3. Export as default or named export
4. Include props interface/type
5. Document complex components with JSDoc comments

Example:
```typescript
interface ButtonGroupProps {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
}

/**
 * ButtonGroup component for grouping related actions
 */
export function ButtonGroup({ 
  children, 
  orientation = 'horizontal' 
}: ButtonGroupProps) {
  // Implementation
}
```

## File Naming Conventions

- React Components: `PascalCase.tsx`
- Utilities: `kebab-case.ts`
- Types: `types.ts` or `[feature].types.ts`
- API Routes: `route.ts` (Next.js convention)
- Server Actions: `actions.ts`

## Code Style

### TypeScript

- Use strict mode
- Define interfaces for all props and data structures
- Avoid `any` - use `unknown` if type is truly unknown
- Use type inference where possible
- Export types that are used across files

### React

- Use functional components with hooks
- Prefer named exports for utilities, default for pages
- Use `async/await` for asynchronous operations
- Implement proper error boundaries
- Use Server Components by default, Client Components when needed

### Imports

Organize imports in this order:
1. React and Next.js imports
2. Third-party libraries
3. Absolute imports from `@/`
4. Relative imports
5. Type imports (use `import type`)

Example:
```typescript
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import type { User } from './types';
```

## SKILL.md Files

Each major feature area should have a `SKILL.md` file documenting:

1. **Purpose**: What this area handles
2. **Key Files**: Important files and their roles
3. **Patterns**: Common patterns used
4. **Examples**: Code examples for common tasks
5. **Gotchas**: Common pitfalls and how to avoid them

Location: `/skills/[area-name]/SKILL.md`

## Working with Agents

### For AI Assistants

When working on this codebase:

1. **Read First**: Check relevant SKILL.md files before making changes
2. **Follow Patterns**: Match existing code style and patterns
3. **Test Changes**: Verify changes don't break existing functionality
4. **Document**: Update SKILL.md files when adding new patterns
5. **Type Safety**: Ensure all new code is properly typed

### Common Tasks

- **Adding a new page**: Create in `app/` directory with `page.tsx`
- **Adding a component**: Place in `components/` with proper typing
- **Adding an API route**: Create `route.ts` in `app/api/` directory
- **Database changes**: Update Drizzle schema and run migrations
- **Styling**: Use Tailwind classes, reference design tokens

## Environment Setup

Create a `.env.local` file based on `.env.example` with:

```env
# Database
DATABASE_URL=

# Authentication
NEXTAUTH_URL=
NEXTAUTH_SECRET=

# Case.dev
CASE_API_KEY=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# AI
OPENAI_API_KEY=
```

## Development Workflow

1. **Install dependencies**: `bun install`
2. **Run dev server**: `bun dev`
3. **Run database migrations**: `bun db:migrate`
4. **Type checking**: `bun type-check`
5. **Linting**: `bun lint`

## Testing

(To be documented as testing infrastructure is added)

## Deployment

(To be documented as deployment process is defined)

## Getting Help

- Check relevant SKILL.md files in `/skills/` directory
- Review component examples in Shadcn documentation
- Refer to Next.js 15+ App Router documentation
- Check the Linear ticket CD-102 for requirements updates

## Version History

- Initial setup: Next.js 15+ with Shadcn UI Maia theme
- Branch: cd-102-casedev-blank-starter-codebase
