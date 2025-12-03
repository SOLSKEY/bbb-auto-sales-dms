"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

// 1. Helper function to generate the complex shadow string
const createShadow = (r: number, g: number, b: number) => {
    const color = `${r},${g},${b}`
    return `shadow-[0_0_6px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3px_rgba(0,0,0,0.9),inset_-3px_-3px_0.5px_-3px_rgba(0,0,0,0.85),inset_1px_1px_1px_-0.5px_rgba(0,0,0,0.6),inset_-1px_-1px_1px_-0.5px_rgba(0,0,0,0.6),inset_0_0_6px_6px_rgba(0,0,0,0.12),inset_0_0_2px_2px_rgba(0,0,0,0.06),0_0_12px_rgba(${color},0.15)] dark:shadow-[0_0_8px_rgba(0,0,0,0.03),0_2px_6px_rgba(0,0,0,0.08),inset_3px_3px_0.5px_-3.5px_rgba(${color},0.09),inset_-3px_-3px_0.5px_-3.5px_rgba(${color},0.85),inset_1px_1px_1px_-0.5px_rgba(${color},0.6),inset_-1px_-1px_1px_-0.5px_rgba(${color},0.6),inset_0_0_6px_6px_rgba(${color},0.12),inset_0_0_2px_2px_rgba(${color},0.06),0_0_12px_rgba(0,0,0,0.15)]`
}

// 2. Define all the variants
const containerShadows = {
    "cyan-blue": createShadow(6, 182, 212), // Cyan-500
    white: createShadow(255, 255, 255), // Pure White
    "neon-pink": createShadow(236, 72, 153), // Pink-500
    "neon-green": createShadow(34, 197, 94), // Green-500
    "neon-orange": createShadow(249, 115, 22), // Orange-500
    "neon-red": createShadow(239, 68, 68), // Red-500
    "neon-purple": createShadow(168, 85, 247), // Purple-500
    yellow: createShadow(234, 179, 8), // Yellow-500
}

type LiquidColorVariant = keyof typeof containerShadows

interface LiquidContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: LiquidColorVariant
    disableBackdropFilter?: boolean
}

export function LiquidContainer({
    children,
    className,
    variant = "cyan-blue", // Default
    disableBackdropFilter = false,
    ...props
}: LiquidContainerProps) {
    return (
        <div
            className={cn("relative", disableBackdropFilter ? "" : "isolate", className)}
            {...props}
        >
            {/* 1. The Liquid/Shadow Layer */}
            <div
                className={cn(
                    "absolute inset-0 -z-10 rounded-2xl transition-all duration-500 pointer-events-none",
                    containerShadows[variant]
                )}
            />

            {/* 2. The Glass Distortion Layer */}
            {!disableBackdropFilter && (
                <div
                    className="absolute inset-0 -z-20 overflow-hidden rounded-2xl pointer-events-none"
                    style={{ backdropFilter: 'url("#container-glass")' }}
                />
            )}

            {/* 3. The Content Area */}
            <div className="relative z-10 h-full w-full" style={{ overflow: 'visible' }}>
                {children}
            </div>

            {/* 4. The Filter Definition (Hidden, required for effect) */}
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
