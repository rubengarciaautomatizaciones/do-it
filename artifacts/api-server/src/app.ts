import express, { type Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// @ts-ignore
app.use(pinoHttp({
  logger,
  serializers: {
    req(req: any) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
    res(res: any) { return { statusCode: res.statusCode }; },
  },
}));

app.use(cors());

// AUMENTO DE LÍMITES A 50MB (Evita crashes con los audios)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// MIDDLEWARE INTERCEPTOR DEL USER ID
app.use((req: Request, res: Response, next: NextFunction) => {
  const uid = req.headers["x-user-id"];
  if (uid && typeof uid === "string") {
    // Lo inyectamos donde las rutas originales esperan encontrarlo
    req.query.userId = req.query.userId || uid;
    if (req.body && typeof req.body === "object") {
      req.body.userId = req.body.userId || uid;
    }
  }
  next();
});

app.use("/api", router);

// ESCUDO PROTECTOR (GLOBAL ERROR HANDLER MEJORADO PARA POSTGRES)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err }, "Excepción capturada en el Global Error Handler");

  // Extraemos toda la información útil que Postgres nos manda
  res.status(500).json({ 
    error: "Internal Server Error", 
    message: err.message || "Error desconocido",
    pg_code: err.code || null,
    pg_detail: err.detail || null,
    pg_hint: err.hint || null,
    pg_table: err.table || null,
    pg_constraint: err.constraint || null
  });
});

export default app;