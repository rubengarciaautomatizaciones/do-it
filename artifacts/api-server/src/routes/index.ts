import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tasksRouter from "./tasks";
import habitsRouter from "./habits";
import transcribeRouter from "./transcribe";
import preferencesRouter from "./preferences";
import calendarRouter from "./calendar";
import stripeRouter from "./stripe"; // <-- ESTE ES EL IMPORT QUE FALTABA
import cronRouter from "./cron";
import notificationsRouter from "./notifications"; // <-- AÑADIR ESTO
import accountRouter from "./account"; // <-- AÑADIR
import supportRouter from "./support";




const router: IRouter = Router();

router.use(healthRouter);
router.use(tasksRouter);
router.use(habitsRouter);
router.use(transcribeRouter);
router.use(preferencesRouter);
router.use(stripeRouter);
router.use(calendarRouter);
router.use(cronRouter); 
router.use(notificationsRouter);
router.use(accountRouter);
router.use(supportRouter);


export default router;