# Liquid Glass Components - Complete CSS Reference

## Base Surface

```css
.liquid-surface {
    position: relative;
    border-radius: 16px;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    background-color: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.4);
    box-shadow:
        0 0 6px rgba(0, 0, 0, 0.03),
        0 2px 6px rgba(0, 0, 0, 0.08),
        inset 3px 3px 0.5px -3.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.15),
        inset -3px -3px 0.5px -3.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.85),
        inset 1px 1px 1px -0.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.6),
        inset -1px -1px 1px -0.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.6),
        inset 0 0 6px 6px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.12),
        inset 0 0 2px 2px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.06),
        0 0 12px rgba(0, 0, 0, 0.15);
}

.liquid-surface:hover {
    border-color: rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.6);
    box-shadow:
        0 0 6px rgba(0, 0, 0, 0.03),
        0 2px 6px rgba(0, 0, 0, 0.08),
        inset 0 0 30px 8px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.3),
        inset 0 0 60px 4px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.15),
        0 0 20px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.25);
}
```

## Button (.liquid-btn)

```css
.liquid-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    border-radius: 9999px;
    font-family: inherit;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    background-color: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.4);
    color: #ffffff;
    box-shadow:
        0 0 6px rgba(0, 0, 0, 0.03),
        0 2px 6px rgba(0, 0, 0, 0.08),
        inset 3px 3px 0.5px -3.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.15),
        inset -3px -3px 0.5px -3.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.85),
        inset 1px 1px 1px -0.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.6),
        inset -1px -1px 1px -0.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.6),
        inset 0 0 6px 6px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.12),
        inset 0 0 2px 2px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.06),
        0 0 12px rgba(0, 0, 0, 0.15);
}

.liquid-btn:hover {
    border-color: rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.7);
    box-shadow:
        0 0 6px rgba(0, 0, 0, 0.03),
        0 2px 6px rgba(0, 0, 0, 0.08),
        inset 0 0 30px 8px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.5),
        inset 0 0 60px 4px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.3),
        0 0 20px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.4);
}

.liquid-btn:active { transform: scale(0.98); }
.liquid-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Sizes */
.liquid-btn.size-1 { height: 24px; padding: 0 10px; font-size: 12px; }
.liquid-btn.size-2 { height: 32px; padding: 0 14px; font-size: 13px; }
.liquid-btn.size-3 { height: 40px; padding: 0 18px; font-size: 14px; }
.liquid-btn.size-4 { height: 48px; padding: 0 24px; font-size: 16px; }
```

## Badge (.liquid-badge)

```css
.liquid-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    font-weight: 500;
    transition: all 0.3s ease;
    background-color: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.5);
    color: #ffffff;
    box-shadow:
        0 0 4px rgba(0, 0, 0, 0.03),
        0 1px 4px rgba(0, 0, 0, 0.08),
        inset 2px 2px 0.5px -2.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.2),
        inset -2px -2px 0.5px -2.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.8),
        inset 0 0 4px 4px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.15),
        0 0 8px rgba(0, 0, 0, 0.1);
}

/* Sizes */
.liquid-badge.size-1 { height: 20px; padding: 0 6px; font-size: 11px; }
.liquid-badge.size-2 { height: 24px; padding: 0 8px; font-size: 12px; }
.liquid-badge.size-3 { height: 28px; padding: 0 10px; font-size: 13px; }
```

## Card (.liquid-card)

```css
.liquid-card {
    position: relative;
    border-radius: 16px;
    padding: 24px;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    background-color: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.4);
    box-shadow:
        0 0 6px rgba(0, 0, 0, 0.03),
        0 2px 6px rgba(0, 0, 0, 0.08),
        inset 3px 3px 0.5px -3.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.15),
        inset -3px -3px 0.5px -3.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.85),
        inset 1px 1px 1px -0.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.6),
        inset -1px -1px 1px -0.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.6),
        inset 0 0 6px 6px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.12),
        inset 0 0 2px 2px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.06),
        0 0 12px rgba(0, 0, 0, 0.15);
}

.liquid-card:hover {
    border-color: rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.6);
    box-shadow:
        0 0 6px rgba(0, 0, 0, 0.03),
        0 2px 6px rgba(0, 0, 0, 0.08),
        inset 0 0 30px 8px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.2),
        inset 0 0 60px 4px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.1),
        0 0 20px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.15);
}
```

## Input (.liquid-input)

