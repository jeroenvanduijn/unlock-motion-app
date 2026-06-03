/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Unlock palette — diepe teal voor stabiliteit/herstel + warme amber voor energie.
        // Wisselbaar zodra Yari brand-keuzes definitief maakt.
        teal: {
          DEFAULT: "#2D5F5D",
          tint: "#D7E6E5",
          ink: "#1F4543",
        },
        amber: {
          DEFAULT: "#E8A24F",
          tint: "#FBEAD3",
        },
        sage: {
          DEFAULT: "#7AA078",
          tint: "#DCE7DA",
        },
        bg: "#FAF8F4",
        ink: {
          DEFAULT: "#1F2A2A",
          50: "#F2EFE9",
          100: "#E4DED4",
          300: "#A9A399",
          500: "#5F5A52",
          700: "#2C2A27",
          900: "#15201F",
        },
      },
      fontFamily: {
        display: ['"Heading Now"', "Archivo", "system-ui", "sans-serif"],
        sans: ['"Suisse Intl"', "-apple-system", "BlinkMacSystemFont", "system-ui", "sans-serif"],
      },
      boxShadow: {
        sm: "0 1px 2px 0 rgba(31, 42, 42, .06), 0 1px 1px 0 rgba(31, 42, 42, .04)",
        card: "0 4px 10px -2px rgba(31, 42, 42, .08), 0 2px 4px -1px rgba(31, 42, 42, .05)",
        lg: "0 12px 28px -6px rgba(31, 42, 42, .14), 0 4px 10px -2px rgba(31, 42, 42, .06)",
        cta: "0 6px 16px -4px rgba(45, 95, 93, .40)",
      },
      transitionTimingFunction: {
        out: "cubic-bezier(0.16, 1, 0.3, 1)",
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};
