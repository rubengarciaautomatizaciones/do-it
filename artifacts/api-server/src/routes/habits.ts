import { Router } from "express";
import { eq, and, gte } from "drizzle-orm";
import { db, habitsTable, habitLogsTable } from "@workspace/db";
import {
  CreateHabitBody,
  DeleteHabitParams,
  LogHabitParams,
  UnlogHabitParams,
} from "@workspace/api-zod";

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

router.get("/habits", async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const habits = await db
    .select()
    .from(habitsTable)
    .where(eq(habitsTable.userId, userId))
    .orderBy(habitsTable.createdAt);

  const sevenDaysAgo = getLast7Days()[0];

  const logs = await db
    .select()
    .from(habitLogsTable)
    .where(
      and(
        gte(habitLogsTable.fechaCompletado, sevenDaysAgo)
      )
    );

  const habitIds = new Set(habits.map((h) => h.id));
  const relevantLogs = logs.filter((l) => habitIds.has(l.habitId));

  const result = habits.map((h) => ({
    id: h.id,
    userId: h.userId,
    nombre: h.nombre,
    frecuencia: h.frecuencia,
    createdAt: h.createdAt.toISOString(),
    logs: relevantLogs
      .filter((l) => l.habitId === h.id)
      .map((l) => l.fechaCompletado),
  }));

  return res.json(result);
});

router.post("/habits", async (req, res) => {
  const parsed = CreateHabitBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const { nombre, userId, frecuencia } = parsed.data;
  const [habit] = await db
    .insert(habitsTable)
    .values({ nombre, userId, frecuencia: frecuencia ?? "daily" })
    .returning();

  return res.status(201).json({
    id: habit.id,
    userId: habit.userId,
    nombre: habit.nombre,
    frecuencia: habit.frecuencia,
    createdAt: habit.createdAt.toISOString(),
  });
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

  const today = new Date().toISOString().split("T")[0];
  const existing = await db
    .select()
    .from(habitLogsTable)
    .where(
      and(
        eq(habitLogsTable.habitId, parsed.data.id),
        eq(habitLogsTable.fechaCompletado, today)
      )
    );

  if (existing.length > 0) {
    return res.status(201).json({
      id: existing[0].id,
      habitId: existing[0].habitId,
      fechaCompletado: existing[0].fechaCompletado,
    });
  }

  const [log] = await db
    .insert(habitLogsTable)
    .values({ habitId: parsed.data.id, fechaCompletado: today })
    .returning();

  return res.status(201).json({
    id: log.id,
    habitId: log.habitId,
    fechaCompletado: log.fechaCompletado,
  });
});

router.delete("/habits/:id/log", async (req, res) => {
  const parsed = UnlogHabitParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  const today = new Date().toISOString().split("T")[0];
  await db
    .delete(habitLogsTable)
    .where(
      and(
        eq(habitLogsTable.habitId, parsed.data.id),
        eq(habitLogsTable.fechaCompletado, today)
      )
    );
  return res.status(204).send();
});

export default router;