```css
.liquid-input {
    position: relative;
    display: flex;
    align-items: center;
    border-radius: 8px;
    transition: all 0.3s ease;
    background-color: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.3);
    color: #ffffff;
    font-family: inherit;
    box-shadow:
        0 0 4px rgba(0, 0, 0, 0.03),
        0 1px 4px rgba(0, 0, 0, 0.06),
        inset 2px 2px 0.5px -2.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.1),
        inset -2px -2px 0.5px -2.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.6),
        inset 0 0 4px 4px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.08),
        0 0 8px rgba(0, 0, 0, 0.1);
}

.liquid-input:focus-within {
    border-color: rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.6);
    box-shadow:
        0 0 4px rgba(0, 0, 0, 0.03),
        0 1px 4px rgba(0, 0, 0, 0.06),
        inset 0 0 20px 4px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.2),
        0 0 12px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.2);
}

.liquid-input input {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    color: inherit;
    font-family: inherit;
}

.liquid-input input::placeholder { color: #696e77; }

/* Sizes */
.liquid-input.size-1 { height: 28px; padding: 0 8px; font-size: 12px; }
.liquid-input.size-2 { height: 36px; padding: 0 12px; font-size: 14px; }
.liquid-input.size-3 { height: 44px; padding: 0 16px; font-size: 16px; }
```

## Select (.liquid-select)

```css
.liquid-select {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    background-color: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.3);
    color: #ffffff;
    box-shadow:
        0 0 4px rgba(0, 0, 0, 0.03),
        0 1px 4px rgba(0, 0, 0, 0.06),
        inset 2px 2px 0.5px -2.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.1),
        inset -2px -2px 0.5px -2.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.6),
        inset 0 0 4px 4px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.08),
        0 0 8px rgba(0, 0, 0, 0.1);
}

.liquid-select:hover {
    border-color: rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.5);
    box-shadow:
        0 0 4px rgba(0, 0, 0, 0.03),
        0 1px 4px rgba(0, 0, 0, 0.06),
        inset 0 0 15px 4px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.15),
        0 0 10px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.15);
}

/* Sizes */
.liquid-select.size-1 { height: 28px; padding: 0 10px; font-size: 12px; }
.liquid-select.size-2 { height: 36px; padding: 0 14px; font-size: 14px; }
.liquid-select.size-3 { height: 44px; padding: 0 18px; font-size: 16px; }
```

## Checkbox (.liquid-checkbox)

```css
.liquid-checkbox {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.3s ease;
    background-color: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.3);
    box-shadow:
        0 0 4px rgba(0, 0, 0, 0.03),
        0 1px 4px rgba(0, 0, 0, 0.06),
        inset 1px 1px 0.5px -1.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.15),
        inset -1px -1px 0.5px -1.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.7),
        inset 0 0 3px 3px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.1);
}

.liquid-checkbox:hover {
    border-color: rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.5);
}

.liquid-checkbox.checked {
    background-color: rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.3);
    border-color: rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.6);
    box-shadow:
        0 0 4px rgba(0, 0, 0, 0.03),
        0 1px 4px rgba(0, 0, 0, 0.06),
        inset 0 0 10px 3px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.4),
        0 0 8px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.2);
}

/* Sizes */
.liquid-checkbox.size-1 { width: 16px; height: 16px; }
.liquid-checkbox.size-2 { width: 20px; height: 20px; }
.liquid-checkbox.size-3 { width: 24px; height: 24px; }
```

## Radio (.liquid-radio)

```css
.liquid-radio {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    cursor: pointer;
    transition: all 0.3s ease;
    background-color: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.3);
    box-shadow:
        0 0 4px rgba(0, 0, 0, 0.03),
        0 1px 4px rgba(0, 0, 0, 0.06),
        inset 1px 1px 0.5px -1.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.15),
        inset -1px -1px 0.5px -1.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.7),
        inset 0 0 3px 3px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.1);
}

.liquid-radio.checked {
    background-color: rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.3);
    border-color: rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.6);
    box-shadow:
        0 0 4px rgba(0, 0, 0, 0.03),
        0 1px 4px rgba(0, 0, 0, 0.06),
        inset 0 0 10px 3px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.4),
        0 0 8px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.2);
}

.liquid-radio .radio-dot {
    width: 50%;
    height: 50%;
    border-radius: 50%;
    background: rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.9);
    opacity: 0;
    transform: scale(0);
    transition: all 0.2s ease;
}

.liquid-radio.checked .radio-dot {
    opacity: 1;
    transform: scale(1);
}

/* Sizes */
.liquid-radio.size-1 { width: 16px; height: 16px; }
.liquid-radio.size-2 { width: 20px; height: 20px; }
.liquid-radio.size-3 { width: 24px; height: 24px; }
```

