/** @type {import('tailwindcss').Config} */
module.exports = {
    // Files to scan for class names
    content: [
      "./src/**/*.{js,jsx,ts,tsx}",
      "./pages/**/*.{js,jsx,ts,tsx}",
      "./components/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
      extend: {
        // Custom colors for your financial app
        colors: {
          // UI colors
          primary: {
            DEFAULT: '#4F46E5', // Indigo
            dark: '#4338CA',
            light: '#818CF8',
          },
          secondary: {
            DEFAULT: '#10B981', // Emerald
            dark: '#059669',
            light: '#34D399',
          },
          danger: {
            DEFAULT: '#EF4444', // Red
            dark: '#DC2626',
            light: '#F87171',
          },
          // Financial indicator colors
          profit: '#10B981',    // Green for positive numbers
          loss: '#EF4444',      // Red for negative numbers
          neutral: '#6B7280',   // Gray for neutral values
        },
        // Custom spacing if needed
        spacing: {
          '72': '18rem',
          '84': '21rem',
          '96': '24rem',
        },
        // Custom border radius
        borderRadius: {
          '4xl': '2rem',
        },
        // Font settings
        fontFamily: {
          sans: ['Inter', 'system-ui', 'sans-serif'],
        },
        // Box shadows
        boxShadow: {
          'card': '0 0 0 1px rgba(0, 0, 0, 0.05), 0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        },
        extend: {
          backgroundImage: {
            'gradient-linear': 'linear-gradient(to right, var(--tw-gradient-stops))',
          },
        },
      },
    },
    plugins: [
      require('@tailwindcss/forms'), // For better form styling
    ],
    // Important to ensure styles are applied correctly
    important: true,
  }