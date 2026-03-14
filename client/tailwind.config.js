/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#10b77f",
          50:  "#f0fdf8",
          100: "#dcfdf0",
          200: "#bbf7e0",
          300: "#86efca",
          400: "#4adea8",
          500: "#10b77f",
          600: "#0d9a6a",
          700: "#0b7d56",
          800: "#0a6346",
          900: "#08503a",
        },
        background: {
          light: "#f6f8f7",
          dark:  "#10221c",
        },
        sidebar: {
          dark: "#0F172A",
        },
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
      },
      boxShadow: {
        "primary-sm": "0 2px 8px -2px rgba(16,183,127,0.25)",
        "primary-md": "0 4px 20px -4px rgba(16,183,127,0.35)",
        "primary-lg": "0 8px 32px -8px rgba(16,183,127,0.4)",
        "card":       "0 1px 3px 0 rgba(0,0,0,0.07), 0 1px 2px -1px rgba(0,0,0,0.07)",
        "card-hover": "0 4px 12px 0 rgba(0,0,0,0.10), 0 2px 4px -2px rgba(0,0,0,0.06)",
      },
      animation: {
        "fade-in":        "fadeIn 0.5s ease-out both",
        "fade-in-up":     "fadeInUp 0.5s ease-out both",
        "fade-in-down":   "fadeInDown 0.4s ease-out both",
        "slide-in-right": "slideInRight 0.35s ease-out both",
        "slide-in-left":  "slideInLeft 0.35s ease-out both",
        "scale-in":       "scaleIn 0.3s ease-out both",
        "bounce-in":      "bounceIn 0.5s cubic-bezier(0.34,1.56,0.64,1) both",
        "shimmer":        "shimmer 1.5s infinite",
        "bar-grow":       "barGrow 0.8s ease-out both",
        "ping-slow":      "ping 2s cubic-bezier(0,0,0.2,1) infinite",
      },
      keyframes: {
        fadeIn:      { "0%": { opacity:"0" },  "100%": { opacity:"1" } },
        fadeInUp:    { "0%": { opacity:"0", transform:"translateY(24px)" },  "100%": { opacity:"1", transform:"translateY(0)" } },
        fadeInDown:  { "0%": { opacity:"0", transform:"translateY(-16px)" }, "100%": { opacity:"1", transform:"translateY(0)" } },
        slideInRight:{ "0%": { opacity:"0", transform:"translateX(24px)" },  "100%": { opacity:"1", transform:"translateX(0)" } },
        slideInLeft: { "0%": { opacity:"0", transform:"translateX(-24px)" }, "100%": { opacity:"1", transform:"translateX(0)" } },
        scaleIn:     { "0%": { opacity:"0", transform:"scale(0.93)" },       "100%": { opacity:"1", transform:"scale(1)" } },
        bounceIn:    { "0%": { opacity:"0", transform:"scale(0.7)" },        "100%": { opacity:"1", transform:"scale(1)" } },
        shimmer:     { "0%": { backgroundPosition:"-400px 0" }, "100%": { backgroundPosition:"400px 0" } },
        barGrow:     { "0%": { transform:"scaleY(0)", transformOrigin:"bottom" }, "100%": { transform:"scaleY(1)", transformOrigin:"bottom" } },
      },
    },
  },
  plugins: [],
}

