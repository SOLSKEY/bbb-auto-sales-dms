# Liquid Glass Design Tokens

## Color Palette

### Liquid Accent Colors (RGB)

| Name | R | G | B | Hex | Use Case |
|------|---|---|---|-----|----------|
| Cyan | 6 | 182 | 212 | #06b6d4 | Default, primary actions |
| White | 255 | 255 | 255 | #ffffff | Neutral, secondary |
| Green | 34 | 197 | 94 | #22c55e | Success states |
| Red | 239 | 68 | 68 | #ef4444 | Error, destructive |
| Purple | 168 | 85 | 247 | #a855f7 | Premium, special |
| Yellow | 234 | 179 | 8 | #eab308 | Warning, highlight |
| Orange | 249 | 115 | 22 | #f97316 | Attention |
| Pink | 236 | 72 | 153 | #ec4899 | Featured content |
| Indigo | 99 | 102 | 241 | #6366f1 | Alternative primary |
| Blue | 59 | 130 | 246 | #3b82f6 | Information |

### Background Colors

```css
--bg-base: #050505;          /* Main background */
--bg-elevated: #0a0a0a;      /* Elevated surfaces */
--bg-panel: rgba(18, 18, 18, 0.6);  /* Semi-transparent panels */
--bg-surface: rgba(0, 0, 0, 0.2);   /* Liquid surface base */
--bg-input: rgba(0, 0, 0, 0.3);     /* Input backgrounds */
```

### Text Colors

```css
--text-primary: #ffffff;     /* Primary text - pure white */
--text-secondary: #b0b4ba;   /* Secondary text */
--text-muted: #696e77;       /* Muted/placeholder text */
```

### Border Colors

```css
--border-subtle: rgba(255, 255, 255, 0.08);
--border-default: rgba(255, 255, 255, 0.12);
--border-liquid: rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.4);
--border-liquid-hover: rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.6);
```

## Spacing Scale

| Token | Value | Use Case |
|-------|-------|----------|
| space-1 | 4px | Tight spacing |
| space-2 | 8px | Element gaps |
| space-3 | 12px | Small padding |
| space-4 | 16px | Default padding |
| space-5 | 24px | Card padding |
| space-6 | 32px | Section gaps |
| space-7 | 40px | Large gaps |
| space-8 | 48px | Section padding |
| space-9 | 64px | Page sections |

## Radius Scale

| Token | Value | Use Case |
|-------|-------|----------|
| radius-1 | 3px | Subtle rounding |
| radius-2 | 4px | Checkboxes |
| radius-3 | 6px | Small elements |
| radius-4 | 8px | Inputs, selects |
| radius-5 | 12px | Tabs, callouts |
| radius-6 | 16px | Cards, containers |
| radius-full | 9999px | Buttons, badges, avatars |

## Typography Scale

| Size | Value | Line Height | Use Case |
|------|-------|-------------|----------|
| 1 | 12px | 16px | Captions, labels |
| 2 | 14px | 20px | Body text, inputs |
| 3 | 16px | 24px | Large body |
| 4 | 18px | 26px | Subheadings |
| 5 | 20px | 28px | Section titles |
| 6 | 24px | 30px | Page headings |
| 7 | 28px | 36px | Large headings |
| 8 | 35px | 40px | Hero text |
| 9 | 60px | 60px | Display text |

### Font Stack

```css
font-family: 'Inter Tight', 'Inter', -apple-system, BlinkMacSystemFont, 
             'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
```

### Font Weights

| Weight | Value | Use Case |
|--------|-------|----------|
| Regular | 400 | Body text |
| Medium | 500 | Buttons, labels |
| Semibold | 600 | Headings, emphasis |
| Bold | 700 | Strong emphasis |

## Shadow Tokens

### Liquid Shadow Formula

```css
/* Standard depth */
box-shadow:
    0 0 6px rgba(0, 0, 0, 0.03),           /* Soft outer */
    0 2px 6px rgba(0, 0, 0, 0.08),          /* Depth */
    inset 3px 3px 0.5px -3.5px rgba(R,G,B, 0.15),    /* Top-left bevel */
    inset -3px -3px 0.5px -3.5px rgba(R,G,B, 0.85),  /* Bottom-right bevel */
    inset 1px 1px 1px -0.5px rgba(R,G,B, 0.6),       /* Fine top-left */
    inset -1px -1px 1px -0.5px rgba(R,G,B, 0.6),     /* Fine bottom-right */
    inset 0 0 6px 6px rgba(R,G,B, 0.12),             /* Inner glow */
    inset 0 0 2px 2px rgba(R,G,B, 0.06),             /* Subtle inner */
    0 0 12px rgba(0, 0, 0, 0.15);           /* Ambient */

/* Hover glow */
box-shadow:
    0 0 6px rgba(0, 0, 0, 0.03),
    0 2px 6px rgba(0, 0, 0, 0.08),
    inset 0 0 30px 8px rgba(R,G,B, 0.3),   /* Intensified inner */
    inset 0 0 60px 4px rgba(R,G,B, 0.15),  /* Wide inner glow */
    0 0 20px rgba(R,G,B, 0.25);            /* Outer glow */
```

### Light Shadow (for inputs/selects)

```css
box-shadow:
    0 0 4px rgba(0, 0, 0, 0.03),
    0 1px 4px rgba(0, 0, 0, 0.06),
    inset 2px 2px 0.5px -2.5px rgba(R,G,B, 0.1),
    inset -2px -2px 0.5px -2.5px rgba(R,G,B, 0.6),
    inset 0 0 4px 4px rgba(R,G,B, 0.08),
    0 0 8px rgba(0, 0, 0, 0.1);
```

## Animation Tokens

### Transitions

```css
--transition-fast: 0.15s ease;
--transition-default: 0.3s ease;
--transition-smooth: 0.4s cubic-bezier(0.4, 0, 0.2, 1);
--transition-slow: 0.5s ease;
```

### Animated Background Orbs

```css
@keyframes moveOrb1 {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(300px, 200px); }
}

@keyframes moveOrb2 {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(-200px, 100px); }
}
```

## Complete CSS Variables Block

```css
:root {
    /* Liquid color (default: cyan) */
    --liquid-r: 6;
    --liquid-g: 182;
    --liquid-b: 212;
    
    /* Backgrounds */
    --bg-base: #050505;
    --bg-elevated: #0a0a0a;
    --bg-panel: rgba(18, 18, 18, 0.6);
    --bg-surface: rgba(0, 0, 0, 0.2);
    --bg-input: rgba(0, 0, 0, 0.3);
    
    /* Text */
    --text-primary: #ffffff;
    --text-secondary: #b0b4ba;
    --text-muted: #696e77;
    
    /* Borders */
    --border-subtle: rgba(255, 255, 255, 0.08);
    --border-default: rgba(255, 255, 255, 0.12);
    
    /* Spacing */
    --space-1: 4px;
    --space-2: 8px;
    --space-3: 12px;
    --space-4: 16px;
    --space-5: 24px;
    --space-6: 32px;
    --space-7: 40px;
    --space-8: 48px;
    --space-9: 64px;
    
    /* Radius */
    --radius-1: 3px;
    --radius-2: 4px;
    --radius-3: 6px;
    --radius-4: 8px;
    --radius-5: 12px;
    --radius-6: 16px;
    --radius-full: 9999px;
    
    /* Transitions */
    --transition-fast: 0.15s ease;
    --transition-default: 0.3s ease;
    --transition-smooth: 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}
```
