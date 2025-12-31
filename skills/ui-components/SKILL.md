# UI Components Skill

## Purpose

This skill covers working with UI components in the create-legal-app starter kit, including Shadcn UI components and custom components.

## Key Files

- `components/ui/*` - Shadcn UI primitive components (auto-generated, don't edit)
- `components/*` - Custom application components
- `components.json` - Shadcn configuration file

## Theme Configuration

This project uses the **Maia** preset with these settings:

```json
{
  "base": "base",
  "style": "maia",
  "baseColor": "neutral",
  "theme": "neutral",
  "iconLibrary": "phosphor",
  "font": "inter",
  "menuAccent": "subtle",
  "radius": "default"
}
```

## Adding Shadcn Components

To add a new Shadcn component:

```bash
bunx --bun shadcn@latest add [component-name]
```

Example:
```bash
bunx --bun shadcn@latest add dialog
bunx --bun shadcn@latest add table
```

## Creating Custom Components

### File Structure

Place custom components in `components/` directory:

```
components/
├── ui/              # Shadcn components (don't edit)
├── layout/          # Layout components
├── forms/           # Form components
└── features/        # Feature-specific components
```

### Component Template

```typescript
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface MyComponentProps {
  children: ReactNode;
  variant?: 'default' | 'outlined';
  className?: string;
}

/**
 * MyComponent - A custom component
 * 
 * @param children - Component children
 * @param variant - Visual variant
 * @param className - Additional CSS classes
 */
export function MyComponent({ 
  children, 
  variant = 'default',
  className 
}: MyComponentProps) {
  return (
    <div className={cn(
      'base-styles',
      variant === 'outlined' && 'border border-border',
      className
    )}>
      {children}
    </div>
  );
}
```

## Using Phosphor Icons

This project uses Phosphor Icons. Import from `@phosphor-icons/react`:

```typescript
import { MagnifyingGlass, User, Bell } from '@phosphor-icons/react';

export function Header() {
  return (
    <header>
      <MagnifyingGlass size={20} weight="regular" />
      <User size={20} weight="bold" />
      <Bell size={20} weight="light" />
    </header>
  );
}
```

Icon weights: `thin`, `light`, `regular`, `bold`, `fill`, `duotone`

## Styling Patterns

### Using Theme Colors

Always use CSS variables for colors:

```typescript
<Button className="bg-primary text-primary-foreground">
  Primary Action
</Button>

<div className="bg-muted text-muted-foreground">
  Muted background
</div>

<Button variant="destructive">
  Delete
</Button>
```

### Responsive Design

Use Tailwind responsive prefixes:

```typescript
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* Content */}
</div>
```

### Dark Mode

Colors automatically adapt to dark mode via CSS variables. Test both themes:

```typescript
// No special handling needed - colors adapt automatically
<div className="bg-background text-foreground">
  Content works in both light and dark mode
</div>
```

## Common Patterns

### Card Layout

```typescript
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function FeatureCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>Card description text</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Content */}
      </CardContent>
    </Card>
  );
}
```

### Form with Validation

```typescript
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export function LoginForm() {
  return (
    <form className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input 
          id="email" 
          type="email" 
          placeholder="you@example.com"
        />
      </div>
      <Button type="submit">Sign In</Button>
    </form>
  );
}
```

### Dialog Pattern

```typescript
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function ConfirmDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline">Open Dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Action</DialogTitle>
          <DialogDescription>
            Are you sure you want to proceed?
          </DialogDescription>
        </DialogHeader>
        {/* Dialog content */}
      </DialogContent>
    </Dialog>
  );
}
```

## Best Practices

1. **Don't Edit UI Components**: Never modify files in `components/ui/` - they're auto-generated
2. **Use cn() Helper**: Always use `cn()` from `@/lib/utils` for className merging
3. **Type Your Props**: Always define TypeScript interfaces for component props
4. **Composition Over Configuration**: Build complex components by composing simple ones
5. **Accessibility**: Use semantic HTML and ARIA attributes
6. **Consistent Spacing**: Use Tailwind spacing scale (p-4, gap-6, etc.)

## Gotchas

- **Import Paths**: Always use `@/components/ui/[name]` not relative paths
- **Client Components**: Add `'use client'` directive if using hooks or browser APIs
- **CSS Variables**: Don't use hard-coded colors - always use theme variables
- **Icon Library**: Use Phosphor Icons, not other icon libraries
- **Font Loading**: Inter font is configured globally, don't add font imports

## Examples

See `components/example.tsx` and `components/component-example.tsx` for reference implementations.

## Resources

- [Shadcn UI Documentation](https://ui.shadcn.com/)
- [Phosphor Icons](https://phosphoricons.com/)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Next.js Components](https://nextjs.org/docs/app/building-your-application/optimizing/fonts)
