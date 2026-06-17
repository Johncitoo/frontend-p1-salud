export const theme = {
  colors: {
    graphite: "#353535",      // Texto principal, títulos y fondos oscuros
    stormyTeal: "#3C6E71",    // Acentos secundarios, botones secundarios
    white: "#FFFFFF",         // Fondos de tarjetas y contenedores
    alabasterGrey: "#D9D9D9", // Bordes, líneas de separación y estados inactivos
    yaleBlue: "#284B63",      // Color primario de marca, botones principales e identidades
    background: "#F5F7FA",    // Gris ultra-claro para fondo de pantallas
    danger: "#E63946",        // Alertas o errores
    success: "#2A9D8F",       // Estados exitosos o check-in realizado
    grayText: "#7A7A7A",      // Subtítulos o texto secundario
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    round: 9999,
  },
  typography: {
    h1: { fontSize: 24, fontWeight: "bold" },
    h2: { fontSize: 20, fontWeight: "bold" },
    body: { fontSize: 16 },
    caption: { fontSize: 14 },
    button: { fontSize: 16, fontWeight: "600" },
  }
} as const;
