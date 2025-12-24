/** @type {import('tailwindcss').Config} */
import animate from "tailwindcss-animate";

export default {
    darkMode: ["class"],
    content: [
        "./pages/**/*.{ts,tsx}",
        "./components/**/*.{ts,tsx}",
        "./app/**/*.{ts,tsx}",
        "./src/**/*.{ts,tsx}",
        "*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        container: {
            center: true,
            padding: "2rem",
            screens: {
                "2xl": "1400px",
            },
        },
        extend: {
            colors: {
                // Legacy compatibility
                'gunmetal-dark': '#0a0a0a',
                'gunmetal': 'rgba(18, 18, 18, 0.6)',
                'gunmetal-light': 'rgba(255, 255, 255, 0.08)',
                'accent-red': '#FF312E',
                'accent-orange': '#FF5A1F',
                // New premium palette
                'bg-base': '#0a0a0a',
                'glass-panel': 'rgba(18, 18, 18, 0.6)',
                'glass-input': 'rgba(30, 30, 35, 0.8)',
                'text-primary': '#FFFFFF',
                'text-secondary': '#C6C6C6',
                'text-muted': '#FFFFFF',
                'placeholder': '#B8B8B8',
                'lava-core': '#FF312E',
                'lava-warm': '#FF5A1F',
                'lava-cool': '#C82025',
                'border-low': 'rgba(255, 255, 255, 0.08)',
                'border-high': 'rgba(255, 255, 255, 0.12)',
                border: "hsl(var(--border))",
                input: "hsl(var(--input))",
                ring: "hsl(var(--ring))",
                background: "hsl(var(--background))",
                foreground: "hsl(var(--foreground))",
                primary: {
                    DEFAULT: "hsl(var(--primary))",
                    foreground: "hsl(var(--primary-foreground))",
                },
                secondary: {
                    DEFAULT: "hsl(var(--secondary))",
                    foreground: "hsl(var(--secondary-foreground))",
                },
                destructive: {
                    DEFAULT: "hsl(var(--destructive))",
                    foreground: "hsl(var(--destructive-foreground))",
                },
                muted: {
                    DEFAULT: "hsl(var(--muted))",
                    foreground: "hsl(var(--muted-foreground))",
                },
                accent: {
                    DEFAULT: "hsl(var(--accent))",
                    foreground: "hsl(var(--accent-foreground))",
                },
                popover: {
                    DEFAULT: "hsl(var(--popover))",
                    foreground: "hsl(var(--popover-foreground))",
                },
                card: {
                    DEFAULT: "hsl(var(--card))",
                    foreground: "hsl(var(--card-foreground))",
                },
            },
            fontFamily: {
                sans: ['Inter Tight', '-apple-system', 'sans-serif'],
                orbitron: ['Inter Tight', 'sans-serif'],
            },
            letterSpacing: {
                'tight-lg': '-0.02em',
                'tight-md': '-0.005em',
            },
            borderRadius: {
                lg: "var(--radius)",
                md: "calc(var(--radius) - 2px)",
                sm: "calc(var(--radius) - 4px)",
                'card': '16px',
                'panel': '22px',
            },
            boxShadow: {
                'glass': '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                'lava': '0 4px 16px rgba(255, 49, 46, 0.3)',
            },
            backdropBlur: {
                'glass': '40px',
            },
            keyframes: {
                "accordion-down": {
                    from: { height: 0 },
                    to: { height: "var(--radix-accordion-content-height)" },
                },
                "accordion-up": {
                    from: { height: "var(--radix-accordion-content-height)" },
                    to: { height: 0 },
                },
                "spin-slow": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(360deg)" },
                },
                "spin-slower": {
                    "0%": { transform: "rotate(0deg)" },
                    "100%": { transform: "rotate(-360deg)" },
                },
                "fade-in": {
                    "0%": { opacity: 0, transform: "translateY(-8px)" },
                    "100%": { opacity: 1, transform: "translateY(0)" },
                },
            },
            animation: {
                "accordion-down": "accordion-down 0.2s ease-out",
                "accordion-up": "accordion-up 0.2s ease-out",
                "spin-slow": "spin-slow 3s linear infinite",
                "spin-slower": "spin-slower 6s linear infinite",
                "fade-in": "fade-in 0.2s ease-out",
            },
        },
    },
    plugins: [animate],
}
