/** @type {import('postcss-load-config').Config} */
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}, // Ensure autoprefixer is listed if added to devDependencies
  },
}

export default config
