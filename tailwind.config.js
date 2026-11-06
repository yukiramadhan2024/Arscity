/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "'Plus Jakarta Sans'", "sans-serif"],
        mono: ["var(--font-mono)", "'JetBrains Mono'", "monospace"],
        serif: ["var(--font-sans)", "'Plus Jakarta Sans'", "sans-serif"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: "var(--card)",
        border: "var(--border)",
        muted: "var(--muted)",
        "seal-blue": "var(--seal-blue)",
        "navy-blue": "var(--navy-blue)",
        "crimson-pink": "var(--crimson-pink)",
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        "muted-foreground": "var(--muted-foreground)",
        destructive: "var(--destructive)",
      },
    },
  },
  plugins: [],
};
