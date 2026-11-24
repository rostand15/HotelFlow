/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#16263a",      // azul-petróleo escuro: cabeçalho e textos fortes
        paper: "#f3f5f7",    // fundo geral
        brass: "#a8741a",    // detalhe dourado do hotel
      },
    },
  },
  plugins: [],
};