## Switch (.liquid-switch)

```css
.liquid-switch {
    position: relative;
    display: inline-flex;
    align-items: center;
    border-radius: 9999px;
    cursor: pointer;
    transition: all 0.3s ease;
    background-color: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.3);
    box-shadow:
        0 0 4px rgba(0, 0, 0, 0.03),
        0 1px 4px rgba(0, 0, 0, 0.08),
        inset 2px 2px 0.5px -2.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.1),
        inset -2px -2px 0.5px -2.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.5),
        inset 0 0 4px 4px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.08);
}

.liquid-switch.checked {
    background-color: rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.4);
    border-color: rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.6);
    box-shadow:
        0 0 4px rgba(0, 0, 0, 0.03),
        0 1px 4px rgba(0, 0, 0, 0.08),
        inset 0 0 15px 4px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.35),
        0 0 10px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.2);
}

.liquid-switch .thumb {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.9);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Sizes */
.liquid-switch.size-1 { width: 32px; height: 18px; }
.liquid-switch.size-1 .thumb { width: 14px; height: 14px; left: 2px; top: 1px; }
.liquid-switch.size-1.checked .thumb { left: 16px; }

.liquid-switch.size-2 { width: 42px; height: 24px; }
.liquid-switch.size-2 .thumb { width: 20px; height: 20px; left: 2px; top: 1px; }
.liquid-switch.size-2.checked .thumb { left: 20px; }

.liquid-switch.size-3 { width: 52px; height: 30px; }
.liquid-switch.size-3 .thumb { width: 26px; height: 26px; left: 2px; top: 1px; }
.liquid-switch.size-3.checked .thumb { left: 24px; }
```

## Tabs (.liquid-tabs-list)

```css
.liquid-tabs-list {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px;
    border-radius: 12px;
    background-color: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.25);
    box-shadow:
        0 0 4px rgba(0, 0, 0, 0.03),
        0 1px 4px rgba(0, 0, 0, 0.06),
        inset 2px 2px 0.5px -2.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.1),
        inset -2px -2px 0.5px -2.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.5),
        inset 0 0 4px 4px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.06);
}

.liquid-tab {
    padding: 8px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #b0b4ba;
    background: transparent;
    border: none;
    cursor: pointer;
    transition: all 0.3s ease;
}

.liquid-tab:hover {
    color: #ffffff;
    background: rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.1);
}

.liquid-tab.active {
    color: #ffffff;
    background-color: rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.25);
    box-shadow:
        inset 0 0 10px 2px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.2),
        0 0 6px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.15);
}
```

## Callout (.liquid-callout)

```css
.liquid-callout {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 16px;
    border-radius: 12px;
    transition: all 0.3s ease;
    background-color: rgba(0, 0, 0, 0.25);
    border: 1px solid rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.4);
    box-shadow:
        0 0 6px rgba(0, 0, 0, 0.03),
        0 2px 6px rgba(0, 0, 0, 0.08),
        inset 3px 3px 0.5px -3.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.15),
        inset -3px -3px 0.5px -3.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.7),
        inset 1px 1px 1px -0.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.5),
        inset -1px -1px 1px -0.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.5),
        inset 0 0 6px 6px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.1),
        0 0 12px rgba(0, 0, 0, 0.15);
}

.liquid-callout .callout-icon {
    flex-shrink: 0;
    color: rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 1);
}
```

## Progress (.liquid-progress)

```css
.liquid-progress {
    width: 100%;
    border-radius: 9999px;
    overflow: hidden;
    background-color: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.2);
    box-shadow:
        inset 1px 1px 0.5px -1.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.1),
        inset -1px -1px 0.5px -1.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.4),
        inset 0 0 3px 3px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.05);
}

.liquid-progress .bar {
    height: 100%;
    border-radius: 9999px;
    background: linear-gradient(
        90deg,
        rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.6),
        rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.8)
    );
    box-shadow:
        inset 0 0 10px rgba(255, 255, 255, 0.2),
        0 0 8px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.4);
    transition: width 0.5s ease;
}

/* Sizes */
.liquid-progress.size-1 { height: 6px; }
.liquid-progress.size-2 { height: 10px; }
.liquid-progress.size-3 { height: 14px; }
```

