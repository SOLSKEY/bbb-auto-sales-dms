---
name: liquid-glass-design
description: >
  Premium dark-mode UI design system with liquid glass morphism effects. Apply this skill when
  creating UI components, web applications, dashboards, or any interface that needs the signature
  liquid container aesthetic with layered inset shadows and colored glass effects. Use for building
  React or HTML components with glass morphism, styling Radix UI or similar component libraries,
  creating dark-mode dashboards and admin panels, generating CSS for premium glass-effect surfaces,
  or any request mentioning liquid, glass morphism, neon, or premium dark UI.
---

# Liquid Glass Design System

A premium dark-mode design system featuring signature "liquid container" glass morphism effects with layered inset shadows and colored neon accents.

## Core Design Principle

**Apply liquid glass to surfaces/containers, NOT to content:**

| ✓ Apply To | ✗ Do NOT Apply To |
|------------|-------------------|
| Buttons, Cards, Badges | Standalone text |
| Inputs, Selects, Dropdowns | Icons without containers |
| Checkboxes, Radios, Switches | Raw data values |
| Tabs, Callouts, Dialogs | Separators, dividers |
| Tables, Menus, Tooltips | Content inside containers |

### ⚠️ CRITICAL: Hover Glow Effects

**ONLY apply hover glow effects to INTERACTIVE BUTTONS. NEVER to containers, cards, or surfaces.**

✅ **Apply Hover Glow To:**
- Buttons (`.liquid-btn`, action buttons)
- Interactive controls (tabs when clickable, menu items)

❌ **NEVER Apply Hover Glow To:**
- Container elements (`.liquid-surface`, `.liquid-card`)
- Stat cards, info panels, display containers
- Non-interactive surfaces
- Cards that display information only

**Why:** Hover glow creates visual noise on containers. It should ONLY indicate clickable/interactive elements. Containers should have subtle hover effects like border color changes, never glowing animations.

## Quick Start

### 1. Add CSS Variables

```css
:root {
    /* Liquid color (RGB for shadow mixing) */
    --liquid-r: 6;
    --liquid-g: 182;
    --liquid-b: 212;
    
    /* Background */
    --bg-base: #050505;
    --text-primary: #ffffff;
    --text-secondary: #b0b4ba;
}
```

### 2. Apply Liquid Surface Class

```css
.liquid-surface {
    position: relative;
    border-radius: 16px;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    background-color: rgba(0, 0, 0, 0.2);
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
```

### 3. Container Hover (Subtle, No Glow)

```css
/* Containers should ONLY have subtle hover effects */
.liquid-surface:hover,
.liquid-card:hover {
    border-color: rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.5);
    /* NO glowing box-shadows! Just border highlight */
}
```

### 4. Button Hover (With Glow - Interactive Elements ONLY)

```css
/* ONLY buttons get the glow effect */
.liquid-btn:hover {
    border-color: rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.7);
    box-shadow:
        0 0 6px rgba(0,0,0,0.03),
        0 2px 6px rgba(0,0,0,0.08),
        inset 0 0 30px 8px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.5),
        inset 0 0 60px 4px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.3),
        0 0 20px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.4);
}
```

## Color Variants

Switch colors by updating the RGB variables:

| Color | R | G | B | Use Case |
|-------|---|---|---|----------|
| Cyan | 6 | 182 | 212 | Default, primary actions |
| White | 255 | 255 | 255 | Neutral, secondary |
| Green | 34 | 197 | 94 | Success states |
| Red | 239 | 68 | 68 | Error, destructive |
| Purple | 168 | 85 | 247 | Premium, special |
| Yellow | 234 | 179 | 8 | Warning, highlight |
| Orange | 249 | 115 | 22 | Attention |
| Pink | 236 | 72 | 153 | Featured content |

```css
.liquid-cyan { --liquid-r: 6; --liquid-g: 182; --liquid-b: 212; }
.liquid-green { --liquid-r: 34; --liquid-g: 197; --liquid-b: 94; }
.liquid-red { --liquid-r: 239; --liquid-g: 68; --liquid-b: 68; }
/* ... etc */
```

## Component Reference

See `references/components.md` for complete CSS for all components:
- `.liquid-btn` - Pill-shaped buttons
- `.liquid-badge` - Status indicators
- `.liquid-card` - Content containers
- `.liquid-input` - Text field wrappers
- `.liquid-select` - Dropdown triggers
- `.liquid-checkbox` - Toggle controls
- `.liquid-radio` - Radio buttons
- `.liquid-switch` - Toggle switches
- `.liquid-tabs-list` - Tab navigation
- `.liquid-callout` - Alerts/notifications
- `.liquid-progress` - Progress bars
- `.liquid-slider` - Range inputs
- `.liquid-avatar` - User avatars
- `.liquid-table-wrapper` - Data tables

## Radix UI Integration

When working with Radix UI Themes, map components as follows:

| Radix Component | Liquid Class |
|-----------------|--------------|
| `Button` | `.liquid-btn` |
| `Badge` | `.liquid-badge` |
| `Card` | `.liquid-card` |
| `TextField.Root` | `.liquid-input` |
| `Select.Trigger` | `.liquid-select` |
| `Checkbox` | `.liquid-checkbox` |
| `RadioGroup.Item` | `.liquid-radio` |
| `Switch` | `.liquid-switch` |
| `Tabs.List` | `.liquid-tabs-list` |
| `Dialog.Content` | `.liquid-card` |
| `DropdownMenu.Content` | `.liquid-card` |

## Animated Background (Optional)

For premium effect, add floating orb background:

```css
.animated-bg {
    background-color: #050505;
    position: fixed;
    inset: 0;
    z-index: -1;
}

.animated-bg::before {
    content: '';
    position: absolute;
    top: 10%; left: 10%;
    width: 600px; height: 600px;
    background: radial-gradient(circle, rgba(6, 182, 212, 0.25) 0%, transparent 70%);
    animation: moveOrb1 25s ease-in-out infinite;
    border-radius: 50%;
    filter: blur(60px);
}

@keyframes moveOrb1 {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(300px, 200px); }
}
```

## Size Scale

| Size | Height | Padding | Font Size |
|------|--------|---------|-----------|
| 1 | 24-28px | 8-10px | 12px |
| 2 | 32-36px | 12-14px | 13-14px |
| 3 | 40-44px | 16-18px | 14-16px |
| 4 | 48px | 20-24px | 16px |

## Resources

- `references/components.md` - Complete CSS for all liquid components
- `references/tokens.md` - Full design token reference
- `assets/styleguide.html` - Interactive HTML style guide demo
