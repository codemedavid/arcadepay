import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./client/index.html", "./client/src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        sidebar: {
          DEFAULT: "var(--sidebar)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
        neon: {
          cyan: "var(--neon-cyan)",
          pink: "var(--neon-pink)",
          green: "var(--neon-green)",
          purple: "var(--neon-purple)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        serif: ["var(--font-serif)"],
        mono: ["var(--font-mono)"],
        arcade: ["var(--font-arcade)"],
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "neon-pulse": "neon-pulse 2s ease-in-out infinite",
        "coin-spin": "coin-spin 1s ease-in-out",
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "neon-pulse": {
          "0%, 100%": { 
            textShadow: "0 0 5px currentColor, 0 0 10px currentColor, 0 0 15px currentColor" 
          },
          "50%": { 
            textShadow: "0 0 10px currentColor, 0 0 20px currentColor, 0 0 30px currentColor" 
          },
        },
        "coin-spin": {
          from: { transform: "rotateY(0deg)" },
          to: { transform: "rotateY(360deg)" },
        },
      },
      backdropFilter: {
        'none': 'none',
        'blur': 'blur(20px)',
      },
      boxShadow: {
        'neon-cyan': '0 0 15px hsl(var(--neon-cyan) / 0.5)',
        'neon-pink': '0 0 15px hsl(var(--neon-pink) / 0.5)',
        'neon-green': '0 0 15px hsl(var(--neon-green) / 0.5)',
        'neon-purple': '0 0 15px hsl(var(--neon-purple) / 0.5)',
      },
    },
  },
  plugins: [
    require("tailwindcss-animate"), 
    require("@tailwindcss/typography"),
    function({ addUtilities }: any) {
      const newUtilities = {
        '.text-shadow-neon-cyan': {
          textShadow: '0 0 10px hsl(var(--neon-cyan)), 0 0 20px hsl(var(--neon-cyan))',
        },
        '.text-shadow-neon-pink': {
          textShadow: '0 0 10px hsl(var(--neon-pink)), 0 0 20px hsl(var(--neon-pink))',
        },
        '.text-shadow-neon-green': {
          textShadow: '0 0 10px hsl(var(--neon-green)), 0 0 20px hsl(var(--neon-green))',
        },
        '.text-shadow-neon-purple': {
          textShadow: '0 0 10px hsl(var(--neon-purple)), 0 0 20px hsl(var(--neon-purple))',
        },
      }
      addUtilities(newUtilities)
    }
  ],
} satisfies Config;
