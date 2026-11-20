import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        chai: {
          50: "#fdf8f4",
          100: "#f9ede4",
          200: "#f2dbca",
          300: "#e6c1a5",
          400: "#d7a17a",
          500: "#ca8456",
          600: "#bc6e43",
          700: "#9d5434",
          800: "#7e442d",
          900: "#673a27",
          950: "#371c13",
        },
        saffron: {
          50: "#fff9eb",
          100: "#ffefc6",
          200: "#ffdd88",
          300: "#ffc449",
          400: "#fba918",
          500: "#f18805",
          600: "#d76502",
          700: "#b24605",
          800: "#8e370c",
          900: "#752e0e",
          950: "#441503",
        },
        cream: {
          50: "#fdfdfb",
          100: "#faf8f4",
          200: "#f4f0e7",
          300: "#ece4d3",
          400: "#dfd2b9",
        },
      },
    },
  },
  plugins: [],
};

export default config;
