/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F6F1EA', // warm cream page
        paper2: '#EFE7DC', // alternate section tone
        ink: '#1E1917', // warm near-black text
        muted: '#6E625B', // secondary text
        line: '#E2D8CB', // hairlines
        brick: { DEFAULT: '#B8432F', dark: '#963523', soft: '#F4E1DA' }, // primary accent
        saffron: { DEFAULT: '#E0A33A', soft: '#F8E7C4' }, // highlights
        sage: { DEFAULT: '#5E8466', soft: '#E3ECE2' }, // "normal / positive"
        night: '#17110F', // dark sections
        ivory: '#F1E4D3', // text & glow on dark
        // clinical workstation (simulation page)
        sim: { bg: '#0D0F10', panel: '#15181A', panel2: '#1B1F22', line: '#272C30', text: '#E7E3DD', dim: '#8B908F' },
        mon: { ecg: '#4ADE80', spo2: '#FACC15', resp: '#E5E7EB', bp: '#F87171', temp: '#FDBA74' },
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(30,25,23,.04), 0 12px 32px -12px rgba(30,25,23,.14)',
        lift: '0 2px 4px rgba(30,25,23,.05), 0 24px 48px -20px rgba(30,25,23,.25)',
      },
    },
  },
  plugins: [],
};
