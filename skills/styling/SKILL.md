# Styling Skill

## Purpose

This skill covers styling patterns using Tailwind CSS and the Maia theme preset in the create-legal-app starter kit.

## Key Files

- `app/globals.css` - Global styles and CSS variables
- `tailwind.config.ts` - Tailwind configuration
- `components.json` - Shadcn theme configuration

## Theme System

### CSS Variables

The Maia theme uses CSS variables for colors. These are defined in `app/globals.css`:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 0 0% 3.9%;
  --primary: 0 0% 9%;
  --primary-foreground: 0 0% 98%;
  /* ... more variables */
}

.dark {
  --background: 0 0% 3.9%;
  --foreground: 0 0% 98%;
  /* ... dark mode variables */
}
```

### Using Theme Colors

Always reference colors through Tailwind classes:

```typescript
// Good
<div className="bg-background text-foreground">Content</div>
<Button className="bg-primary text-primary-foreground">Action</Button>

// Bad - don't hard-code colors
<div className="bg-white text-black">Content</div>
<div style={{ color: '#000000' }}>Content</div>
```

### Available Color Tokens

- `background` / `foreground` - Base colors
- `card` / `card-foreground` - Card backgrounds
- `popover` / `popover-foreground` - Popover backgrounds
- `primary` / `primary-foreground` - Primary actions
- `secondary` / `secondary-foreground` - Secondary actions
- `muted` / `muted-foreground` - Muted backgrounds
- `accent` / `accent-foreground` - Accent colors
- `destructive` / `destructive-foreground` - Destructive actions
- `border` - Border colors
- `input` - Input borders
- `ring` - Focus rings

## Typography

### Font Family

Inter font is configured globally:

```typescript
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });
```

### Heading Hierarchy

```typescript
<h1 className="text-4xl font-bold">Main Title</h1>
<h2 className="text-3xl font-semibold">Section Title</h2>
<h3 className="text-2xl font-semibold">Subsection</h3>
<h4 className="text-xl font-medium">Minor Heading</h4>
```

### Text Styles

```typescript
// Body text
<p className="text-base text-foreground">Regular text</p>

// Muted text
<p className="text-sm text-muted-foreground">Helper text</p>

// Small text
<span className="text-xs text-muted-foreground">Metadata</span>

// Lead text
<p className="text-lg font-medium">Important paragraph</p>
```

## Layout Patterns

### Container

```typescript
<div className="container mx-auto px-4">
  {/* Content */}
</div>
```

### Flex Layouts

```typescript
// Horizontal
<div className="flex items-center gap-4">
  <Button>Action 1</Button>
  <Button>Action 2</Button>
</div>

// Vertical
<div className="flex flex-col gap-4">
  <Card />
  <Card />
</div>

// Space between
<div className="flex items-center justify-between">
  <h2>Title</h2>
  <Button>Action</Button>
</div>
```

### Grid Layouts

```typescript
// Responsive grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <Card />
  <Card />
  <Card />
</div>

// Auto-fit grid
<div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-4">
  <Card />
  <Card />
</div>
```

### Spacing Scale

Use consistent spacing:

```typescript
// Padding
p-2   // 0.5rem
p-4   // 1rem
p-6   // 1.5rem
p-8   // 2rem

// Gap
gap-2  // 0.5rem
gap-4  // 1rem
gap-6  // 1.5rem
gap-8  // 2rem
```

## Responsive Design

### Breakpoints

- `sm`: 640px
- `md`: 768px
- `lg`: 1024px
- `xl`: 1280px
- `2xl`: 1536px

### Mobile-First Pattern

```typescript
<div className="text-sm md:text-base lg:text-lg">
  Responsive text
</div>

<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  Responsive grid
</div>

<div className="hidden md:block">
  Desktop only
</div>

<div className="block md:hidden">
  Mobile only
</div>
```

## Component Styling

### Using cn() Utility

Always use the `cn()` helper for conditional classes:

```typescript
import { cn } from '@/lib/utils';

interface Props {
  variant?: 'default' | 'outline';
  className?: string;
}

export function MyComponent({ variant = 'default', className }: Props) {
  return (
    <div
      className={cn(
        'base-class',
        variant === 'outline' && 'border border-border',
        className
      )}
    >
      Content
    </div>
  );
}
```

### Variant Patterns

```typescript
const variants = {
  default: 'bg-primary text-primary-foreground',
  secondary: 'bg-secondary text-secondary-foreground',
  outline: 'border border-input bg-background',
};

<div className={variants[variant]}>
  Content
</div>
```

## Common Patterns

### Card with Shadow

```typescript
<div className="rounded-lg border bg-card p-6 shadow-sm">
  <h3 className="font-semibold">Card Title</h3>
  <p className="text-muted-foreground">Description</p>
</div>
```

### Input Group

```typescript
<div className="space-y-2">
  <Label htmlFor="email">Email</Label>
  <Input 
    id="email" 
    type="email"
    className="w-full"
  />
  <p className="text-xs text-muted-foreground">
    We'll never share your email.
  </p>
</div>
```

### Button Group

```typescript
<div className="flex gap-2">
  <Button variant="default">Primary</Button>
  <Button variant="outline">Secondary</Button>
  <Button variant="ghost">Tertiary</Button>
</div>
```

### List Item

```typescript
<div className="flex items-center gap-3 p-3 rounded-md hover:bg-muted transition-colors">
  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
    <Icon className="text-primary" />
  </div>
  <div className="flex-1">
    <p className="font-medium">Item Title</p>
    <p className="text-sm text-muted-foreground">Description</p>
  </div>
</div>
```

### Page Header

```typescript
<div className="border-b">
  <div className="container flex h-16 items-center px-4">
    <h1 className="text-xl font-semibold">Page Title</h1>
    <div className="ml-auto flex items-center gap-2">
      <Button variant="outline">Action</Button>
      <Button>Primary Action</Button>
    </div>
  </div>
</div>
```

## Animations

### Transitions

```typescript
<button className="transition-colors hover:bg-accent">
  Hover me
</button>

<div className="transition-all duration-300 ease-in-out hover:scale-105">
  Scale on hover
</div>
```

### Loading Spinner

```typescript
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
```

## Dark Mode

Colors automatically adapt through CSS variables. Test both modes:

```bash
# Toggle dark mode in browser dev tools or system preferences
```

No special code needed - the theme handles it automatically.

## Best Practices

1. **Use Theme Colors**: Always use CSS variable-based colors
2. **Consistent Spacing**: Stick to the spacing scale (4, 6, 8, etc.)
3. **Mobile First**: Write mobile styles first, then add breakpoints
4. **Use cn()**: Always use the cn() utility for className merging
5. **Semantic Classes**: Use semantic color names (primary, muted) not colors
6. **No Inline Styles**: Avoid inline styles, use Tailwind classes

## Gotchas

- **Color Format**: Use `bg-primary` not `bg-primary-500` (no number suffixes)
- **Dark Mode**: Don't use `dark:` prefix - colors adapt automatically
- **Custom Colors**: Add to CSS variables, don't use arbitrary values
- **Z-Index**: Use Tailwind's z-index scale, avoid custom z-index
- **Important**: Avoid `!important` - use more specific selectors

## Resources

- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Shadcn UI Theming](https://ui.shadcn.com/docs/theming)
- [CSS Variables Reference](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties)
