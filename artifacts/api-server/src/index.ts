import app from "./app";
import { logger } from "./lib/logger";

// Vercel inyecta automáticamente la variable 'process.env.VERCEL'.
// Si NO estamos en Vercel, levantamos el servidor clásico con puerto.
if (!process.env.VERCEL) {
  const rawPort = process.env["PORT"] || "8080";
  const port = Number(rawPort);

  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  app.listen(port, (err) => {
    if (err) {
      logger.error({ err }, "Error listening on port");
      process.exit(1);
    }
    logger.info({ port }, "Server listening");
  });
}

// Exportamos la app obligatoriamente para que Vercel la pueda ejecutar como Serverless
export default app;