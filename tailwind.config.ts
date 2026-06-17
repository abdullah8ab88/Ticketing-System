import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        lazem: {
          teal: '#274C5A',
          bluegray: '#86A7B2',
          darkgray: '#2B2B2B',
          gray50: '#7F7F7F'
        }
      },
      boxShadow: {
        soft: '0 18px 60px rgba(39, 76, 90, 0.14)'
      }
    }
  },
  plugins: []
};
export default config;
