import { Router } from "express";
import { eq, and, gte } from "drizzle-orm";
import { db, habitsTable, habitLogsTable, userPreferencesTable } from "@workspace/db";
import { CreateHabitBody, DeleteHabitParams, LogHabitParams, UnlogHabitParams, UpdateHabitBody, LogHabitBody } from "@workspace/api-zod";

const router = Router();

function getLast30Days(): string[] {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
}

const mapHabit = (h: any, logs: any[]) => ({
  id: h.id,
  userId: h.userId,
  nombre: h.nombre,
  tipoMeta: h.tipoMeta,
  metaNumero: h.metaNumero,
  unidad: h.unidad,
  frecuenciaTipo: h.frecuenciaTipo,
  frecuenciaValor: (h.frecuenciaValor as number[]) ?? [0,1,2,3,4,5,6],
  recordatorioHora: h.recordatorioHora,
  fechaInicio: h.fechaInicio,
  fechaFin: h.fechaFin,
  estado: h.estado,
  qstashMessageId: h.qstashMessageId,
  currentStreak: h.currentStreak,
  bestStreak: h.bestStreak,
  createdAt: h.createdAt.toISOString(),
  logs: logs.filter((l) => l.habitId === h.id).map((l) => ({ fecha: l.fechaCompletado, valor: l.valor })),
});

router.get("/habits", async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const habits = await db.select().from(habitsTable).where(eq(habitsTable.userId, userId)).orderBy(habitsTable.createdAt);
  const thirtyDaysAgo = getLast30Days()[0];
  const logs = await db.select().from(habitLogsTable).where(gte(habitLogsTable.fechaCompletado, thirtyDaysAgo));

  return res.json(habits.map((h) => mapHabit(h, logs)));
});

router.post("/habits", async (req, res) => {
  const parsed = CreateHabitBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const data = parsed.data;

  let [prefs] = await db.select().from(userPreferencesTable).where(eq(userPreferencesTable.userId, data.userId));
  if (!prefs?.isPremium) {
    const userHabits = await db.select().from(habitsTable).where(eq(habitsTable.userId, data.userId));
    if (userHabits.length >= 5) {
      return res.status(403).json({ error: "LIMIT_REACHED", message: "Límite de 5 hábitos alcanzado en el plan Free." });
    }
  }

  const [habit] = await db.insert(habitsTable).values({ 
    ...data,
    estado: "activo"
  }).returning();

  return res.status(201).json(mapHabit(habit, []));
});

router.patch("/habits/:id", async (req, res) => {
  const { id } = req.params;
  const parsed = UpdateHabitBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const [habit] = await db.update(habitsTable)
    .set(parsed.data)
    .where(eq(habitsTable.id, id))
    .returning();

  if (!habit) return res.status(404).json({ error: "Not found" });

  const logs = await db.select().from(habitLogsTable).where(eq(habitLogsTable.habitId, id));
  return res.json(mapHabit(habit, logs));
});

router.delete("/habits/:id", async (req, res) => {
  const parsed = DeleteHabitParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  await db.delete(habitsTable).where(eq(habitsTable.id, parsed.data.id));
  return res.status(204).send();
});

router.post("/habits/:id/log", async (req, res) => {
  const parsedParams = LogHabitParams.safeParse(req.params);
  const parsedBody = LogHabitBody.safeParse(req.body);
  if (!parsedParams.success || !parsedBody.success) return res.status(400).json({ error: "Invalid request" });

  const targetDate = (req.query.date as string) || new Date().toISOString().split("T")[0];
  const { valor } = parsedBody.data;

  const existing = await db.select().from(habitLogsTable).where(and(eq(habitLogsTable.habitId, parsedParams.data.id), eq(habitLogsTable.fechaCompletado, targetDate)));

  if (existing.length > 0) {
    const [updated] = await db.update(habitLogsTable).set({ valor }).where(eq(habitLogsTable.id, existing[0].id)).returning();
    return res.status(200).json(updated);
  }

  const [log] = await db.insert(habitLogsTable).values({ habitId: parsedParams.data.id, fechaCompletado: targetDate, valor }).returning();
  return res.status(201).json(log);
});

router.delete("/habits/:id/log", async (req, res) => {
  const parsed = UnlogHabitParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  const targetDate = (req.query.date as string) || new Date().toISOString().split("T")[0];

  await db.delete(habitLogsTable).where(and(eq(habitLogsTable.habitId, parsed.data.id), eq(habitLogsTable.fechaCompletado, targetDate)));
  return res.status(204).send();
});

export default router;