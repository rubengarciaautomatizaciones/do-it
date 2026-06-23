export default async function (req, res) {
  // Importamos dinámicamente el build de Express
  const { default: app } = await import('../artifacts/api-server/dist/index.mjs');
  // Pasamos la petición de Vercel a nuestra app de Express
  return app(req, res);
}