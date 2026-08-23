/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        './pages/**/*.{js,ts,jsx,tsx,mdx}',
        './components/**/*.{js,ts,jsx,tsx,mdx}',
        './src/**/*.{js,ts,jsx,tsx,mdx}', // Thêm dòng này để quét toàn bộ src
    ],
    theme: {
        extend: {},
    },
    plugins: [],
}