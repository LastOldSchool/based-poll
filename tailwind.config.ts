import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'base-blue': '#0052FF',
        'base-purple': '#A15FFB',
        'base-light': '#F0F4F9',
        'base-dark': '#101010',
      },
    },
  },
  plugins: [],
};

export default config; 