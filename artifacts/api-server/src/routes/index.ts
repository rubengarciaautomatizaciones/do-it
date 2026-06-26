import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tasksRouter from "./tasks";
import habitsRouter from "./habits";
import transcribeRouter from "./transcribe";
import preferencesRouter from "./preferences";
import calendarRouter from "./calendar";
import stripeRouter from "./stripe"; // <-- ESTE ES EL IMPORT QUE FALTABA
import cronRouter from "./cron";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tasksRouter);
router.use(habitsRouter);
router.use(transcribeRouter);
router.use(preferencesRouter);
router.use(stripeRouter);
router.use(calendarRouter);
router.use(cronRouter); 

export default router;