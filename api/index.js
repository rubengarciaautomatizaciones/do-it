export default async function handler(req, res) {
  try {
    // Intentamos cargar el backend de forma dinámica
    const module = await import('../artifacts/api-server/dist/index.mjs');
    const app = module.default;

    // Si carga bien, ejecutamos la app de Express
    return app(req, res);
  } catch (error) {
    // SI ALGO FALLA AL ARRANCAR, LO CAPTURAMOS AQUÍ
    console.error("🔥 CRASH FATAL EN VERCEL:", error);

    // Devolvemos el error a tu pestaña 'Network' para saber exactamente qué falla
    return res.status(500).json({
      fatal_error: "El servidor de Vercel crasheó al inicializarse.",
      error_message: error.message,
      error_stack: error.stack,
      diagnostico_variables_entorno: {
        DATABASE_URL_existe: !!process.env.DATABASE_URL,
        GEMINI_API_KEY_existe: !!process.env.GEMINI_API_KEY,
        VITE_SUPABASE_URL_existe: !!process.env.VITE_SUPABASE_URL
      }
    });
  }
}