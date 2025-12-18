"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// 1. Helper function to generate the complex shadow string
const containerVariants = {
    "cyan-blue": { r: 6, g: 182, b: 212 }, // Cyan-500
    white: { r: 255, g: 255, b: 255 }, // Pure White
    "neon-pink": { r: 236, g: 72, b: 153 }, // Pink-500
    "neon-green": { r: 34, g: 197, b: 94 }, // Green-500
    "neon-orange": { r: 249, g: 115, b: 22 }, // Orange-500
    "neon-red": { r: 239, g: 68, b: 68 }, // Red-500
    "neon-purple": { r: 168, g: 85, b: 247 }, // Purple-500
    yellow: { r: 234, g: 179, b: 8 }, // Yellow-500
}

type LiquidColorVariant = keyof typeof containerVariants

interface LiquidContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: LiquidColorVariant
    disableBackdropFilter?: boolean
}

export function LiquidContainer({
    children,
    className,
    variant = "cyan-blue", // Default
    disableBackdropFilter = false,
    style,
    ...props
}: LiquidContainerProps) {
    const colors = containerVariants[variant] || containerVariants["cyan-blue"];
    const colorStr = `${colors.r}, ${colors.g}, ${colors.b}`;

    // Generate the shadow string manually to ensure it matches the "CDN" look exactly
    // but without the outer glow in dark mode as requested.
    const shadowStyle = {
        boxShadow: `
            0 0 6px rgba(0,0,0,0.03),
            0 2px 6px rgba(0,0,0,0.08),
            inset 3px 3px 0.5px -3.5px rgba(${colorStr}, 0.15),
            inset -3px -3px 0.5px -3.5px rgba(${colorStr}, 0.85),
            inset 1px 1px 1px -0.5px rgba(${colorStr}, 0.6),
            inset -1px -1px 1px -0.5px rgba(${colorStr}, 0.6),
            inset 0 0 6px 6px rgba(${colorStr}, 0.12),
            inset 0 0 2px 2px rgba(${colorStr}, 0.06),
            0 0 12px rgba(0,0,0,0.15)
        `.replace(/\s+/g, ' ').trim(),
        border: `1px solid rgba(${colorStr}, 0.4)`, // Colored outline
        backgroundColor: 'rgba(0, 0, 0, 0.2)', // Glass transparency
        ...style
    };

    return (
        <div
            className={cn("relative rounded-2xl transition-all duration-500", disableBackdropFilter ? "" : "isolate", className)}
            style={shadowStyle}
            {...props}
        >
            {/* 1. The Glass Distortion Layer */}
            {!disableBackdropFilter && (
                <div
                    className="absolute inset-0 -z-20 overflow-hidden rounded-2xl pointer-events-none"
                    style={{ 
                        backdropFilter: 'blur(10px) url("#container-glass")',
                        WebkitBackdropFilter: 'blur(10px) url("#container-glass")'
                    }}
                />
            )}

            {/* 2. The Content Area */}
            <div className="relative z-10 h-full w-full" style={{ overflow: 'visible' }}>
                {children}
            </div>

            {/* 3. The Filter Definition (Hidden, required for effect) */}
            {!disableBackdropFilter && <GlassFilter />}
        </div>
    )
}

function GlassFilter() {
    return (
        <svg className="absolute w-0 h-0" aria-hidden="true">
            <filter
                id="container-glass"
                x="0%"
                y="0%"
                width="100%"
                height="100%"
                colorInterpolationFilters="sRGB"
            >
                <feTurbulence
                    baseFrequency="0.02"
                    numOctaves="3"
                    result="noise"
                />
                <feDisplacementMap
                    in="SourceGraphic"
                    in2="noise"
                    scale="2"
                />
            </filter>
        </svg>
    )
}