## Table (.liquid-table-wrapper)

```css
.liquid-table-wrapper {
    border-radius: 12px;
    overflow: hidden;
    background-color: rgba(0, 0, 0, 0.2);
    border: 1px solid rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.3);
    box-shadow:
        0 0 6px rgba(0, 0, 0, 0.03),
        0 2px 6px rgba(0, 0, 0, 0.08),
        inset 3px 3px 0.5px -3.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.1),
        inset -3px -3px 0.5px -3.5px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.6),
        inset 0 0 6px 6px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.08),
        0 0 12px rgba(0, 0, 0, 0.15);
}

.liquid-table {
    width: 100%;
    border-collapse: collapse;
}

.liquid-table th {
    text-align: left;
    padding: 12px 16px;
    font-weight: 600;
    font-size: 13px;
    color: #b0b4ba;
    background: rgba(0, 0, 0, 0.2);
    border-bottom: 1px solid rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.2);
}

.liquid-table td {
    padding: 12px 16px;
    font-size: 14px;
    border-bottom: 1px solid rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.1);
}

.liquid-table tr:hover td {
    background: rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.05);
}

.liquid-table tr:last-child td {
    border-bottom: none;
}
```

## Avatar (.liquid-avatar)

```css
.liquid-avatar {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    overflow: hidden;
    background-color: rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.2);
    border: 2px solid rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.4);
    font-weight: 600;
    color: #ffffff;
    box-shadow:
        0 0 4px rgba(0, 0, 0, 0.03),
        0 2px 4px rgba(0, 0, 0, 0.08),
        inset 0 0 6px 3px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.15),
        0 0 8px rgba(var(--liquid-r), var(--liquid-g), var(--liquid-b), 0.1);
}

/* Sizes */
.liquid-avatar.size-1 { width: 24px; height: 24px; font-size: 10px; }
.liquid-avatar.size-2 { width: 32px; height: 32px; font-size: 12px; }
.liquid-avatar.size-3 { width: 40px; height: 40px; font-size: 14px; }
.liquid-avatar.size-4 { width: 48px; height: 48px; font-size: 16px; }
.liquid-avatar.size-5 { width: 64px; height: 64px; font-size: 20px; }
.liquid-avatar.size-6 { width: 80px; height: 80px; font-size: 24px; }
```

## Color Variant Classes

```css
/* Apply to any liquid component */
.liquid-cyan { --liquid-r: 6; --liquid-g: 182; --liquid-b: 212; }
.liquid-white { --liquid-r: 255; --liquid-g: 255; --liquid-b: 255; }
.liquid-green { --liquid-r: 34; --liquid-g: 197; --liquid-b: 94; }
.liquid-red { --liquid-r: 239; --liquid-g: 68; --liquid-b: 68; }
.liquid-purple { --liquid-r: 168; --liquid-g: 85; --liquid-b: 247; }
.liquid-yellow { --liquid-r: 234; --liquid-g: 179; --liquid-b: 8; }
.liquid-orange { --liquid-r: 249; --liquid-g: 115; --liquid-b: 22; }
.liquid-pink { --liquid-r: 236; --liquid-g: 72; --liquid-b: 153; }
.liquid-indigo { --liquid-r: 99; --liquid-g: 102; --liquid-b: 241; }
.liquid-blue { --liquid-r: 59; --liquid-g: 130; --liquid-b: 246; }

/* Data attribute alternative */
[data-liquid-color="cyan"] { --liquid-r: 6; --liquid-g: 182; --liquid-b: 212; }
[data-liquid-color="white"] { --liquid-r: 255; --liquid-g: 255; --liquid-b: 255; }
[data-liquid-color="green"] { --liquid-r: 34; --liquid-g: 197; --liquid-b: 94; }
[data-liquid-color="red"] { --liquid-r: 239; --liquid-g: 68; --liquid-b: 68; }
[data-liquid-color="purple"] { --liquid-r: 168; --liquid-g: 85; --liquid-b: 247; }
[data-liquid-color="yellow"] { --liquid-r: 234; --liquid-g: 179; --liquid-b: 8; }
[data-liquid-color="orange"] { --liquid-r: 249; --liquid-g: 115; --liquid-b: 22; }
[data-liquid-color="pink"] { --liquid-r: 236; --liquid-g: 72; --liquid-b: 153; }
```
