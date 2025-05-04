import type { Config } from "tailwindcss";
import animatePlugin from "tailwindcss-animate";
import typographyPlugin from "@tailwindcss/typography"; // Import the typography plugin

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx}",
    "./hooks/**/*.{js,ts,jsx,tsx}",
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        chart: {
          "1": "hsl(var(--chart-1))",
          "2": "hsl(var(--chart-2))",
          "3": "hsl(var(--chart-3))",
          "4": "hsl(var(--chart-4))",
          "5": "hsl(var(--chart-5))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      // +++ START: Typography configuration +++
      typography: ({ theme }: { theme: (path: string) => string }) => ({
        // Target the DEFAULT (base) prose styles
        DEFAULT: {
          css: {
            // Target code elements within prose
            "code, pre code": {
              "font-size": "inherit", // Force inherit font size
            },
            // Also reset potential ::before/::after pseudo-elements
            "code::before, code::after": {
              "font-size": "inherit", // Force inherit font size
              // You might not need these, but good to include
              content: "none", // Remove potential quote characters added by themes
            },
            // --- Optional: Adjust pre background/text colors if needed ---
            // pre: {
            //   'background-color': theme('colors.muted/50'),
            //   color: theme('colors.foreground'),
            // },
            // --- Optional: Adjust inline code colors if needed ---
            // ':not(pre) > code': {
            //    'background-color': theme('colors.muted'),
            //    color: theme('colors.foreground'),
            //    // other styles...
            // },
          },
        },
        // You can define overrides for specific prose sizes (sm, lg, xl) here if needed
        // lg: {
        //   css: {
        //     'code, pre code': { 'font-size': 'inherit' },
        //     'code::before, code::after': { 'font-size': 'inherit', content: 'none' },
        //   }
        // },
        // xl: {
        //   css: {
        //     'code, pre code': { 'font-size': 'inherit' },
        //     'code::before, code::after': { 'font-size': 'inherit', content: 'none' },
        //   }
        // }
      }),
      // +++ END: Typography configuration +++
    },
  },
  plugins: [animatePlugin, typographyPlugin],
};
export default config;
