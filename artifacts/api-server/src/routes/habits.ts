// artifacts/api-server/src/routes/habits.ts
import { Router } from "express";
import { eq, and, gte } from "drizzle-orm";
import { db, habitsTable, habitLogsTable } from "@workspace/db";
import { CreateHabitBody, DeleteHabitParams, LogHabitParams, UnlogHabitParams } from "@workspace/api-zod";

const router = Router();

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
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
  frecuencia: h.frecuencia,
  targetDays: (h.targetDays as number[]) ?? [0,1,2,3,4,5,6],
  archived: h.archived,
  currentStreak: h.currentStreak,
  bestStreak: h.bestStreak,
  createdAt: h.createdAt.toISOString(),
  logs: logs.filter((l) => l.habitId === h.id).map((l) => l.fechaCompletado),
});

router.get("/habits", async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const habits = await db.select().from(habitsTable).where(and(eq(habitsTable.userId, userId), eq(habitsTable.archived, false))).orderBy(habitsTable.createdAt);
  const sevenDaysAgo = getLast7Days()[0];
  const logs = await db.select().from(habitLogsTable).where(gte(habitLogsTable.fechaCompletado, sevenDaysAgo));

  return res.json(habits.map((h) => mapHabit(h, logs)));
});

router.post("/habits", async (req, res) => {
  const parsed = CreateHabitBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const { nombre, userId, frecuencia, targetDays } = parsed.data;
  const [habit] = await db.insert(habitsTable).values({ 
    nombre, userId, 
    frecuencia: frecuencia ?? "daily",
    targetDays: targetDays ?? [0,1,2,3,4,5,6]
  }).returning();

  return res.status(201).json(mapHabit(habit, []));
});

router.delete("/habits/:id", async (req, res) => {
  const parsed = DeleteHabitParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });
  await db.delete(habitsTable).where(eq(habitsTable.id, parsed.data.id));
  return res.status(204).send();
});

router.post("/habits/:id/log", async (req, res) => {
  const parsed = LogHabitParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  // Usar la fecha enviada o la de hoy por defecto
  const targetDate = (req.query.date as string) || new Date().toISOString().split("T")[0];

  const existing = await db.select().from(habitLogsTable).where(and(eq(habitLogsTable.habitId, parsed.data.id), eq(habitLogsTable.fechaCompletado, targetDate)));
  if (existing.length > 0) return res.status(201).json(existing[0]);

  const [log] = await db.insert(habitLogsTable).values({ habitId: parsed.data.id, fechaCompletado: targetDate }).returning();
  return res.status(201).json(log);
});

router.delete("/habits/:id/log", async (req, res) => {
  const parsed = UnlogHabitParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  // Usar la fecha enviada o la de hoy por defecto
  const targetDate = (req.query.date as string) || new Date().toISOString().split("T")[0];

  await db.delete(habitLogsTable).where(and(eq(habitLogsTable.habitId, parsed.data.id), eq(habitLogsTable.fechaCompletado, targetDate)));
  return res.status(204).send();
});

export default router;