import app from "./app";
import { logger } from "./lib/logger";

// Vercel no necesita ni permite usar app.listen() en Serverless Functions.
// Por lo tanto, solo encendemos el servidor clásico si NO estamos en Vercel.
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

// Exportamos la app obligatoriamente para que Vercel pueda inyectarle las peticiones
export default app;