# Universal Theme System - Quick Reference

## Available CSS Variables

### Primary Colors (Dynamic - Changes with theme)
```css
--primary-50 through --primary-900  /* 10 shades */
--color-primary                      /* Main theme color */
--color-primary-hover                /* Hover state */
--color-primary-light                /* Light variant */
--color-primary-dark                 /* Dark variant */
```

### Background Colors
```css
--bg-primary      /* Main background */
--bg-secondary    /* Secondary background */
--bg-tertiary     /* Tertiary background */
--bg-accent       /* Accent background */
--bg-hover        /* Hover background */
```

### Text Colors
```css
--text-primary    /* Primary text */
--text-secondary  /* Secondary text */
--text-tertiary   /* Tertiary text */
--text-inverse    /* Inverse text (for dark backgrounds) */
```

### Borders & Shadows
```css
--border-primary, --border-secondary, --border-accent
--shadow-sm, --shadow-md, --shadow-lg, --shadow-xl
--shadow-primary  /* Themed shadow */
```

## Utility Classes

```css
.bg-theme-primary       /* Background: primary color */
.bg-theme-light         /* Background: light variant */
.bg-theme-hover:hover   /* Background: hover state */

.text-theme-primary     /* Text: primary color */
.text-theme-hover:hover /* Text: hover state */

.border-theme-primary   /* Border: primary color */
.border-theme-accent    /* Border: accent color */
```

## Usage Examples

### Inline Styles (Recommended)
```tsx
<div style={{ 
  backgroundColor: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  borderColor: 'var(--border-primary)'
}}>
```

### Utility Classes
```tsx
<button className="bg-theme-primary text-white">
  Click me
</button>
```

### With Tailwind (Mixed)
```tsx
<div 
  className="p-4 rounded-lg"
  style={{ backgroundColor: 'var(--bg-secondary)' }}
>
```

## Component Migration Pattern

### Before:
```tsx
<div className={`bg-${color}-600 text-white`}>
```

### After:
```tsx
<div style={{ 
  backgroundColor: 'var(--color-primary)',
  color: 'var(--text-inverse)'
}}>
```

## Dark Mode

Dark mode is automatically handled! Just use the variables:
- `.dark` class is added to `<html>` when dark mode is active
- All variables automatically adjust
- No need to write dark mode variants manually

## Theme Colors Available

- Blue (default)
- Purple
- Pink  
- Green
- Orange
- Red
- Teal
- Indigo

All automatically update when user changes theme!
