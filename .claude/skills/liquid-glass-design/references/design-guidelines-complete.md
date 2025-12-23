# BBB Auto Sales DMS - Complete Design Guidelines

## Version 1.1 | December 2024

> **v1.1 Update:** Added Radix UI Integration section documenting how to apply Liquid Container design system to Radix Themes primitives.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Design Tokens](#2-design-tokens)
3. [Typography System](#3-typography-system)
4. [Component Classes](#4-component-classes)
   - 4.1 [Layout Components](#41-layout-components)
   - 4.2 [Liquid Container System](#42-liquid-container-system-primary-design-element)
     - [Radix UI Integration](#radix-ui-integration) ← **NEW**
   - 4.3 [Button Components](#43-button-components)
   - 4.4 [Form Components](#44-form-components)
   - 4.5 [Navigation Components](#45-navigation-components)
   - 4.6 [Modal Components](#46-modal-components)
   - 4.7 [Data Display Components](#47-data-display-components)
   - 4.8 [Chart & Calendar Components](#48-chart--calendar-components)
5. [Spacing & Layout System](#5-spacing--layout-system)
6. [Responsive Design](#6-responsive-design)
7. [Animation & Transitions](#7-animation--transitions)
8. [Usage Examples](#8-usage-examples)
9. [Accessibility Guidelines](#9-accessibility-guidelines)
10. [Best Practices](#10-best-practices)

---

## 1. Introduction

### Design Philosophy

The BBB Auto Sales DMS design system embodies a **premium dark-mode experience** with futuristic glass morphism aesthetics. The system prioritizes:

1. **Visual Hierarchy Through Contrast** - White text on dark backgrounds with cyan neon accents creates clear focal points
2. **Glass Morphism First** - Semi-transparent surfaces with blur effects create depth without hard edges
3. **Neon Energy** - Cyan (#06b6d4) serves as the primary accent, bringing life and interactivity to the interface
4. **Consistency Over Creativity** - Every component follows established patterns for predictable user experiences
5. **Performance Conscious** - Backdrop filters and animations are optimized for smooth 60fps rendering

### Key Characteristics

| Characteristic | Description |
|---------------|-------------|
| **Theme** | Dark mode exclusively with deep blacks (#050505, #0a0a0a) |
| **Primary Accent** | Neon cyan (#06b6d4, #22d3ee) for interactivity and highlights |
| **Surface Treatment** | Glass morphism with backdrop blur and gradient backgrounds |
| **Border Style** | Gradient borders with cyan-blue transitions |
| **Text Color** | Pure white (#ffffff) for maximum contrast |
| **Icon Style** | Outline icons with cyan glow effects |

### When to Use This Design System

- **Dashboard Interfaces** - Data visualization, KPIs, analytics
- **Form-Heavy Applications** - CRM, inventory management, data entry
- **Enterprise Applications** - Professional tools requiring long session use
- **Mobile-First Progressive Web Apps** - Responsive experiences across devices

---

## 2. Design Tokens

### CSS Variables Reference

```css
:root {
    /* ═══════════════════════════════════════════════════════
       BASE SEMANTIC COLORS
       Using HSL format for easy manipulation
       ═══════════════════════════════════════════════════════ */

    /* Background Colors */
    --background: 222.2 84% 4.9%;        /* Deep blue-black - main bg */
    --card: 222.2 84% 4.9%;              /* Card backgrounds */
    --popover: 222.2 84% 4.9%;           /* Popover/dropdown backgrounds */

    /* Foreground/Text Colors */
    --foreground: 0 0% 100%;             /* Pure white text */
    --card-foreground: 0 0% 100%;        /* Card text */
    --popover-foreground: 0 0% 100%;     /* Popover text */

    /* Primary Colors - Cyan Neon */
    --primary: 190 100% 50%;             /* Bright cyan #00e5ff */
    --primary-foreground: 222.2 47.4% 11.2%;  /* Dark text on primary */

    /* Secondary Colors */
    --secondary: 217.2 32.6% 17.5%;      /* Muted slate-blue */
    --secondary-foreground: 0 0% 98%;    /* Almost white */

    /* Muted Colors */
    --muted: 217.2 32.6% 17.5%;          /* Background for muted elements */
    --muted-foreground: 0 0% 100%;       /* White - forced for visibility */

    /* Accent Colors */
    --accent: 217.2 32.6% 17.5%;         /* Accent background */
    --accent-foreground: 0 0% 100%;      /* Accent text */

    /* Destructive Colors */
    --destructive: 0 62.8% 30.6%;        /* Dark red */
    --destructive-foreground: 0 0% 100%; /* White on destructive */

    /* Border & Input */
    --border: 217.2 32.6% 17.5%;         /* Subtle borders */
    --input: 217.2 32.6% 17.5%;          /* Input backgrounds */
    --ring: 190 100% 50%;                /* Focus ring - cyan */

    /* Radius */
    --radius: 0.5rem;                    /* Base border radius (8px) */
}
```

### Extended Color Palette

```css
/* ═══════════════════════════════════════════════════════
   EXTENDED TAILWIND COLOR TOKENS
   Reference these via Tailwind classes
   ═══════════════════════════════════════════════════════ */

/* Base Backgrounds */
--bg-base: #0a0a0a;                      /* Main app background */
--gunmetal-dark: #0a0a0a;                /* Legacy alias */

/* Glass Panel Colors */
--glass-panel: rgba(18, 18, 18, 0.6);    /* Semi-transparent panels */
--glass-input: rgba(30, 30, 35, 0.8);    /* Input field backgrounds */
--gunmetal: rgba(18, 18, 18, 0.6);       /* Legacy alias */
--gunmetal-light: rgba(255, 255, 255, 0.08); /* Subtle highlight */

/* Text Colors */
--text-primary: #FFFFFF;                  /* Primary text - pure white */
--text-secondary: #C6C6C6;               /* Secondary text - light gray */
--text-muted: #FFFFFF;                   /* Muted text - forced white */
--placeholder: #B8B8B8;                  /* Placeholder text */

/* Accent Colors - Lava Theme */
--lava-core: #FF312E;                    /* Core red accent */
--lava-warm: #FF5A1F;                    /* Warm orange-red */
--lava-cool: #C82025;                    /* Cool red */
--accent-red: #FF312E;                   /* Legacy alias */
--accent-orange: #FF5A1F;                /* Legacy alias */

/* Border Colors */
--border-low: rgba(255, 255, 255, 0.08); /* Subtle borders */
--border-high: rgba(255, 255, 255, 0.12);/* Prominent borders */
```

### Dynamic Text Colors

```css
/* ═══════════════════════════════════════════════════════
   DYNAMIC COLORS FOR STATUS INDICATORS
   Use these for data visualization and feedback
   ═══════════════════════════════════════════════════════ */

.text-dynamic-green {
    color: #34d399 !important;           /* Success/Positive - Emerald-400 */
}

.text-dynamic-red {
    color: #ef4444 !important;           /* Error/Negative - Red-500 */
}

.text-dynamic-yellow {
    color: #eab308 !important;           /* Warning/Caution - Yellow-500 */
}
```

### Neon Icon Colors

```css
/* ═══════════════════════════════════════════════════════
   ICON NEON COLORS
   For icons that need glow effects
   ═══════════════════════════════════════════════════════ */

.icon-neon {
    color: #22d3ee;                      /* Cyan-400 */
    filter: drop-shadow(0 0 2px rgba(34, 211, 238, 0.5));
}

.icon-neon-purple {
    color: #a78bfa;                      /* Violet-400 */
    filter: drop-shadow(0 0 2px rgba(167, 139, 250, 0.5));
}

.icon-neon-blue {
    color: #60a5fa;                      /* Blue-400 */
    filter: drop-shadow(0 0 2px rgba(96, 165, 250, 0.5));
}
```

### Chart Colors (Data Visualization)

```css
/* ═══════════════════════════════════════════════════════
   CHART COLOR PALETTE
   Bright neon colors for maximum chart visibility
   ═══════════════════════════════════════════════════════ */

/* Primary Chart Colors */
--chart-cyan: #00f0ff;
--chart-magenta: #ff00d4;
--chart-neon-green: #00ff88;
--chart-gold: #ffd700;
--chart-bright-red: #ff0000;
--chart-purple: #aa00ff;
--chart-blue: #0066ff;
--chart-teal: #00ffaa;
--chart-orange: #ff8800;
```

### Shadow Tokens

```css
/* ═══════════════════════════════════════════════════════
   SHADOW SYSTEM
   Predefined shadows for depth and glass effects
   ═══════════════════════════════════════════════════════ */

/* Glass Shadow - Standard depth */
--shadow-glass: 0 8px 32px rgba(0, 0, 0, 0.3),
                inset 0 1px 0 rgba(255, 255, 255, 0.05);

/* Lava Glow - Accent elements */
--shadow-lava: 0 4px 16px rgba(255, 49, 46, 0.3);

/* Neon Glow - Interactive elements */
--shadow-neon: 0 0 12px rgba(34, 211, 238, 0.6),
               0 0 24px rgba(6, 182, 212, 0.4);
```

### Border Radius Scale

```css
/* ═══════════════════════════════════════════════════════
   BORDER RADIUS SYSTEM
   Consistent rounding across components
   ═══════════════════════════════════════════════════════ */

--radius-sm: calc(var(--radius) - 4px);  /* 4px - Small elements */
--radius-md: calc(var(--radius) - 2px);  /* 6px - Medium elements */
--radius-lg: var(--radius);              /* 8px - Standard elements */
--radius-card: 16px;                     /* Cards and panels */
--radius-panel: 22px;                    /* Large panels/sidebars */
--radius-full: 9999px;                   /* Pills and circular elements */
```

### Backdrop Blur Scale

```css
/* ═══════════════════════════════════════════════════════
   BACKDROP BLUR VALUES
   For glass morphism effects
   ═══════════════════════════════════════════════════════ */

--blur-sm: 8px;                          /* Subtle blur */
--blur-md: 12px;                         /* Medium blur */
--blur-lg: 16px;                         /* Standard glass blur */
--blur-glass: 40px;                      /* Heavy glass effect */
```

---

## 3. Typography System

### Font Family Stack

```css
/* ═══════════════════════════════════════════════════════
   FONT CONFIGURATION
   Inter Tight is the primary font for all text
   ═══════════════════════════════════════════════════════ */

/* Primary Font Stack */
font-family: 'Inter Tight', -apple-system, BlinkMacSystemFont,
             'Segoe UI', Roboto, sans-serif;

/* Brand/Display Font (same family, heavier weight) */
.font-orbitron {
    font-family: 'Inter Tight', sans-serif;
    font-weight: 600;
}

/* Import via Google Fonts */
@import url('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500;600;700&display=swap');
```

### Typography Scale

| Element/Use Case | Size | Weight | Color | Line Height | Letter Spacing |
|-----------------|------|--------|-------|-------------|----------------|
| H1 - Page Title | 2rem (32px) | 700 | #FFFFFF | 1.2 | -0.02em |
| H2 - Section Title | 1.5rem (24px) | 600 | #FFFFFF | 1.3 | -0.02em |
| H3 - Card Title | 1.25rem (20px) | 600 | #FFFFFF | 1.4 | -0.005em |
| H4 - Subsection | 1.125rem (18px) | 600 | #FFFFFF | 1.4 | normal |
| H5 - Label Large | 1rem (16px) | 600 | #FFFFFF | 1.5 | normal |
| H6 - Label Small | 0.875rem (14px) | 600 | #FFFFFF | 1.5 | normal |
| Body Large | 1rem (16px) | 400 | #FFFFFF | 1.6 | normal |
| Body Default | 0.95rem (15.2px) | 400 | #FFFFFF | 1.5 | normal |
| Body Small | 0.875rem (14px) | 400 | #C6C6C6 | 1.5 | normal |
| Caption/Meta | 0.75rem (12px) | 400 | #C6C6C6 | 1.4 | normal |
| Button Text | 0.875rem (14px) | 500 | #FFFFFF | 1 | -0.02em |
| Navigation | 0.95rem (15.2px) | 500 | #FFFFFF | 1.4 | normal |
| Form Label | 0.875rem (14px) | 500 | #FFFFFF | 1.4 | normal |
| Form Input | 0.95rem (15.2px) | 400 | #FFFFFF | 1.4 | normal |
| Placeholder | 0.95rem (15.2px) | 400 | #B8B8B8 | 1.4 | normal |

### Typography Utility Classes

```css
/* ═══════════════════════════════════════════════════════
   LETTER SPACING UTILITIES
   Custom tight tracking for premium feel
   ═══════════════════════════════════════════════════════ */

.tracking-tight-lg {
    letter-spacing: -0.02em;             /* Very tight - headings */
}

.tracking-tight-md {
    letter-spacing: -0.005em;            /* Slightly tight - subheadings */
}

/* ═══════════════════════════════════════════════════════
   TEXT ENHANCEMENT UTILITIES
   ═══════════════════════════════════════════════════════ */

.text-glow {
    text-shadow: 0 0 10px rgba(6, 182, 212, 0.3);
}

.text-primary-contrast {
    color: #ffffff !important;
    font-weight: 500;
    letter-spacing: 0.01em;
}

.text-secondary-contrast {
    color: #ffffff !important;
}

.text-muted-contrast {
    color: #ffffff !important;
}
```

### Global Text Override

```css
/* ═══════════════════════════════════════════════════════
   GLOBAL WHITE TEXT ENFORCEMENT
   Ensures maximum contrast on dark backgrounds
   ═══════════════════════════════════════════════════════ */

p, span, h1, h2, h3, h4, h5, h6, div, td, th, li, a,
button, input, select, textarea {
    color: #ffffff !important;
}
```

---

## 4. Component Classes

### 4.1 Layout Components

#### Container

```css
/* ═══════════════════════════════════════════════════════
   CONTAINER - Tailwind Configuration
   ═══════════════════════════════════════════════════════ */

.container {
    width: 100%;
    margin-left: auto;
    margin-right: auto;
    padding-left: 2rem;
    padding-right: 2rem;
}

@media (min-width: 1400px) {
    .container {
        max-width: 1400px;
    }
}
```

#### Animated Background

```css
/* ═══════════════════════════════════════════════════════
   ANIMATED BACKGROUND
   Floating gradient orbs for ambient movement
   ═══════════════════════════════════════════════════════ */

.animated-bg {
    background-color: #050505;
    position: relative;
    overflow: hidden;
    z-index: 0;
}

/* Orb 1 - Cyan */
.animated-bg::before {
    content: '';
    position: absolute;
    top: 10%;
    left: 10%;
    width: 600px;
    height: 600px;
    background: radial-gradient(circle, rgba(6, 182, 212, 0.4) 0%, transparent 70%);
    animation: moveOrb1 25s ease-in-out infinite;
    z-index: -1;
    pointer-events: none;
    border-radius: 50%;
    filter: blur(40px);
}

/* Orb 2 - Blue */
.animated-bg::after {
    content: '';
    position: absolute;
    bottom: 10%;
    right: 10%;
    width: 500px;
    height: 500px;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.4) 0%, transparent 70%);
    animation: moveOrb2 30s ease-in-out infinite;
    z-index: -1;
    pointer-events: none;
    border-radius: 50%;
    filter: blur(40px);
}

@keyframes moveOrb1 {
    0% { transform: translate(0, 0); }
    50% { transform: translate(300px, 200px); }
    100% { transform: translate(0, 0); }
}

@keyframes moveOrb2 {
    0% { transform: translate(0, 0); }
    50% { transform: translate(-200px, 100px); }
    100% { transform: translate(0, 0); }
}
```

### 4.2 Liquid Container System (Primary Design Element)

The **Liquid Container** is the primary card/container design throughout the BBB Auto Sales DMS. It features a distinctive "liquid" appearance with layered inset shadows that create depth and premium feel.

#### Core Liquid Shadow Formula

```css
/* ═══════════════════════════════════════════════════════
   LIQUID CONTAINER - PRIMARY DESIGN SYSTEM
   Premium container with colored inset shadows
   USE FOR: ALL cards, panels, content containers
   ═══════════════════════════════════════════════════════ */

/* The signature "liquid" effect is created by layering multiple
   inset shadows with the accent color. This creates a soft,
   beveled appearance that appears to glow from within. */

/* Shadow Formula (substitute R,G,B with color values): */
.liquid-container {
    box-shadow:
        0 0 6px rgba(0,0,0,0.03),           /* Subtle outer shadow */
        0 2px 6px rgba(0,0,0,0.08),          /* Depth shadow */
        inset 3px 3px 0.5px -3.5px rgba(R,G,B, 0.15),    /* Top-left inner highlight */
        inset -3px -3px 0.5px -3.5px rgba(R,G,B, 0.85),  /* Bottom-right inner shadow */
        inset 1px 1px 1px -0.5px rgba(R,G,B, 0.6),       /* Fine top-left edge */
        inset -1px -1px 1px -0.5px rgba(R,G,B, 0.6),     /* Fine bottom-right edge */
        inset 0 0 6px 6px rgba(R,G,B, 0.12),             /* Inner color glow */
        inset 0 0 2px 2px rgba(R,G,B, 0.06),             /* Subtle inner glow */
        0 0 12px rgba(0,0,0,0.15);           /* Outer ambient shadow */
    border: 1px solid rgba(R,G,B, 0.4);      /* Colored border */
    background-color: rgba(0, 0, 0, 0.2);    /* Glass transparency */
    border-radius: 16px;                      /* rounded-2xl */
}
```

#### Color Variants

| Variant | RGB Values | Hex | Use Case |
|---------|-----------|-----|----------|
| `cyan-blue` | 6, 182, 212 | #06b6d4 | **Default** - Primary accent, main cards |
| `white` | 255, 255, 255 | #ffffff | Neutral containers, subtle emphasis |
| `neon-pink` | 236, 72, 153 | #ec4899 | Featured content, promotions |
| `neon-green` | 34, 197, 94 | #22c55e | Success states, positive metrics |
| `neon-orange` | 249, 115, 22 | #f97316 | Warnings, attention needed |
| `neon-red` | 239, 68, 68 | #ef4444 | Errors, destructive actions |
| `neon-purple` | 168, 85, 247 | #a855f7 | Premium features, special content |
| `yellow` | 234, 179, 8 | #eab308 | Highlights, pending states |

#### Pre-built CSS Classes

```css
/* ═══════════════════════════════════════════════════════
   LIQUID CONTAINER - CYAN BLUE (Default)
   ═══════════════════════════════════════════════════════ */

.liquid-container-cyan {
    position: relative;
    border-radius: 16px;
    transition: all 0.5s ease;
    box-shadow:
        0 0 6px rgba(0,0,0,0.03),
        0 2px 6px rgba(0,0,0,0.08),
        inset 3px 3px 0.5px -3.5px rgba(6, 182, 212, 0.15),
        inset -3px -3px 0.5px -3.5px rgba(6, 182, 212, 0.85),
        inset 1px 1px 1px -0.5px rgba(6, 182, 212, 0.6),
        inset -1px -1px 1px -0.5px rgba(6, 182, 212, 0.6),
        inset 0 0 6px 6px rgba(6, 182, 212, 0.12),
        inset 0 0 2px 2px rgba(6, 182, 212, 0.06),
        0 0 12px rgba(0,0,0,0.15);
    border: 1px solid rgba(6, 182, 212, 0.4);
    background-color: rgba(0, 0, 0, 0.2);
}

/* ═══════════════════════════════════════════════════════
   LIQUID CONTAINER - WHITE (Neutral)
   ═══════════════════════════════════════════════════════ */

.liquid-container-white {
    position: relative;
    border-radius: 16px;
    transition: all 0.5s ease;
    box-shadow:
        0 0 6px rgba(0,0,0,0.03),
        0 2px 6px rgba(0,0,0,0.08),
        inset 3px 3px 0.5px -3.5px rgba(255, 255, 255, 0.15),
        inset -3px -3px 0.5px -3.5px rgba(255, 255, 255, 0.85),
        inset 1px 1px 1px -0.5px rgba(255, 255, 255, 0.6),
        inset -1px -1px 1px -0.5px rgba(255, 255, 255, 0.6),
        inset 0 0 6px 6px rgba(255, 255, 255, 0.12),
        inset 0 0 2px 2px rgba(255, 255, 255, 0.06),
        0 0 12px rgba(0,0,0,0.15);
    border: 1px solid rgba(255, 255, 255, 0.4);
    background-color: rgba(0, 0, 0, 0.2);
}

/* ═══════════════════════════════════════════════════════
   LIQUID CONTAINER - NEON GREEN (Success)
   ═══════════════════════════════════════════════════════ */

.liquid-container-green {
    position: relative;
    border-radius: 16px;
    transition: all 0.5s ease;
    box-shadow:
        0 0 6px rgba(0,0,0,0.03),
        0 2px 6px rgba(0,0,0,0.08),
        inset 3px 3px 0.5px -3.5px rgba(34, 197, 94, 0.15),
        inset -3px -3px 0.5px -3.5px rgba(34, 197, 94, 0.85),
        inset 1px 1px 1px -0.5px rgba(34, 197, 94, 0.6),
        inset -1px -1px 1px -0.5px rgba(34, 197, 94, 0.6),
        inset 0 0 6px 6px rgba(34, 197, 94, 0.12),
        inset 0 0 2px 2px rgba(34, 197, 94, 0.06),
        0 0 12px rgba(0,0,0,0.15);
    border: 1px solid rgba(34, 197, 94, 0.4);
    background-color: rgba(0, 0, 0, 0.2);
}

/* ═══════════════════════════════════════════════════════
   LIQUID CONTAINER - NEON RED (Destructive)
   ═══════════════════════════════════════════════════════ */

.liquid-container-red {
    position: relative;
    border-radius: 16px;
    transition: all 0.5s ease;
    box-shadow:
        0 0 6px rgba(0,0,0,0.03),
        0 2px 6px rgba(0,0,0,0.08),
        inset 3px 3px 0.5px -3.5px rgba(239, 68, 68, 0.15),
        inset -3px -3px 0.5px -3.5px rgba(239, 68, 68, 0.85),
        inset 1px 1px 1px -0.5px rgba(239, 68, 68, 0.6),
        inset -1px -1px 1px -0.5px rgba(239, 68, 68, 0.6),
        inset 0 0 6px 6px rgba(239, 68, 68, 0.12),
        inset 0 0 2px 2px rgba(239, 68, 68, 0.06),
        0 0 12px rgba(0,0,0,0.15);
    border: 1px solid rgba(239, 68, 68, 0.4);
    background-color: rgba(0, 0, 0, 0.2);
}

/* ═══════════════════════════════════════════════════════
   LIQUID CONTAINER - NEON PURPLE (Premium)
   ═══════════════════════════════════════════════════════ */

.liquid-container-purple {
    position: relative;
    border-radius: 16px;
    transition: all 0.5s ease;
    box-shadow:
        0 0 6px rgba(0,0,0,0.03),
        0 2px 6px rgba(0,0,0,0.08),
        inset 3px 3px 0.5px -3.5px rgba(168, 85, 247, 0.15),
        inset -3px -3px 0.5px -3.5px rgba(168, 85, 247, 0.85),
        inset 1px 1px 1px -0.5px rgba(168, 85, 247, 0.6),
        inset -1px -1px 1px -0.5px rgba(168, 85, 247, 0.6),
        inset 0 0 6px 6px rgba(168, 85, 247, 0.12),
        inset 0 0 2px 2px rgba(168, 85, 247, 0.06),
        0 0 12px rgba(0,0,0,0.15);
    border: 1px solid rgba(168, 85, 247, 0.4);
    background-color: rgba(0, 0, 0, 0.2);
}

/* ═══════════════════════════════════════════════════════
   LIQUID CONTAINER - YELLOW (Warning/Highlight)
   ═══════════════════════════════════════════════════════ */

.liquid-container-yellow {
    position: relative;
    border-radius: 16px;
    transition: all 0.5s ease;
    box-shadow:
        0 0 6px rgba(0,0,0,0.03),
        0 2px 6px rgba(0,0,0,0.08),
        inset 3px 3px 0.5px -3.5px rgba(234, 179, 8, 0.15),
        inset -3px -3px 0.5px -3.5px rgba(234, 179, 8, 0.85),
        inset 1px 1px 1px -0.5px rgba(234, 179, 8, 0.6),
        inset -1px -1px 1px -0.5px rgba(234, 179, 8, 0.6),
        inset 0 0 6px 6px rgba(234, 179, 8, 0.12),
        inset 0 0 2px 2px rgba(234, 179, 8, 0.06),
        0 0 12px rgba(0,0,0,0.15);
    border: 1px solid rgba(234, 179, 8, 0.4);
    background-color: rgba(0, 0, 0, 0.2);
}
```

#### Glass Distortion Filter (Optional Enhancement)

```html
<!-- Add this SVG filter to your page for extra glass distortion effect -->
<svg class="absolute w-0 h-0" aria-hidden="true">
    <filter id="liquid-glass" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feTurbulence baseFrequency="0.02" numOctaves="3" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" />
    </filter>
</svg>

<!-- Apply to container with backdrop-filter -->
<style>
.liquid-container-enhanced {
    backdrop-filter: blur(10px) url("#liquid-glass");
    -webkit-backdrop-filter: blur(10px) url("#liquid-glass");
}
</style>
```

#### React Component Usage

```tsx
import { LiquidContainer } from '@/components/ui/liquid-container';

// Basic usage (default cyan-blue)
<LiquidContainer className="p-6">
    <h3>Card Title</h3>
    <p>Card content goes here</p>
</LiquidContainer>

// With color variant
<LiquidContainer variant="neon-green" className="p-4">
    <span>Success message</span>
</LiquidContainer>

// Available variants:
// "cyan-blue" (default) | "white" | "neon-pink" | "neon-green"
// "neon-orange" | "neon-red" | "neon-purple" | "yellow"
```

#### Floating Sidebar (Liquid Style)

```css
/* ═══════════════════════════════════════════════════════
   FLOATING SIDEBAR - LIQUID STYLE
   Navigation sidebar using liquid container design
   ═══════════════════════════════════════════════════════ */

.floating-sidebar-liquid {
    position: relative;
    border-radius: 20px;
    margin: 16px;
    transition: all 0.5s ease;
    box-shadow:
        0 0 6px rgba(0,0,0,0.03),
        0 2px 6px rgba(0,0,0,0.08),
        inset 3px 3px 0.5px -3.5px rgba(6, 182, 212, 0.15),
        inset -3px -3px 0.5px -3.5px rgba(6, 182, 212, 0.85),
        inset 1px 1px 1px -0.5px rgba(6, 182, 212, 0.6),
        inset -1px -1px 1px -0.5px rgba(6, 182, 212, 0.6),
        inset 0 0 6px 6px rgba(6, 182, 212, 0.12),
        inset 0 0 2px 2px rgba(6, 182, 212, 0.06),
        0 8px 32px rgba(0,0,0,0.5);
    border: 1px solid rgba(6, 182, 212, 0.4);
    background-color: rgba(0, 0, 0, 0.2);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
}
```

#### Legacy Glass Card Classes (Deprecated)

> **Note:** The following glass card classes are deprecated. Use `LiquidContainer` or `.liquid-container-*` classes instead.

```css
/* DEPRECATED - Use .liquid-container-cyan instead */
.glass-card-outline { /* ... */ }
.glass-card-accent { /* ... */ }
.glass-card-outline-colored { /* ... */ }
```

#### Radix UI Integration

The Liquid Container system is designed to integrate seamlessly with **Radix UI Themes** primitives. This section documents how to apply liquid glass effects globally to Radix components.

##### Design Principle: Apply to Surfaces, Not Content

| Apply Liquid Glass To | Do NOT Apply To |
|----------------------|-----------------|
| Buttons, Cards, Badges | Standalone text |
| Inputs, Selects, Dropdowns | Icons without containers |
| Checkboxes, Radios, Switches | Raw data values |
| Tabs, Callouts, Dialogs | Inline code/links |
| Menus, Popovers, Tooltips | Separators, dividers |
| Any element with background/border | Content inside containers |

##### Radix Component → Liquid Class Mapping

| Radix Component | Liquid Class | Notes |
|-----------------|--------------|-------|
| `Button` | `.liquid-btn` | Pill-shaped with hover glow |
| `Badge` | `.liquid-badge` | Inline status indicators |
| `Card` | `.liquid-card` | Content containers |
| `TextField.Root` | `.liquid-input` | Input wrapper (not the input itself) |
| `Select.Trigger` | `.liquid-select` | Dropdown trigger only |
| `Checkbox` | `.liquid-checkbox` | Toggle control |
| `RadioGroup.Item` | `.liquid-radio` | Radio button |
| `Switch` | `.liquid-switch` | Toggle switch |
| `Tabs.List` | `.liquid-tabs-list` | Tab navigation container |
| `Callout.Root` | `.liquid-callout` | Alert/notification |
| `Progress` | `.liquid-progress` | Progress bar |
| `Slider` | `.liquid-slider` | Range input |
| `Avatar` | `.liquid-avatar` | User avatar |
| `Table.Root` | `.liquid-table-wrapper` | Table container |
| `Tooltip.Content` | `.liquid-tooltip` | Tooltip popup |
| `Dialog.Content` | `.liquid-card` | Modal dialog |
| `DropdownMenu.Content` | `.liquid-card` | Dropdown menu |
| `Popover.Content` | `.liquid-card` | Popover content |

##### CSS Custom Properties for Dynamic Colors

```css
/* ═══════════════════════════════════════════════════════
   LIQUID COLOR SYSTEM - CSS CUSTOM PROPERTIES
   Use RGB values for shadow color mixing
   ═══════════════════════════════════════════════════════ */

:root {
    /* Color palette (RGB format for rgba() mixing) */
    --liquid-cyan: 6, 182, 212;
    --liquid-white: 255, 255, 255;
    --liquid-green: 34, 197, 94;
    --liquid-red: 239, 68, 68;
    --liquid-purple: 168, 85, 247;
    --liquid-yellow: 234, 179, 8;
    --liquid-orange: 249, 115, 22;
    --liquid-pink: 236, 72, 153;
    --liquid-indigo: 99, 102, 241;
    --liquid-blue: 59, 130, 246;
    
    /* Active liquid color (default: cyan) */
    --liquid-r: 6;
    --liquid-g: 182;
    --liquid-b: 212;
}

/* Color variant classes */
.liquid-cyan { --liquid-r: 6; --liquid-g: 182; --liquid-b: 212; }
.liquid-white { --liquid-r: 255; --liquid-g: 255; --liquid-b: 255; }
.liquid-green { --liquid-r: 34; --liquid-g: 197; --liquid-b: 94; }
.liquid-red { --liquid-r: 239; --liquid-g: 68; --liquid-b: 68; }
.liquid-purple { --liquid-r: 168; --liquid-g: 85; --liquid-b: 247; }
.liquid-yellow { --liquid-r: 234; --liquid-g: 179; --liquid-b: 8; }
.liquid-orange { --liquid-r: 249; --liquid-g: 115; --liquid-b: 22; }
.liquid-pink { --liquid-r: 236; --liquid-g: 72; --liquid-b: 153; }

/* Data attribute alternative */
[data-liquid-color="cyan"] { --liquid-r: 6; --liquid-g: 182; --liquid-b: 212; }
[data-liquid-color="green"] { --liquid-r: 34; --liquid-g: 197; --liquid-b: 94; }
/* ... etc */
```

##### Base Liquid Surface Mixin

```css
/* ═══════════════════════════════════════════════════════
   LIQUID SURFACE - BASE MIXIN
   Apply this to any Radix primitive that needs glass effect
   ═══════════════════════════════════════════════════════ */

.liquid-surface {
    position: relative;
    border-radius: 16px;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    background-color: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.4);
    box-shadow:
        /* Outer shadows for depth */
        0 0 6px rgba(0, 0, 0, 0.03),
        0 2px 6px rgba(0, 0, 0, 0.08),
        /* Inner bevel highlights */
        inset 3px 3px 0.5px -3.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.15),
        inset -3px -3px 0.5px -3.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.85),
        /* Fine edge highlights */
        inset 1px 1px 1px -0.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.6),
        inset -1px -1px 1px -0.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.6),
        /* Inner color glow */
        inset 0 0 6px 6px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.12),
        inset 0 0 2px 2px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.06),
        /* Outer ambient shadow */
        0 0 12px rgba(0, 0, 0, 0.15);
}

.liquid-surface:hover {
    border-color: rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.6);
    box-shadow:
        0 0 6px rgba(0, 0, 0, 0.03),
        0 2px 6px rgba(0, 0, 0, 0.08),
        /* Intensified inner glow on hover */
        inset 0 0 30px 8px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.3),
        inset 0 0 60px 4px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.15),
        /* Outer glow */
        0 0 20px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.25);
}
```

##### Global Application via Radix Theme Override

```css
/* ═══════════════════════════════════════════════════════
   RADIX UI THEME OVERRIDES
   Apply liquid glass to all Radix surface components
   ═══════════════════════════════════════════════════════ */

/* Override Radix Button */
.radix-themes .rt-Button {
    background-color: rgba(0, 0, 0, 0.2) !important;
    border: 1px solid rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.4);
    box-shadow:
        0 0 6px rgba(0,0,0,0.03),
        0 2px 6px rgba(0,0,0,0.08),
        inset 3px 3px 0.5px -3.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.15),
        inset -3px -3px 0.5px -3.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.85),
        inset 1px 1px 1px -0.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.6),
        inset -1px -1px 1px -0.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.6),
        inset 0 0 6px 6px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.12),
        inset 0 0 2px 2px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.06),
        0 0 12px rgba(0,0,0,0.15);
}

/* Override Radix Card */
.radix-themes .rt-Card {
    background-color: rgba(0, 0, 0, 0.2) !important;
    border: 1px solid rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.4);
    /* Same liquid shadow formula */
}

/* Override Radix TextField */
.radix-themes .rt-TextFieldRoot {
    background-color: rgba(0, 0, 0, 0.3) !important;
    border: 1px solid rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.3);
    /* Lighter liquid shadow for inputs */
}

/* Continue for other components... */
```

##### React Component Wrapper Pattern

```tsx
// components/ui/liquid-wrapper.tsx
import { cn } from '@/lib/utils';

interface LiquidWrapperProps {
    children: React.ReactNode;
    color?: 'cyan' | 'white' | 'green' | 'red' | 'purple' | 'yellow' | 'orange' | 'pink';
    className?: string;
}

export function LiquidWrapper({ 
    children, 
    color = 'cyan', 
    className 
}: LiquidWrapperProps) {
    return (
        <div 
            className={cn('liquid-surface', `liquid-${color}`, className)}
            data-liquid-color={color}
        >
            {children}
        </div>
    );
}

// Usage with Radix components:
import { Button } from '@radix-ui/themes';
import { LiquidWrapper } from '@/components/ui/liquid-wrapper';

// Option 1: Wrap Radix component
<LiquidWrapper color="cyan">
    <Button>Click Me</Button>
</LiquidWrapper>

// Option 2: Apply class directly (if using global overrides)
<Button className="liquid-btn liquid-cyan">Click Me</Button>
```

##### Tailwind CSS Plugin (Optional)

```js
// tailwind.config.js
module.exports = {
    theme: {
        extend: {
            boxShadow: {
                'liquid-cyan': `
                    0 0 6px rgba(0,0,0,0.03),
                    0 2px 6px rgba(0,0,0,0.08),
                    inset 3px 3px 0.5px -3.5px rgba(6, 182, 212, 0.15),
                    inset -3px -3px 0.5px -3.5px rgba(6, 182, 212, 0.85),
                    inset 1px 1px 1px -0.5px rgba(6, 182, 212, 0.6),
                    inset -1px -1px 1px -0.5px rgba(6, 182, 212, 0.6),
                    inset 0 0 6px 6px rgba(6, 182, 212, 0.12),
                    inset 0 0 2px 2px rgba(6, 182, 212, 0.06),
                    0 0 12px rgba(0,0,0,0.15)
                `,
                'liquid-white': `/* same formula with white RGB */`,
                'liquid-green': `/* same formula with green RGB */`,
                // ... etc
            },
            borderColor: {
                'liquid-cyan': 'rgba(6, 182, 212, 0.4)',
                'liquid-white': 'rgba(255, 255, 255, 0.4)',
                // ... etc
            }
        }
    }
}

// Usage:
// <button className="bg-black/20 border-liquid-cyan shadow-liquid-cyan">
```

##### Size Variants Reference

| Size Class | Height | Padding | Font Size | Use Case |
|------------|--------|---------|-----------|----------|
| `.size-1` | 24-28px | 8-10px | 12px | Compact UI, tables |
| `.size-2` | 32-36px | 12-14px | 13-14px | Default size |
| `.size-3` | 40-44px | 16-18px | 14-16px | Prominent actions |
| `.size-4` | 48px | 20-24px | 16px | Hero buttons, forms |

### 4.3 Button Components

#### Standard Button Variants

```css
/* ═══════════════════════════════════════════════════════
   BUTTON - Base Styles & Variants
   Based on class-variance-authority pattern
   ═══════════════════════════════════════════════════════ */

/* Base Button */
.button-base {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    white-space: nowrap;
    border-radius: 0.375rem;
    font-size: 0.875rem;
    font-weight: 500;
    transition: colors 0.15s ease;
    outline: none;
}

.button-base:focus-visible {
    ring: 2px;
    ring-color: hsl(var(--ring));
    ring-offset: 2px;
}

.button-base:disabled {
    pointer-events: none;
    opacity: 0.5;
}

/* Variant: Default */
.button-default {
    background-color: hsl(var(--primary));
    color: hsl(var(--primary-foreground));
}
.button-default:hover {
    background-color: hsl(var(--primary) / 0.9);
}

/* Variant: Destructive */
.button-destructive {
    background-color: hsl(var(--destructive));
    color: hsl(var(--destructive-foreground));
}
.button-destructive:hover {
    background-color: hsl(var(--destructive) / 0.9);
}

/* Variant: Outline */
.button-outline {
    border: 1px solid hsl(var(--input));
    background-color: hsl(var(--background));
}
.button-outline:hover {
    background-color: hsl(var(--accent));
    color: hsl(var(--accent-foreground));
}

/* Variant: Secondary */
.button-secondary {
    background-color: hsl(var(--secondary));
    color: hsl(var(--secondary-foreground));
}
.button-secondary:hover {
    background-color: hsl(var(--secondary) / 0.8);
}

/* Variant: Ghost */
.button-ghost {
    background-color: transparent;
}
.button-ghost:hover {
    background-color: hsl(var(--accent));
    color: hsl(var(--accent-foreground));
}

/* Variant: Link */
.button-link {
    color: hsl(var(--primary));
    text-decoration-line: underline;
    text-underline-offset: 4px;
}
.button-link:hover {
    text-decoration-line: underline;
}

/* Size: Default */
.button-size-default { height: 2.5rem; padding: 0.5rem 1rem; }

/* Size: Small */
.button-size-sm { height: 2.25rem; border-radius: 0.375rem; padding: 0 0.75rem; }

/* Size: Large */
.button-size-lg { height: 2.75rem; border-radius: 0.375rem; padding: 0 2rem; }

/* Size: Icon */
.button-size-icon { height: 2.5rem; width: 2.5rem; }
```

#### Liquid Pill Button (Primary Button Style)

The **Liquid Pill Button** is the primary button style, using the same liquid shadow system as containers but with a fully rounded (pill) shape.

```css
/* ═══════════════════════════════════════════════════════
   LIQUID PILL BUTTON - PRIMARY BUTTON DESIGN
   Pill-shaped button with liquid inset shadow effect
   USE FOR: ALL buttons throughout the application
   ═══════════════════════════════════════════════════════ */

/* Base Liquid Pill Button */
.liquid-pill-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    white-space: nowrap;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border-radius: 9999px;              /* Fully rounded - pill shape */
    transition: all 0.3s ease;
    background-color: transparent;
    color: #ffffff;
    outline: none;
}

.liquid-pill-btn:active {
    transform: scale(0.98);
}

.liquid-pill-btn:disabled {
    pointer-events: none;
    opacity: 0.5;
}

/* ═══════════════════════════════════════════════════════
   LIQUID PILL BUTTON - WHITE (Default/Neutral)
   ═══════════════════════════════════════════════════════ */

.liquid-pill-btn-white {
    box-shadow:
        0 0 6px rgba(0,0,0,0.03),
        0 2px 6px rgba(0,0,0,0.08),
        inset 3px 3px 0.5px -3.5px rgba(255, 255, 255, 0.15),
        inset -3px -3px 0.5px -3.5px rgba(255, 255, 255, 0.85),
        inset 1px 1px 1px -0.5px rgba(255, 255, 255, 0.6),
        inset -1px -1px 1px -0.5px rgba(255, 255, 255, 0.6),
        inset 0 0 6px 6px rgba(255, 255, 255, 0.12),
        inset 0 0 2px 2px rgba(255, 255, 255, 0.06),
        0 0 12px rgba(0,0,0,0.15);
    border: 1px solid rgba(255, 255, 255, 0.4);
    background-color: rgba(0, 0, 0, 0.2);
}

.liquid-pill-btn-white:hover {
    background-color: rgba(255, 255, 255, 0.25);
    box-shadow:
        0 0 6px rgba(0,0,0,0.03),
        0 2px 6px rgba(0,0,0,0.08),
        inset 0 0 30px 8px rgba(255, 255, 255, 0.5),
        inset 0 0 60px 4px rgba(255, 255, 255, 0.3),
        0 0 20px rgba(255, 255, 255, 0.4);
}

/* ═══════════════════════════════════════════════════════
   LIQUID PILL BUTTON - CYAN (Primary Action)
   ═══════════════════════════════════════════════════════ */

.liquid-pill-btn-cyan {
    box-shadow:
        0 0 6px rgba(0,0,0,0.03),
        0 2px 6px rgba(0,0,0,0.08),
        inset 3px 3px 0.5px -3.5px rgba(6, 182, 212, 0.15),
        inset -3px -3px 0.5px -3.5px rgba(6, 182, 212, 0.85),
        inset 1px 1px 1px -0.5px rgba(6, 182, 212, 0.6),
        inset -1px -1px 1px -0.5px rgba(6, 182, 212, 0.6),
        inset 0 0 6px 6px rgba(6, 182, 212, 0.12),
        inset 0 0 2px 2px rgba(6, 182, 212, 0.06),
        0 0 12px rgba(0,0,0,0.15);
    border: 1px solid rgba(6, 182, 212, 0.4);
    background-color: rgba(0, 0, 0, 0.2);
    /* Text color: white (inherited from base) */
}

.liquid-pill-btn-cyan:hover {
    background-color: rgba(6, 182, 212, 0.25);
    box-shadow:
        0 0 6px rgba(0,0,0,0.03),
        0 2px 6px rgba(0,0,0,0.08),
        inset 0 0 30px 8px rgba(6, 182, 212, 0.5),
        inset 0 0 60px 4px rgba(6, 182, 212, 0.3),
        0 0 20px rgba(6, 182, 212, 0.4);
}

/* ═══════════════════════════════════════════════════════
   LIQUID PILL BUTTON - GREEN (Success/Confirm)
   ═══════════════════════════════════════════════════════ */

.liquid-pill-btn-green {
    box-shadow:
        0 0 6px rgba(0,0,0,0.03),
        0 2px 6px rgba(0,0,0,0.08),
        inset 3px 3px 0.5px -3.5px rgba(34, 197, 94, 0.15),
        inset -3px -3px 0.5px -3.5px rgba(34, 197, 94, 0.85),
        inset 1px 1px 1px -0.5px rgba(34, 197, 94, 0.6),
        inset -1px -1px 1px -0.5px rgba(34, 197, 94, 0.6),
        inset 0 0 6px 6px rgba(34, 197, 94, 0.12),
        inset 0 0 2px 2px rgba(34, 197, 94, 0.06),
        0 0 12px rgba(0,0,0,0.15);
    border: 1px solid rgba(34, 197, 94, 0.4);
    background-color: rgba(0, 0, 0, 0.2);
    /* Text color: white (inherited from base) */
}

.liquid-pill-btn-green:hover {
    background-color: rgba(34, 197, 94, 0.25);
    box-shadow:
        0 0 6px rgba(0,0,0,0.03),
        0 2px 6px rgba(0,0,0,0.08),
        inset 0 0 30px 8px rgba(34, 197, 94, 0.5),
        inset 0 0 60px 4px rgba(34, 197, 94, 0.3),
        0 0 20px rgba(34, 197, 94, 0.4);
}

/* ═══════════════════════════════════════════════════════
   LIQUID PILL BUTTON - RED (Destructive/Danger)
   ═══════════════════════════════════════════════════════ */

.liquid-pill-btn-red {
    box-shadow:
        0 0 6px rgba(0,0,0,0.03),
        0 2px 6px rgba(0,0,0,0.08),
        inset 3px 3px 0.5px -3.5px rgba(239, 68, 68, 0.15),
        inset -3px -3px 0.5px -3.5px rgba(239, 68, 68, 0.85),
        inset 1px 1px 1px -0.5px rgba(239, 68, 68, 0.6),
        inset -1px -1px 1px -0.5px rgba(239, 68, 68, 0.6),
        inset 0 0 6px 6px rgba(239, 68, 68, 0.12),
        inset 0 0 2px 2px rgba(239, 68, 68, 0.06),
        0 0 12px rgba(0,0,0,0.15);
    border: 1px solid rgba(239, 68, 68, 0.4);
    background-color: rgba(0, 0, 0, 0.2);
    /* Text color: white (inherited from base) */
}

.liquid-pill-btn-red:hover {
    background-color: rgba(239, 68, 68, 0.25);
    box-shadow:
        0 0 6px rgba(0,0,0,0.03),
        0 2px 6px rgba(0,0,0,0.08),
        inset 0 0 30px 8px rgba(239, 68, 68, 0.5),
        inset 0 0 60px 4px rgba(239, 68, 68, 0.3),
        0 0 20px rgba(239, 68, 68, 0.4);
}

/* ═══════════════════════════════════════════════════════
   LIQUID PILL BUTTON - PURPLE (Premium/Special)
   ═══════════════════════════════════════════════════════ */

.liquid-pill-btn-purple {
    box-shadow:
        0 0 6px rgba(0,0,0,0.03),
        0 2px 6px rgba(0,0,0,0.08),
        inset 3px 3px 0.5px -3.5px rgba(168, 85, 247, 0.15),
        inset -3px -3px 0.5px -3.5px rgba(168, 85, 247, 0.85),
        inset 1px 1px 1px -0.5px rgba(168, 85, 247, 0.6),
        inset -1px -1px 1px -0.5px rgba(168, 85, 247, 0.6),
        inset 0 0 6px 6px rgba(168, 85, 247, 0.12),
        inset 0 0 2px 2px rgba(168, 85, 247, 0.06),
        0 0 12px rgba(0,0,0,0.15);
    border: 1px solid rgba(168, 85, 247, 0.4);
    background-color: rgba(0, 0, 0, 0.2);
    /* Text color: white (inherited from base) */
}

.liquid-pill-btn-purple:hover {
    background-color: rgba(168, 85, 247, 0.25);
    box-shadow:
        0 0 6px rgba(0,0,0,0.03),
        0 2px 6px rgba(0,0,0,0.08),
        inset 0 0 30px 8px rgba(168, 85, 247, 0.5),
        inset 0 0 60px 4px rgba(168, 85, 247, 0.3),
        0 0 20px rgba(168, 85, 247, 0.4);
}

/* ═══════════════════════════════════════════════════════
   LIQUID PILL BUTTON - YELLOW/ORANGE (Warning)
   ═══════════════════════════════════════════════════════ */

.liquid-pill-btn-yellow {
    box-shadow:
        0 0 6px rgba(0,0,0,0.03),
        0 2px 6px rgba(0,0,0,0.08),
        inset 3px 3px 0.5px -3.5px rgba(234, 179, 8, 0.15),
        inset -3px -3px 0.5px -3.5px rgba(234, 179, 8, 0.85),
        inset 1px 1px 1px -0.5px rgba(234, 179, 8, 0.6),
        inset -1px -1px 1px -0.5px rgba(234, 179, 8, 0.6),
        inset 0 0 6px 6px rgba(234, 179, 8, 0.12),
        inset 0 0 2px 2px rgba(234, 179, 8, 0.06),
        0 0 12px rgba(0,0,0,0.15);
    border: 1px solid rgba(234, 179, 8, 0.4);
    background-color: rgba(0, 0, 0, 0.2);
    /* Text color: white (inherited from base) */
}

.liquid-pill-btn-yellow:hover {
    background-color: rgba(234, 179, 8, 0.25);
    box-shadow:
        0 0 6px rgba(0,0,0,0.03),
        0 2px 6px rgba(0,0,0,0.08),
        inset 0 0 30px 8px rgba(234, 179, 8, 0.5),
        inset 0 0 60px 4px rgba(234, 179, 8, 0.3),
        0 0 20px rgba(234, 179, 8, 0.4);
}
```

#### Size Variants

```css
/* ═══════════════════════════════════════════════════════
   LIQUID PILL BUTTON - SIZE VARIANTS
   ═══════════════════════════════════════════════════════ */

/* Extra Small */
.liquid-pill-btn-xs {
    height: 1.75rem;       /* 28px */
    padding: 0 0.75rem;    /* 12px horizontal */
    font-size: 0.75rem;    /* 12px */
}

/* Small */
.liquid-pill-btn-sm {
    height: 2rem;          /* 32px */
    padding: 0 1rem;       /* 16px horizontal */
    font-size: 0.8125rem;  /* 13px */
}

/* Default */
.liquid-pill-btn-default {
    height: 2.5rem;        /* 40px */
    padding: 0 1.5rem;     /* 24px horizontal */
    font-size: 0.875rem;   /* 14px */
}

/* Large */
.liquid-pill-btn-lg {
    height: 3rem;          /* 48px */
    padding: 0 2rem;       /* 32px horizontal */
    font-size: 1rem;       /* 16px */
}

/* Extra Large */
.liquid-pill-btn-xl {
    height: 3.5rem;        /* 56px */
    padding: 0 2.5rem;     /* 40px horizontal */
    font-size: 1.125rem;   /* 18px */
}

/* Icon Only (Square pill) */
.liquid-pill-btn-icon {
    width: 2.5rem;
    height: 2.5rem;
    padding: 0;
}

.liquid-pill-btn-icon-sm {
    width: 2rem;
    height: 2rem;
    padding: 0;
}

.liquid-pill-btn-icon-lg {
    width: 3rem;
    height: 3rem;
    padding: 0;
}
```

#### React Component Usage

```tsx
import { LiquidButton } from '@/components/ui/liquid-glass-button';

// Default white button
<LiquidButton color="white" size="default">
    Cancel
</LiquidButton>

// Cyan primary action
<LiquidButton color="blue" size="lg">
    Save Changes
</LiquidButton>

// Available colors: "white" | "blue" (cyan)
// Available sizes: "sm" | "default" | "lg" | "xl" | "xxl" | "icon"
```

#### HTML Usage Examples

```html
<!-- Default neutral button -->
<button class="liquid-pill-btn liquid-pill-btn-white liquid-pill-btn-default">
    Cancel
</button>

<!-- Primary cyan action -->
<button class="liquid-pill-btn liquid-pill-btn-cyan liquid-pill-btn-default">
    Save Changes
</button>

<!-- Success confirmation -->
<button class="liquid-pill-btn liquid-pill-btn-green liquid-pill-btn-lg">
    Confirm Purchase
</button>

<!-- Destructive action -->
<button class="liquid-pill-btn liquid-pill-btn-red liquid-pill-btn-sm">
    Delete
</button>

<!-- Icon button -->
<button class="liquid-pill-btn liquid-pill-btn-white liquid-pill-btn-icon">
    <svg>...</svg>
</button>
```

#### Legacy Button Classes (Deprecated)

> **Note:** The following button classes are deprecated. Use `.liquid-pill-btn-*` classes instead.

```css
/* DEPRECATED - Use .liquid-pill-btn-white instead */
.glass-button { /* ... */ }
.glass-button-wrap { /* ... */ }
```

#### Metal Button (Skeuomorphic)

```css
/* ═══════════════════════════════════════════════════════
   METAL BUTTON
   3D skeuomorphic button with press effects
   Use for: Important actions, premium UI, gamification
   ═══════════════════════════════════════════════════════ */

/* Color Variants:
   - default: Silver/gray metallic
   - primary: Blue gradient
   - success: Green gradient
   - error: Red gradient
   - gold: Gold metallic
   - bronze: Bronze metallic
*/

/* Structure: wrapper > inner-layer + button */
.metal-button-wrapper {
    position: relative;
    display: inline-flex;
    transform: translateZ(0);
    border-radius: 0.375rem;
    padding: 1.25px;
    will-change: transform;
    /* background: gradient from dark to light */
}

.metal-button-inner {
    position: absolute;
    inset: 1px;
    transform: translateZ(0);
    border-radius: 0.5rem;
    will-change: transform;
    /* background: gradient for 3D effect */
}

.metal-button {
    position: relative;
    z-index: 10;
    margin: 1px;
    border-radius: 0.375rem;
    display: inline-flex;
    height: 2.75rem;
    transform: translateZ(0);
    cursor: pointer;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    padding: 0.5rem 1.5rem;
    font-size: 0.875rem;
    line-height: 1;
    font-weight: 600;
    will-change: transform;
    outline: none;
    /* background: gradient for button face */
    /* text-shadow for embossed text effect */
}

/* Pressed state transforms */
.metal-button-wrapper--pressed {
    transform: translateY(2.5px) scale(0.99);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}
```

### 4.4 Form Components

#### Custom Select (AppSelect)

```css
/* ═══════════════════════════════════════════════════════
   APP SELECT
   Glass morphism dropdown select
   Use for: Filters, form selects, option pickers
   ═══════════════════════════════════════════════════════ */

.app-select-container {
    position: relative;
    display: inline-flex;
    width: 100%;
    z-index: 1;
}

.app-select-container--open {
    z-index: 999;
}

.app-select-trigger {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    border-radius: 10px;
    border: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(18, 18, 18, 0.4);
    backdrop-filter: blur(16px);
    color: #ffffff;
    font-size: 0.95rem;
    font-weight: 500;
    line-height: 1.4;
    padding: 0.65rem 1rem;
    transition: border-color 0.2s ease,
                box-shadow 0.2s ease,
                background-color 0.2s ease;
}

.app-select-trigger:hover {
    border-color: rgba(255, 255, 255, 0.12);
}

.app-select-trigger:focus {
    outline: none;
    border-color: #06b6d4;
    box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2);
}

.app-select-trigger--disabled {
    opacity: 0.55;
    cursor: not-allowed;
}

.app-select-label {
    flex: 1;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.app-select-label--placeholder {
    color: rgba(255, 255, 255, 0.55);
}

.app-select-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #8A8A8A;
    transition: color 0.2s ease;
}

.app-select-container:focus-within .app-select-icon {
    color: #06b6d4;
}

.app-select-menu {
    position: absolute;
    top: calc(100% + 0.5rem);
    left: 0;
    width: 100%;
    max-height: 260px;
    overflow-y: auto;
    padding: 0.5rem;
    border-radius: 12px;
    background: rgba(18, 18, 18, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.08);
    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
    z-index: 2000;
    backdrop-filter: blur(40px);
}

.app-select-option {
    width: 100%;
    text-align: left;
    padding: 0.65rem 1rem;
    background: transparent;
    border: none;
    border-radius: 8px;
    color: #C6C6C6;
    font-size: 0.95rem;
    font-weight: 500;
    display: flex;
    gap: 0.5rem;
    align-items: center;
    transition: background-color 0.15s ease, color 0.15s ease;
}

.app-select-option:hover:not(.app-select-option--disabled) {
    background-color: rgba(6, 182, 212, 0.12);
    color: #ffffff;
}

.app-select-option--selected {
    background: linear-gradient(135deg,
        rgba(34, 211, 238, 0.2) 0%,
        rgba(6, 182, 212, 0.2) 100%);
    color: #ffffff;
}

.app-select-option--disabled {
    opacity: 0.45;
    cursor: not-allowed;
}
```

#### Glass Select (Simple)

```css
/* ═══════════════════════════════════════════════════════
   GLASS SELECT
   Simple native select with glass styling
   Use for: Quick filters, simple dropdowns
   ═══════════════════════════════════════════════════════ */

.glass-select {
    background-color: rgba(0, 0, 0, 0.5) !important;
    border: 1px solid rgba(6, 182, 212, 0.3) !important;
    color: white !important;
    backdrop-filter: blur(8px);
    border-radius: 8px;
    padding: 4px 8px;
    outline: none;
}

.glass-select option {
    background-color: #0f172a;
    color: white;
}
```

#### Input Field Pattern

```css
/* ═══════════════════════════════════════════════════════
   INPUT FIELD
   Standard glass input styling (used in DataGrid)
   Use for: Form inputs, search fields, text entry
   ═══════════════════════════════════════════════════════ */

.glass-input {
    flex: 1;
    background-color: rgba(35, 35, 40, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.375rem;
    padding: 0.5rem 0.75rem;
    color: #ffffff;
    outline: none;
    transition: border-color 0.2s ease;
}

.glass-input:focus {
    border-color: #FF312E; /* lava-core for focus */
}

.glass-input::placeholder {
    color: #D5D5D5;
}

/* Search input with icon */
.glass-search-wrapper {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    background-color: rgba(35, 35, 40, 0.9);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.375rem;
    padding: 0.5rem 0.75rem;
    transition: border-color 0.2s ease;
}

.glass-search-wrapper:focus-within {
    border-color: #FF312E;
}

.glass-search-wrapper input {
    flex: 1;
    background: transparent;
    color: #ffffff;
    outline: none;
}
```

### 4.5 Navigation Components

#### Active Navigation Item

```css
/* ═══════════════════════════════════════════════════════
   NAV ITEM ACTIVE
   Highlighted state for current navigation item
   Use for: Sidebar navigation, tab indicators
   ═══════════════════════════════════════════════════════ */

.nav-item-active {
    background: linear-gradient(90deg,
        rgba(6, 182, 212, 0.15) 0%,
        transparent 100%);
    border-left: 3px solid #06b6d4;
    color: #fff;
    text-shadow: 0 0 8px rgba(6, 182, 212, 0.6);
}

.nav-item-active .icon-neon {
    filter: drop-shadow(0 0 5px rgba(34, 211, 238, 0.8));
    color: #67e8f9; /* Cyan-300 for brighter active state */
}
```

#### Tab Bar (Mobile)

```css
/* ═══════════════════════════════════════════════════════
   MOBILE TAB BAR
   Bottom navigation for mobile layouts
   Use for: Mobile navigation, app tab bar
   ═══════════════════════════════════════════════════════ */

/* Typically uses Tailwind classes:
   - fixed bottom-0 left-0 right-0
   - bg-black/80 backdrop-blur-lg
   - border-t border-white/10
   - safe-area-inset-bottom padding
*/

.mobile-tab-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0.5rem;
    color: rgba(255, 255, 255, 0.6);
    transition: color 0.2s ease;
}

.mobile-tab-item--active {
    color: #06b6d4;
}
```

### 4.6 Modal Components

#### Confirmation Modal

```css
/* ═══════════════════════════════════════════════════════
   CONFIRMATION MODAL
   Standard dialog for confirmations and alerts
   Use for: Delete confirmations, important actions
   ═══════════════════════════════════════════════════════ */

.modal-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.75);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 50;
    transition: opacity 0.2s ease;
}

.modal-container {
    width: 100%;
    max-width: 28rem;
    transform: translateZ(0);
    transition: all 0.2s ease;
    background-color: #1b1f26;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 22px;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.modal-header {
    padding: 1.5rem;
}

.modal-footer {
    background-color: #151821;
    padding: 1rem 1.5rem;
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0 0 22px 22px;
}
```

#### Bottom Sheet (Mobile)

```css
/* ═══════════════════════════════════════════════════════
   BOTTOM SHEET
   Mobile-friendly modal that slides from bottom
   Use for: Mobile actions, forms, content panels
   ═══════════════════════════════════════════════════════ */

.bottom-sheet-overlay {
    position: fixed;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    z-index: 100;
    animation: fadeIn 0.2s ease;
}

.bottom-sheet-container {
    position: fixed;
    z-index: 101;
    /* Mobile: slides from bottom */
    bottom: 0;
    left: 0;
    right: 0;
    max-height: 90vh;
    border-radius: 1.5rem 1.5rem 0 0;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    overflow: hidden;
    animation: slideUp 0.3s ease;
}

/* Desktop: centers like modal */
@media (min-width: 768px) {
    .bottom-sheet-container {
        bottom: auto;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        max-height: 85vh;
        border-radius: 1rem;
        border: 1px solid rgba(255, 255, 255, 0.1);
        animation: fadeIn 0.2s ease;
    }
}

/* Size variants */
.bottom-sheet--sm { max-width: 28rem; }
.bottom-sheet--md { max-width: 42rem; }
.bottom-sheet--lg { max-width: 56rem; }
.bottom-sheet--full {
    max-width: 100%;
    margin: 1rem;
}

.bottom-sheet-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    background-color: rgba(0, 0, 0, 0.2);
}

.bottom-sheet-content {
    overflow-y: auto;
    max-height: calc(90vh - 80px);
}

@keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}
```

### 4.7 Data Display Components

#### Data Grid / Table

```css
/* ═══════════════════════════════════════════════════════
   DATA GRID
   Styled table with glass morphism
   Use for: Data tables, lists, record displays
   ═══════════════════════════════════════════════════════ */

.data-grid-container {
    height: 100%;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    /* Apply glass-card-outline */
}

.data-grid-header {
    position: sticky;
    top: 0;
    background-color: rgba(18, 18, 18, 0.6);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    z-index: 10;
    backdrop-filter: blur(40px);
}

.data-grid-header th {
    padding: 0.75rem;
    text-align: left;
    font-weight: 600;
    color: #C6C6C6;
    letter-spacing: 0.05em;
}

.data-grid-body {
    /* Rows separated by subtle border */
}

.data-grid-row {
    transition: background-color 0.15s ease;
}

.data-grid-row:hover {
    background-color: rgba(18, 18, 18, 0.6);
}

.data-grid-cell {
    padding: 0.75rem;
    white-space: nowrap;
    color: #C6C6C6;
}

.data-grid-cell--editable:hover {
    background-color: rgba(18, 18, 18, 0.3);
    cursor: pointer;
}

/* Editing state */
.data-grid-cell--editing input {
    flex: 1;
    padding: 0.75rem;
    background-color: rgba(18, 18, 18, 0.6);
    border: 2px solid #FF312E;
    color: #ffffff;
    outline: none;
}
```

#### Progress Bar

```css
/* ═══════════════════════════════════════════════════════
   PROGRESS BAR
   Animated progress indicator
   Use for: Loading states, completion status
   ═══════════════════════════════════════════════════════ */

.progress-root {
    position: relative;
    height: 1rem;
    width: 100%;
    overflow: hidden;
    border-radius: 9999px;
    background-color: hsl(var(--secondary));
}

.progress-indicator {
    height: 100%;
    width: 100%;
    flex: 1;
    background-color: hsl(var(--primary));
    transition: transform 0.3s ease;
    /* transform: translateX(-X%) where X is 100 - progress */
}
```

#### Avatar

```css
/* ═══════════════════════════════════════════════════════
   AVATAR
   User profile images with fallback
   Use for: User profiles, contact lists
   ═══════════════════════════════════════════════════════ */

.avatar-root {
    position: relative;
    display: flex;
    height: 2.5rem;
    width: 2.5rem;
    flex-shrink: 0;
    overflow: hidden;
    border-radius: 9999px;
}

.avatar-image {
    aspect-ratio: 1;
    height: 100%;
    width: 100%;
    object-fit: cover;
}

.avatar-fallback {
    display: flex;
    height: 100%;
    width: 100%;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    background-color: hsl(var(--muted));
    color: #ffffff;
    font-weight: 500;
}
```

### 4.8 Chart & Calendar Components

#### FullCalendar Theme

```css
/* ═══════════════════════════════════════════════════════
   FULLCALENDAR THEMING
   Custom dark theme for FullCalendar
   Use for: Calendar views, scheduling
   ═══════════════════════════════════════════════════════ */

:root {
    --fc-border-color: rgba(255, 255, 255, 0.08);
    --fc-daygrid-event-dot-width: 8px;
    --fc-list-event-dot-width: 10px;
    --fc-event-bg-color: #06b6d4;
    --fc-event-border-color: #22d3ee;
    --fc-event-text-color: #fff;
    --fc-page-bg-color: rgba(18, 18, 18, 0.6);
    --fc-neutral-bg-color: rgba(255, 255, 255, 0.05);
    --fc-today-bg-color: rgba(6, 182, 212, 0.15);
}

/* Event styling */
.fc-h-event {
    background: linear-gradient(135deg,
        #22d3ee 0%,
        #06b6d4 50%,
        #0891b2 100%) !important;
    border-color: transparent !important;
    box-shadow: 0 2px 8px rgba(6, 182, 212, 0.3) !important;
}

/* Today highlight */
.fc-daygrid-day.fc-day-today {
    background-color: var(--fc-today-bg-color) !important;
}

/* Navigation buttons */
.fc .fc-button-primary {
    background: rgba(18, 18, 18, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(40px);
}

.fc .fc-button-primary:hover {
    background: rgba(18, 18, 18, 0.8);
    border-color: rgba(255, 255, 255, 0.12);
}

.fc .fc-button-primary:not(:disabled).fc-button-active,
.fc .fc-button-primary:not(:disabled):active {
    background: linear-gradient(135deg,
        #22d3ee 0%,
        #06b6d4 50%,
        #0891b2 100%);
    border-color: transparent;
}

.fc .fc-toolbar-title {
    color: #FFFFFF;
    font-family: 'Inter Tight', sans-serif;
    font-weight: 500;
    letter-spacing: -0.02em;
}
```

#### Recharts Overrides

```css
/* ═══════════════════════════════════════════════════════
   RECHARTS THEMING
   Text and label overrides for charts
   Use for: All Recharts-based visualizations
   ═══════════════════════════════════════════════════════ */

.recharts-text {
    fill: #ffffff !important;
}

.recharts-cartesian-axis-tick-value {
    fill: #ffffff !important;
}

.recharts-legend-item-text {
    color: #ffffff !important;
}

/* Special: Neon green labels for step area charts */
.recharts-label-list text {
    fill: #00ff88 !important;
    stroke: rgba(0, 0, 0, 0.8) !important;
    stroke-width: 2px !important;
    paint-order: stroke fill !important;
    filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.5)) !important;
}
```

---

## 5. Spacing & Layout System

> **Based on Radix UI Themes** - A systematic approach to spacing and layout that ensures consistency across your entire application.

### 5.1 Spacing Scale (Radix-Based)

The spacing scale provides a consistent set of values for margins, padding, and gaps. Use these exclusively for all spacing needs.

```css
/* ═══════════════════════════════════════════════════════
   SPACING SCALE - Radix UI Themes
   A 9-step scale from compact to spacious
   ═══════════════════════════════════════════════════════ */

:root {
    --space-1: 4px;    /* Tight: icon padding, tiny gaps */
    --space-2: 8px;    /* Compact: button padding, small gaps */
    --space-3: 12px;   /* Default: input padding, component gaps */
    --space-4: 16px;   /* Standard: card padding, grid gaps */
    --space-5: 24px;   /* Comfortable: section padding */
    --space-6: 32px;   /* Relaxed: large card padding */
    --space-7: 40px;   /* Spacious: page section gaps */
    --space-8: 48px;   /* Extra spacious: hero sections */
    --space-9: 64px;   /* Maximum: page-level spacing */

    /* Scaling factor for UI density adjustment (90%-110%) */
    --scaling: 1;
}
```

#### Spacing Scale Reference Table

| Step | Value | CSS Variable | Use Case |
|------|-------|--------------|----------|
| **1** | 4px | `var(--space-1)` | Icon padding, inline element gaps, tight spacing |
| **2** | 8px | `var(--space-2)` | Button internal padding, small component gaps |
| **3** | 12px | `var(--space-3)` | Input padding, default gap between related items |
| **4** | 16px | `var(--space-4)` | Card padding, grid gaps, standard component spacing |
| **5** | 24px | `var(--space-5)` | Section padding, comfortable card padding |
| **6** | 32px | `var(--space-6)` | Large card padding, sidebar padding |
| **7** | 40px | `var(--space-7)` | Page section vertical spacing |
| **8** | 48px | `var(--space-8)` | Hero section padding, major content separation |
| **9** | 64px | `var(--space-9)` | Page-level top/bottom padding, maximum spacing |

#### Tailwind Mapping

```css
/* Map Radix spacing to Tailwind classes */
.p-1 { padding: var(--space-1); }    /* 4px */
.p-2 { padding: var(--space-2); }    /* 8px */
.p-3 { padding: var(--space-3); }    /* 12px */
.p-4 { padding: var(--space-4); }    /* 16px */
.p-5 { padding: var(--space-5); }    /* 24px */
.p-6 { padding: var(--space-6); }    /* 32px */
.p-7 { padding: var(--space-7); }    /* 40px */
.p-8 { padding: var(--space-8); }    /* 48px */
.p-9 { padding: var(--space-9); }    /* 64px */

/* Same pattern for margins (m-*), gaps (gap-*), etc. */
```

---

### 5.2 Layout Components (Radix-Based)

The layout system uses five core components, each with a specific responsibility:

#### Component Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│  Section (py="7-9")                                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Container (size="1-4")                               │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │  Flex / Grid (gap="3-5")                        │  │  │
│  │  │  ┌─────────┐ ┌─────────┐ ┌─────────┐            │  │  │
│  │  │  │  Box    │ │  Box    │ │  Box    │            │  │  │
│  │  │  │  (p=4)  │ │  (p=4)  │ │  (p=4)  │            │  │  │
│  │  │  └─────────┘ └─────────┘ └─────────┘            │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

#### Box Component

> **The fundamental building block** - Use for spacing, sizing constraints, and flex/grid child behavior.

```tsx
/* ═══════════════════════════════════════════════════════
   BOX - Fundamental Layout Building Block
   Purpose: Spacing, sizing, positioning
   ═══════════════════════════════════════════════════════ */

interface BoxProps {
    // Element type
    as?: "div" | "span";
    asChild?: boolean;

    // Display
    display?: "none" | "inline" | "inline-block" | "block";

    // Padding (accepts spacing scale 1-9 or CSS values)
    p?: SpaceScale;      // All sides
    px?: SpaceScale;     // Horizontal (left + right)
    py?: SpaceScale;     // Vertical (top + bottom)
    pt?: SpaceScale;     // Top
    pr?: SpaceScale;     // Right
    pb?: SpaceScale;     // Bottom
    pl?: SpaceScale;     // Left

    // Dimensions
    width?: string;
    height?: string;
    minWidth?: string;
    maxWidth?: string;
    minHeight?: string;
    maxHeight?: string;

    // Positioning
    position?: "static" | "relative" | "absolute" | "fixed" | "sticky";
    inset?: string;
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;

    // Overflow
    overflow?: "visible" | "hidden" | "clip" | "scroll" | "auto";
    overflowX?: "visible" | "hidden" | "clip" | "scroll" | "auto";
    overflowY?: "visible" | "hidden" | "clip" | "scroll" | "auto";

    // Flex/Grid child behavior
    flexBasis?: string;
    flexShrink?: "0" | "1";
    flexGrow?: "0" | "1";
    gridArea?: string;
    gridColumn?: string;
    gridRow?: string;
}
```

**Usage Examples:**

```jsx
/* Spacing wrapper */
<Box p="4">
    <CardContent />
</Box>

/* Sizing constraint */
<Box width="64px" height="64px">
    <Avatar />
</Box>

/* Flex child with specific behavior */
<Flex>
    <Box flexGrow="1">Main content</Box>
    <Box flexShrink="0" width="200px">Sidebar</Box>
</Flex>

/* Responsive padding */
<Box p={{ initial: "3", md: "5", lg: "6" }}>
    <Content />
</Box>
```

---

#### Flex Component

> **Single-axis layout** - Organize items horizontally or vertically with powerful alignment controls.

```tsx
/* ═══════════════════════════════════════════════════════
   FLEX - Flexbox Layout Component
   Purpose: Single-axis arrangement of items
   ═══════════════════════════════════════════════════════ */

interface FlexProps extends BoxProps {
    // Display
    display?: "none" | "inline-flex" | "flex";

    // Direction
    direction?: "row" | "column" | "row-reverse" | "column-reverse";

    // Alignment
    align?: "start" | "center" | "end" | "baseline" | "stretch";
    justify?: "start" | "center" | "end" | "between";

    // Wrapping
    wrap?: "nowrap" | "wrap" | "wrap-reverse";

    // Gap (accepts spacing scale 1-9)
    gap?: SpaceScale;     // Uniform gap
    gapX?: SpaceScale;    // Horizontal gap (row-gap)
    gapY?: SpaceScale;    // Vertical gap (column-gap)
}
```

**Usage Examples:**

```jsx
/* Horizontal row with centered items */
<Flex direction="row" align="center" gap="3">
    <Icon />
    <Text>Label</Text>
</Flex>

/* Vertical stack with spacing */
<Flex direction="column" gap="4">
    <Card />
    <Card />
    <Card />
</Flex>

/* Space between with wrapping */
<Flex justify="between" wrap="wrap" gap="4">
    <Button>Cancel</Button>
    <Button>Save</Button>
</Flex>

/* Responsive direction */
<Flex
    direction={{ initial: "column", md: "row" }}
    gap={{ initial: "3", md: "5" }}
>
    <Sidebar />
    <MainContent />
</Flex>
```

**Common Flex Patterns:**

| Pattern | Props | Use Case |
|---------|-------|----------|
| **Horizontal Center** | `justify="center" align="center"` | Modal content, hero text |
| **Space Between** | `justify="between" align="center"` | Header, navbar items |
| **Vertical Stack** | `direction="column" gap="4"` | Form fields, card list |
| **Inline Items** | `direction="row" gap="2" align="center"` | Tags, buttons, icons+text |

---

#### Grid Component

> **Multi-dimensional layout** - Organize content in columns and rows with precise control.

```tsx
/* ═══════════════════════════════════════════════════════
   GRID - CSS Grid Layout Component
   Purpose: Two-dimensional content organization
   ═══════════════════════════════════════════════════════ */

interface GridProps extends BoxProps {
    // Display
    display?: "none" | "inline-grid" | "grid";

    // Structure
    columns?: string | number;  // "3", "repeat(3, 1fr)", etc.
    rows?: string;              // "repeat(2, 64px)", "auto", etc.

    // Gap (accepts spacing scale 1-9)
    gap?: SpaceScale;
    gapX?: SpaceScale;
    gapY?: SpaceScale;

    // Flow
    flow?: "row" | "column" | "dense" | "row-dense" | "column-dense";

    // Alignment
    align?: "start" | "center" | "end" | "baseline" | "stretch";
    justify?: "start" | "center" | "end" | "between";

    // Named areas
    areas?: string;
}
```

**Usage Examples:**

```jsx
/* Simple 3-column grid */
<Grid columns="3" gap="4">
    <Card />
    <Card />
    <Card />
</Grid>

/* Responsive columns */
<Grid
    columns={{ initial: "1", sm: "2", lg: "3", xl: "4" }}
    gap="4"
>
    {cards.map(card => <Card key={card.id} />)}
</Grid>

/* Fixed row heights */
<Grid columns="3" rows="repeat(2, 200px)" gap="4">
    {/* 6 items in 3x2 grid */}
</Grid>

/* Dashboard layout with named areas */
<Grid
    areas="'header header' 'sidebar main' 'footer footer'"
    columns="250px 1fr"
    rows="auto 1fr auto"
>
    <Box gridArea="header"><Header /></Box>
    <Box gridArea="sidebar"><Sidebar /></Box>
    <Box gridArea="main"><MainContent /></Box>
    <Box gridArea="footer"><Footer /></Box>
</Grid>
```

**Common Grid Patterns:**

| Pattern | Props | Use Case |
|---------|-------|----------|
| **Card Grid** | `columns={{ initial: "1", md: "2", lg: "3" }} gap="4"` | Product listings, dashboards |
| **Stats Row** | `columns="4" gap="4"` | KPI cards, metrics |
| **Form Layout** | `columns="2" gap="4"` | Two-column forms |
| **Gallery** | `columns={{ initial: "2", md: "3", lg: "4" }} gap="2"` | Image galleries |

---

#### Container Component

> **Max-width constraint** - Limit content width for optimal readability.

```tsx
/* ═══════════════════════════════════════════════════════
   CONTAINER - Content Width Constraint
   Purpose: Constrain page content to readable widths
   ═══════════════════════════════════════════════════════ */

interface ContainerProps extends BoxProps {
    // Size presets
    size?: "1" | "2" | "3" | "4";  // Default: "4"

    // Alignment
    align?: "left" | "center" | "right";  // Default: "center"
}
```

**Container Size Scale:**

| Size | Max-Width | CSS Variable | Use Case |
|------|-----------|--------------|----------|
| **1** | 448px | `--container-1` | Narrow content: login forms, dialogs |
| **2** | 688px | `--container-2` | Medium content: articles, settings |
| **3** | 880px | `--container-3` | Wide content: documentation, blogs |
| **4** | 1136px | `--container-4` | Full content: dashboards, data tables |

**Usage Examples:**

```jsx
/* Standard page layout */
<Container size="4">
    <PageContent />
</Container>

/* Narrow form container */
<Container size="1">
    <LoginForm />
</Container>

/* Article with optimal reading width */
<Container size="2">
    <Article />
</Container>

/* Left-aligned container */
<Container size="3" align="left">
    <SidebarLayout />
</Container>
```

---

#### Section Component

> **Vertical page sections** - Provide consistent vertical rhythm between major page sections.

```tsx
/* ═══════════════════════════════════════════════════════
   SECTION - Page Section Separator
   Purpose: Consistent vertical spacing between sections
   ═══════════════════════════════════════════════════════ */

interface SectionProps extends BoxProps {
    // Size presets (controls vertical padding)
    size?: "1" | "2" | "3" | "4";  // Default: "3"
}
```

**Section Size Scale:**

| Size | Padding | Use Case |
|------|---------|----------|
| **1** | `py: var(--space-5)` (24px) | Compact sections, mobile |
| **2** | `py: var(--space-7)` (40px) | Standard sections |
| **3** | `py: var(--space-8)` (48px) | Default: comfortable spacing |
| **4** | `py: var(--space-9)` (64px) | Hero sections, spacious layouts |

**Usage Examples:**

```jsx
/* Standard page structure */
<main>
    <Section size="4">
        <Container>
            <HeroContent />
        </Container>
    </Section>

    <Section size="3">
        <Container>
            <FeaturesGrid />
        </Container>
    </Section>

    <Section size="2">
        <Container>
            <CTASection />
        </Container>
    </Section>
</main>
```

---

### 5.3 Responsive Design System

#### Breakpoint Scale (Radix-Based)

```css
/* ═══════════════════════════════════════════════════════
   BREAKPOINTS - Mobile-First Responsive Design
   All breakpoints use min-width media queries
   ═══════════════════════════════════════════════════════ */

:root {
    --breakpoint-initial: 0px;     /* Base/Mobile (default) */
    --breakpoint-xs: 520px;        /* Phones (landscape) */
    --breakpoint-sm: 768px;        /* Tablets (portrait) */
    --breakpoint-md: 1024px;       /* Tablets (landscape) / Small laptops */
    --breakpoint-lg: 1280px;       /* Laptops / Desktops */
    --breakpoint-xl: 1640px;       /* Large desktops */
}
```

| Breakpoint | Width | Device Target |
|------------|-------|---------------|
| `initial` | 0px | Mobile phones (portrait) - **DEFAULT** |
| `xs` | 520px | Mobile phones (landscape) |
| `sm` | 768px | Tablets (portrait) |
| `md` | 1024px | Tablets (landscape), small laptops |
| `lg` | 1280px | Laptops, desktops |
| `xl` | 1640px | Large desktops, ultrawide |

#### Responsive Prop Syntax

All layout props accept responsive objects:

```jsx
/* Responsive object syntax */
<Grid
    columns={{
        initial: "1",    // Mobile: 1 column
        sm: "2",         // Tablet: 2 columns
        lg: "3",         // Desktop: 3 columns
        xl: "4"          // Large desktop: 4 columns
    }}
    gap={{
        initial: "3",    // Mobile: 12px gap
        md: "4",         // Tablet+: 16px gap
        lg: "5"          // Desktop: 24px gap
    }}
>
    {items.map(item => <Card key={item.id} />)}
</Grid>

/* Responsive padding */
<Box
    p={{
        initial: "3",    // Mobile: 12px
        md: "5",         // Tablet+: 24px
        lg: "6"          // Desktop: 32px
    }}
>
    <Content />
</Box>

/* Responsive direction */
<Flex
    direction={{
        initial: "column",  // Mobile: vertical stack
        md: "row"           // Tablet+: horizontal row
    }}
    gap="4"
>
    <Sidebar />
    <Main />
</Flex>
```

---

### 5.4 Layout Patterns & Guidelines

#### When to Use Each Component

| Scenario | Component | Example |
|----------|-----------|---------|
| Add padding/margin to content | `Box` | `<Box p="4"><Card /></Box>` |
| Constrain element dimensions | `Box` | `<Box maxWidth="400px">` |
| Horizontal row of items | `Flex` | Navbar, button groups |
| Vertical stack of items | `Flex direction="column"` | Form fields, card list |
| Card/tile grid | `Grid` | Dashboard cards, product grid |
| Complex 2D layout | `Grid` | Page layout with sidebar |
| Constrain page width | `Container` | Wrap main content |
| Separate page sections | `Section` | Hero, features, CTA areas |

#### Spacing Guidelines

| Element Type | Recommended Spacing |
|--------------|-------------------|
| **Icon + Text** | `gap="1"` or `gap="2"` (4-8px) |
| **Button Groups** | `gap="2"` or `gap="3"` (8-12px) |
| **Form Fields** | `gap="4"` (16px) |
| **Cards in Grid** | `gap="4"` or `gap="5"` (16-24px) |
| **Card Internal** | `p="4"` or `p="5"` (16-24px) |
| **Section Internal** | `p="5"` or `p="6"` (24-32px) |
| **Page Sections** | Section `size="3"` or `size="4"` |

#### Best Practices

1. **Separation of Concerns** - Use layout components to isolate layout from content
2. **Consistent Spacing** - Always use the spacing scale (1-9), never arbitrary values
3. **Mobile-First** - Start with `initial` values, add larger breakpoints as needed
4. **Semantic Structure** - Use `Section` for semantic page sections
5. **Width Constraints** - Always wrap page content in `Container`

---

### 5.5 Utility Classes (Tailwind Compatible)

While Radix components are preferred, these utility classes are available for quick styling:

#### Display & Layout Utilities

```css
/* ═══════════════════════════════════════════════════════
   LAYOUT UTILITIES
   ═══════════════════════════════════════════════════════ */

.flex { display: flex; }
.inline-flex { display: inline-flex; }
.grid { display: grid; }
.hidden { display: none; }
.block { display: block; }

.flex-col { flex-direction: column; }
.flex-row { flex-direction: row; }
.flex-1 { flex: 1 1 0%; }
.flex-shrink-0 { flex-shrink: 0; }

.items-center { align-items: center; }
.items-start { align-items: flex-start; }
.items-end { align-items: flex-end; }

.justify-center { justify-content: center; }
.justify-between { justify-content: space-between; }
.justify-end { justify-content: flex-end; }

.w-full { width: 100%; }
.h-full { height: 100%; }
.min-w-full { min-width: 100%; }
```

### Typography Utilities

```css
/* ═══════════════════════════════════════════════════════
   TYPOGRAPHY UTILITIES
   ═══════════════════════════════════════════════════════ */

/* Font Size */
.text-xs { font-size: 0.75rem; }    /* 12px */
.text-sm { font-size: 0.875rem; }   /* 14px */
.text-base { font-size: 1rem; }     /* 16px */
.text-lg { font-size: 1.125rem; }   /* 18px */
.text-xl { font-size: 1.25rem; }    /* 20px */
.text-2xl { font-size: 1.5rem; }    /* 24px */

/* Font Weight */
.font-normal { font-weight: 400; }
.font-medium { font-weight: 500; }
.font-semibold { font-weight: 600; }
.font-bold { font-weight: 700; }

/* Text Alignment */
.text-left { text-align: left; }
.text-center { text-align: center; }
.text-right { text-align: right; }

/* Text Transform */
.uppercase { text-transform: uppercase; }
.capitalize { text-transform: capitalize; }

/* Whitespace */
.whitespace-nowrap { white-space: nowrap; }
.truncate {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
```

### Visibility & Positioning

```css
/* ═══════════════════════════════════════════════════════
   VISIBILITY & POSITIONING
   ═══════════════════════════════════════════════════════ */

.relative { position: relative; }
.absolute { position: absolute; }
.fixed { position: fixed; }
.sticky { position: sticky; }

.inset-0 { top: 0; right: 0; bottom: 0; left: 0; }
.top-0 { top: 0; }
.right-0 { right: 0; }
.bottom-0 { bottom: 0; }
.left-0 { left: 0; }

.z-10 { z-index: 10; }
.z-40 { z-index: 40; }
.z-50 { z-index: 50; }
.z-\[100\] { z-index: 100; }
.z-\[9999\] { z-index: 9999; }

.overflow-hidden { overflow: hidden; }
.overflow-auto { overflow: auto; }
.overflow-y-auto { overflow-y: auto; }
```

### Transition Utilities

```css
/* ═══════════════════════════════════════════════════════
   TRANSITIONS
   ═══════════════════════════════════════════════════════ */

.transition {
    transition-property: color, background-color, border-color,
                        text-decoration-color, fill, stroke, opacity,
                        box-shadow, transform, filter, backdrop-filter;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
}

.transition-all {
    transition-property: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
}

.transition-colors {
    transition-property: color, background-color, border-color;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
    transition-duration: 150ms;
}

.transition-smooth {
    transition: all 0.2s ease;
}

.duration-200 { transition-duration: 200ms; }
.duration-300 { transition-duration: 300ms; }
.duration-500 { transition-duration: 500ms; }
```

### Border & Ring Utilities

```css
/* ═══════════════════════════════════════════════════════
   BORDERS & RINGS
   ═══════════════════════════════════════════════════════ */

.border { border-width: 1px; }
.border-t { border-top-width: 1px; }
.border-b { border-bottom-width: 1px; }
.border-l { border-left-width: 1px; }
.border-r { border-right-width: 1px; }

.border-border { border-color: hsl(var(--border)); }
.border-white\/10 { border-color: rgba(255, 255, 255, 0.1); }
.border-white\/08 { border-color: rgba(255, 255, 255, 0.08); }

.rounded { border-radius: 0.25rem; }
.rounded-md { border-radius: 0.375rem; }
.rounded-lg { border-radius: 0.5rem; }
.rounded-xl { border-radius: 0.75rem; }
.rounded-2xl { border-radius: 1rem; }
.rounded-full { border-radius: 9999px; }

/* Focus rings */
.focus\:ring-2:focus { box-shadow: 0 0 0 2px var(--ring-color); }
.ring-offset-2 { --ring-offset-width: 2px; }
```

---

## 6. Responsive Design

### Breakpoint System

```css
/* ═══════════════════════════════════════════════════════
   BREAKPOINTS
   Mobile-first responsive design
   ═══════════════════════════════════════════════════════ */

/* Tailwind Default + Custom 2xl */
/* sm:  640px  - Small tablets */
/* md:  768px  - Tablets */
/* lg:  1024px - Small laptops */
/* xl:  1280px - Desktops */
/* 2xl: 1400px - Large desktops (custom) */

/* Example usage: */
.hidden { display: none; }
.lg\:block { }
@media (min-width: 1024px) {
    .lg\:block { display: block; }
}

/* Common responsive patterns in codebase: */
.md\:max-w-2xl    /* Modal width on desktop */
.lg\:hidden       /* Hide on desktop */
.md\:hidden       /* Hide on tablet+ */
```

### Mobile Layout Patterns

```css
/* ═══════════════════════════════════════════════════════
   MOBILE-SPECIFIC PATTERNS
   ═══════════════════════════════════════════════════════ */

/* Mobile tab bar */
.mobile-tab-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(16px);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-bottom: env(safe-area-inset-bottom);
    z-index: 50;
}

/* Safe area insets */
.safe-bottom {
    padding-bottom: env(safe-area-inset-bottom);
}

/* Touch targets (minimum 44px) */
.touch-target {
    min-height: 44px;
    min-width: 44px;
}

/* Full-height mobile screens */
.h-screen-safe {
    height: calc(100vh - env(safe-area-inset-bottom));
}
```

### Responsive Grid

```css
/* ═══════════════════════════════════════════════════════
   RESPONSIVE GRID PATTERNS
   ═══════════════════════════════════════════════════════ */

/* Auto-fit cards */
.card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 1rem;
}

/* Fixed columns */
.grid-cols-1 { grid-template-columns: repeat(1, minmax(0, 1fr)); }
.md\:grid-cols-2 { }
@media (min-width: 768px) {
    .md\:grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
.lg\:grid-cols-3 { }
@media (min-width: 1024px) {
    .lg\:grid-cols-3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
```

---

## 7. Animation & Transitions

### Keyframe Animations

```css
/* ═══════════════════════════════════════════════════════
   KEYFRAME ANIMATIONS
   ═══════════════════════════════════════════════════════ */

/* Accordion collapse/expand */
@keyframes accordion-down {
    from { height: 0; }
    to { height: var(--radix-accordion-content-height); }
}

@keyframes accordion-up {
    from { height: var(--radix-accordion-content-height); }
    to { height: 0; }
}

/* Slow spin for loading/decorative */
@keyframes spin-slow {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

/* Reverse slow spin */
@keyframes spin-slower {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(-360deg); }
}

/* Orb movement for background */
@keyframes moveOrb1 {
    0% { transform: translate(0, 0); }
    50% { transform: translate(300px, 200px); }
    100% { transform: translate(0, 0); }
}

@keyframes moveOrb2 {
    0% { transform: translate(0, 0); }
    50% { transform: translate(-200px, 100px); }
    100% { transform: translate(0, 0); }
}

/* Fade in */
@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

/* Slide up (for bottom sheets) */
@keyframes slideUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
}
```

### Animation Classes

```css
/* ═══════════════════════════════════════════════════════
   ANIMATION CLASSES
   ═══════════════════════════════════════════════════════ */

.animate-accordion-down {
    animation: accordion-down 0.2s ease-out;
}

.animate-accordion-up {
    animation: accordion-up 0.2s ease-out;
}

.animate-spin-slow {
    animation: spin-slow 3s linear infinite;
}

.animate-spin-slower {
    animation: spin-slower 6s linear infinite;
}

.animate-fade-in {
    animation: fadeIn 0.2s ease;
}

.animate-slide-up {
    animation: slideUp 0.3s ease;
}
```

### Transition Standards

```css
/* ═══════════════════════════════════════════════════════
   TRANSITION STANDARDS
   ═══════════════════════════════════════════════════════ */

/* Default timing */
--transition-fast: 150ms;
--transition-normal: 200ms;
--transition-slow: 300ms;
--transition-slower: 500ms;

/* Easing functions */
--ease-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-spring: cubic-bezier(0.1, 0.4, 0.2, 1);

/* Common transitions */
.transition-colors {
    transition: color 150ms ease,
                background-color 150ms ease,
                border-color 150ms ease;
}

.transition-transform {
    transition: transform 200ms ease;
}

.transition-opacity {
    transition: opacity 200ms ease;
}

.transition-smooth {
    transition: all 200ms ease;
}
```

---

## 8. Usage Examples

### 8.1 Glass Card Examples

#### Basic Stats Card

```html
<div class="glass-card-outline p-6">
    <div class="flex items-center justify-between">
        <div>
            <p class="text-sm text-secondary-contrast mb-1">Total Sales</p>
            <h3 class="text-2xl font-bold text-primary-contrast">$124,500</h3>
        </div>
        <div class="p-3 rounded-full bg-white/5">
            <svg class="h-6 w-6 icon-neon"><!-- Icon --></svg>
        </div>
    </div>
    <div class="mt-4 flex items-center gap-2">
        <span class="text-dynamic-green text-sm">+12.5%</span>
        <span class="text-xs text-muted-contrast">vs last month</span>
    </div>
</div>
```

#### Featured Card with Accent

```html
<div class="glass-card-accent p-6">
    <h2 class="text-xl font-semibold text-primary-contrast mb-4">
        Featured Deal
    </h2>
    <p class="text-secondary-contrast mb-6">
        2024 Honda Accord - Premium trim with all options
    </p>
    <div class="glass-button-wrap glass-card-outline">
        <button class="glass-button">
            <span class="glass-button-text glass-button-text--default">
                View Details
            </span>
        </button>
    </div>
</div>
```

#### Dynamic Color Card

```html
<div class="glass-card-outline-colored p-4" style="--outline-color: #34d399;">
    <div class="flex items-center gap-3">
        <div class="p-2 rounded-lg bg-white/5">
            <svg class="h-5 w-5 text-emerald-400"><!-- Check icon --></svg>
        </div>
        <div>
            <p class="text-sm font-medium text-primary-contrast">Payment Received</p>
            <p class="text-xs text-muted-contrast">$2,450.00 processed</p>
        </div>
    </div>
</div>
```

### 8.2 Button Examples

#### Primary Actions

```html
<!-- Glass button for primary CTA -->
<div class="glass-button-wrap glass-card-outline">
    <button class="glass-button">
        <span class="glass-button-text glass-button-text--default">
            Save Changes
        </span>
    </button>
</div>

<!-- Small glass button -->
<div class="glass-button-wrap glass-card-outline">
    <button class="glass-button" size="sm">
        <span class="glass-button-text glass-button-text--sm">
            Cancel
        </span>
    </button>
</div>

<!-- Icon button -->
<div class="glass-button-wrap glass-card-outline">
    <button class="glass-button">
        <span class="glass-button-text glass-button-text--icon">
            <svg class="h-5 w-5"><!-- Plus icon --></svg>
        </span>
    </button>
</div>
```

#### Standard Buttons

```html
<!-- Default button -->
<button class="button-base button-default button-size-default">
    Submit
</button>

<!-- Destructive button -->
<button class="button-base button-destructive button-size-default">
    Delete
</button>

<!-- Ghost button -->
<button class="button-base button-ghost button-size-sm">
    Learn More
</button>
```

### 8.3 Form Examples

#### Search Input

```html
<div class="glass-search-wrapper">
    <svg class="h-5 w-5 text-muted flex-shrink-0">
        <!-- Search icon -->
    </svg>
    <input
        type="text"
        placeholder="Search across all columns..."
        class="flex-1 bg-transparent focus:outline-none placeholder:text-placeholder"
    />
    <button class="p-1 text-muted hover:text-primary transition-colors">
        <svg class="h-5 w-5"><!-- X icon --></svg>
    </button>
</div>
```

#### Select Dropdown

```html
<div class="app-select-container">
    <button class="app-select-trigger">
        <span class="app-select-label">Select Vehicle</span>
        <span class="app-select-icon">
            <svg width="12" height="12" viewBox="0 0 24 24">
                <polyline points="6 9 12 15 18 9" />
            </svg>
        </span>
    </button>
    <!-- Menu renders via portal when open -->
</div>
```

### 8.4 Navigation Examples

#### Sidebar Navigation

```html
<nav class="floating-sidebar-outline w-64 flex flex-col p-4 h-[calc(100vh-32px)]">
    <div class="flex items-center justify-center p-4 mb-8">
        <img src="/logo.png" alt="Logo" class="w-full object-contain" />
    </div>

    <ul class="flex-1 space-y-2">
        <!-- Active item -->
        <li>
            <button class="flex w-full items-center p-3 rounded-r-xl nav-item-active">
                <svg class="h-6 w-6 mr-3 icon-neon"><!-- Icon --></svg>
                <span class="font-medium">Dashboard</span>
            </button>
        </li>

        <!-- Inactive item -->
        <li>
            <button class="flex w-full items-center p-3 rounded-r-xl text-secondary-contrast hover:bg-white/5 transition-smooth">
                <svg class="h-6 w-6 mr-3 text-slate-500 group-hover:icon-neon"><!-- Icon --></svg>
                <span class="font-medium">Inventory</span>
            </button>
        </li>

        <!-- Disabled item -->
        <li>
            <button disabled class="flex w-full items-center p-3 rounded-r-xl opacity-50 cursor-not-allowed">
                <svg class="h-6 w-6 mr-3 text-slate-600"><!-- Icon --></svg>
                <span class="font-medium">CRM</span>
                <span class="text-xs text-slate-500 ml-2">(coming soon)</span>
            </button>
        </li>
    </ul>
</nav>
```

### 8.5 Modal Examples

#### Confirmation Dialog

```html
<div class="modal-overlay">
    <div class="modal-container">
        <div class="modal-header">
            <div class="flex items-start">
                <div class="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-red-900/50">
                    <svg class="h-6 w-6 text-red-400"><!-- Warning icon --></svg>
                </div>
                <div class="ml-4">
                    <h3 class="text-xl font-bold text-primary-contrast tracking-tight-lg">
                        Delete Vehicle
                    </h3>
                    <p class="mt-2 text-sm text-secondary-contrast">
                        Are you sure you want to delete this vehicle? This action cannot be undone.
                    </p>
                </div>
            </div>
        </div>
        <div class="modal-footer">
            <div class="glass-button-wrap glass-card-outline">
                <button class="glass-button">
                    <span class="glass-button-text glass-button-text--sm">Cancel</span>
                </button>
            </div>
            <div class="glass-button-wrap glass-card-outline">
                <button class="glass-button">
                    <span class="glass-button-text glass-button-text--sm">Delete</span>
                </button>
            </div>
        </div>
    </div>
</div>
```

### 8.6 Data Table Example

```html
<div class="glass-card-outline overflow-hidden">
    <!-- Search Bar -->
    <div class="p-4 border-b border-border-low bg-glass-panel">
        <div class="glass-search-wrapper">
            <svg class="h-5 w-5 text-muted"><!-- Search icon --></svg>
            <input type="text" placeholder="Search..." class="flex-1 bg-transparent" />
        </div>
    </div>

    <!-- Table -->
    <div class="overflow-auto">
        <table class="min-w-full text-sm">
            <thead class="sticky top-0 bg-glass-panel border-b border-border-low backdrop-blur-glass">
                <tr>
                    <th class="p-3 text-left font-semibold text-secondary tracking-wider">Stock #</th>
                    <th class="p-3 text-left font-semibold text-secondary tracking-wider">Vehicle</th>
                    <th class="p-3 text-left font-semibold text-secondary tracking-wider">Price</th>
                    <th class="p-3 text-left font-semibold text-secondary tracking-wider">Status</th>
                </tr>
            </thead>
            <tbody class="divide-y divide-border-low">
                <tr class="hover:bg-glass-panel transition-colors">
                    <td class="p-3 text-secondary">A001</td>
                    <td class="p-3 text-secondary">2024 Honda Accord</td>
                    <td class="p-3 text-secondary">$28,500</td>
                    <td class="p-3">
                        <span class="px-2 py-1 text-xs rounded-full bg-emerald-500/20 text-emerald-400">
                            Available
                        </span>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</div>
```

---

## 9. Accessibility Guidelines

### Color Contrast

| Element | Foreground | Background | Ratio | Status |
|---------|-----------|------------|-------|--------|
| Body Text | #FFFFFF | #0a0a0a | 21:1 | AAA |
| Secondary Text | #C6C6C6 | #0a0a0a | 12.6:1 | AAA |
| Primary Accent | #06b6d4 | #0a0a0a | 8.1:1 | AAA |
| Link Text | #22d3ee | #0a0a0a | 9.4:1 | AAA |
| Error Text | #ef4444 | #0a0a0a | 5.4:1 | AA |
| Success Text | #34d399 | #0a0a0a | 8.6:1 | AAA |

### Focus States

```css
/* ═══════════════════════════════════════════════════════
   FOCUS STATE REQUIREMENTS
   ═══════════════════════════════════════════════════════ */

/* All interactive elements must have visible focus */
:focus-visible {
    outline: 2px solid #06b6d4;
    outline-offset: 2px;
}

/* Or use ring utilities */
.focus\:ring-2:focus {
    box-shadow: 0 0 0 2px rgba(6, 182, 212, 0.5);
}

/* Form inputs */
input:focus,
select:focus,
textarea:focus {
    border-color: #06b6d4;
    box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2);
    outline: none;
}
```

### Semantic HTML Guidelines

1. **Headings**: Use proper heading hierarchy (h1 > h2 > h3)
2. **Landmarks**: Use semantic elements (`<nav>`, `<main>`, `<aside>`, `<footer>`)
3. **Buttons vs Links**: Use `<button>` for actions, `<a>` for navigation
4. **Form Labels**: Every input must have an associated `<label>`
5. **Alt Text**: All images must have descriptive alt text
6. **ARIA**: Use ARIA attributes when native semantics are insufficient

### Keyboard Navigation

```html
<!-- Ensure tab order is logical -->
<button tabindex="0">First</button>
<button tabindex="0">Second</button>

<!-- Skip links for main content -->
<a href="#main-content" class="sr-only focus:not-sr-only">
    Skip to main content
</a>

<!-- Modal focus trapping -->
<!-- Focus should cycle within modal when open -->

<!-- Escape key closes modals/dropdowns -->
<!-- Arrow keys navigate lists -->
```

### Screen Reader Considerations

```html
<!-- Hidden but accessible text -->
<span class="sr-only">Close menu</span>

<!-- Aria labels for icon buttons -->
<button aria-label="Delete item">
    <svg><!-- Trash icon --></svg>
</button>

<!-- Live regions for dynamic content -->
<div aria-live="polite" aria-atomic="true">
    <!-- Status messages appear here -->
</div>

<!-- Expanded/collapsed states -->
<button aria-expanded="false" aria-controls="menu-id">
    Toggle Menu
</button>
```

---

## 10. Best Practices

### Implementation Guidelines

1. **Use CSS Variables**: Always reference design tokens via CSS variables for consistency
2. **Prefer Tailwind Classes**: Use utility classes over custom CSS when possible
3. **Component Composition**: Combine base classes with variant modifiers
4. **Avoid Inline Styles**: Except for dynamic values like `--outline-color`
5. **Mobile-First**: Write base styles for mobile, add breakpoint overrides for desktop

### Common Patterns

```jsx
// Good: Using design system classes
<div className="glass-card-outline p-6">
    <h3 className="text-xl font-semibold text-primary-contrast tracking-tight">
        Card Title
    </h3>
</div>

// Bad: Custom one-off styles
<div style={{ background: '#1a1a1a', borderRadius: '16px' }}>
    <h3 style={{ color: 'white', fontSize: '20px' }}>
        Card Title
    </h3>
</div>
```

### Things to Avoid

1. **Don't Override Colors**: The global white text rule is intentional
2. **Don't Skip Glass Effects**: Maintain glass morphism consistency
3. **Don't Use Light Backgrounds**: This is a dark-mode only design system
4. **Don't Forget Focus States**: Every interactive element needs visible focus
5. **Don't Nest Glass Cards**: Avoid glass-on-glass for performance

### Performance Considerations

1. **Backdrop Filter Usage**: Use sparingly as it's GPU-intensive
2. **Animation Optimization**: Use `transform` and `opacity` for animations
3. **Will-Change Sparingly**: Only add `will-change` to elements that animate
4. **Image Optimization**: Use WebP format with lazy loading
5. **Font Loading**: Preload Inter Tight font for faster rendering

```css
/* Optimize animations */
.optimized-animation {
    transform: translateZ(0);  /* Promote to GPU layer */
    will-change: transform;    /* Hint to browser */
}

/* Reduce blur complexity on scroll */
.scroll-optimized {
    backdrop-filter: blur(8px);  /* Lower blur on scroll */
}
```

### PDF Export Mode

When exporting to PDF, apply the `.pdf-export-mode` class to replace glass effects with solid colors:

```css
.pdf-export-mode .glass-card-outline {
    background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%) !important;
    border: 1px solid #334155 !important;
    box-shadow: none !important;
}
```

---

## Appendix: Quick Reference

### Color Cheat Sheet

| Use Case | Color | Hex |
|----------|-------|-----|
| Background | Deep Black | #0a0a0a |
| Glass Panel | Semi-transparent | rgba(18, 18, 18, 0.6) |
| Primary Text | Pure White | #FFFFFF |
| Secondary Text | Light Gray | #C6C6C6 |
| Primary Accent | Neon Cyan | #06b6d4 |
| Bright Accent | Light Cyan | #22d3ee |
| Error/Warning | Lava Red | #FF312E |
| Success | Emerald | #34d399 |
| Warning | Yellow | #eab308 |

### Spacing Cheat Sheet

| Size | Tailwind | Pixels |
|------|----------|--------|
| Tight | p-2 / gap-2 | 8px |
| Compact | p-3 / gap-3 | 12px |
| Standard | p-4 / gap-4 | 16px |
| Comfortable | p-6 / gap-6 | 24px |
| Spacious | p-8 / gap-8 | 32px |

### Border Radius Cheat Sheet

| Use Case | Class | Value |
|----------|-------|-------|
| Buttons | rounded-md | 6px |
| Inputs | rounded-lg | 8px |
| Cards | rounded-card | 16px |
| Panels | rounded-panel | 22px |
| Pills | rounded-full | 9999px |

---

*Document generated from BBB Auto Sales DMS codebase analysis*
*Last updated: December 2024*
