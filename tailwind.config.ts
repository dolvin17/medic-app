import type { Config } from 'tailwindcss'

const config: Config = {
  // Activa el modo oscuro para que se controle con una clase en la etiqueta <html>
  darkMode: 'class',

  // Le dice a Tailwind dónde buscar clases para optimizar el CSS final
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],

  theme: {
    extend: {}, // Aquí puedes personalizar tu tema (colores, fuentes, etc.)
  },
  plugins: [],
}
export default config