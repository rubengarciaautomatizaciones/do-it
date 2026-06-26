import express, { type Express, Request, Response, NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import stripeRouter from "./routes/stripe";


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

app.use("/api/stripe/webhook", express.raw({ type: "application/json" }), stripeRouter);


// AUMENTO DE LÍMITES A 50MB (Evita crashes con los audios)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// MIDDLEWARE INTERCEPTOR DEL USER ID
app.use((req: Request, res: Response, next: NextFunction) => {
  const uid = req.headers["x-user-id"];
  if (uid && typeof uid === "string") {
    req.query.userId = req.query.userId || uid;
    if (req.body && typeof req.body === "object") {
      req.body.userId = req.body.userId || uid;
    }
  }
  next();
});

app.use("/api", router);

// ESCUDO PROTECTOR DE DESEMPAQUETADO PROFUNDO (DEEP UNWRAP)
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error({ err }, "Excepción capturada");

  // Drizzle a veces esconde el error de Postgres dentro de err.cause o err.originalError
  const trueError = err.cause || err.originalError || err;

  res.status(500).json({ 
    error: "Internal Server Error", 
    message: err.message,
    real_cause: trueError.message || "No cause found",
    pg_code: trueError.code || null,
    pg_detail: trueError.detail || null,
    pg_table: trueError.table || null
  });
});

export default app;