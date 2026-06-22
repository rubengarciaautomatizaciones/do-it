import { Router } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, tasksTable } from "@workspace/db";
import {
  GetTasksQueryParams,
  CreateTaskBody,
  UpdateTaskParams,
  UpdateTaskBody,
  DeleteTaskParams,
} from "@workspace/api-zod";

const router = Router();

router.get("/tasks", async (req, res) => {
  const parsed = GetTasksQueryParams.safeParse(req.query);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid query params" });
  }
  const { completed } = parsed.data;
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const conditions = [eq(tasksTable.userId, userId)];
  if (completed !== undefined) {
    conditions.push(eq(tasksTable.completada, completed));
  }

  const tasks = await db
    .select()
    .from(tasksTable)
    .where(and(...conditions))
    .orderBy(tasksTable.createdAt);

  return res.json(
    tasks.map((t) => ({
      id: t.id,
      userId: t.userId,
      titulo: t.titulo,
      descripcion: t.descripcion ?? null,
      fechaVencimiento: t.fechaVencimiento ?? null,
      completada: t.completada,
      createdAt: t.createdAt.toISOString(),
    }))
  );
});

router.post("/tasks", async (req, res) => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid body" });
  }
  const { titulo, userId, descripcion, fechaVencimiento } = parsed.data;
  const [task] = await db
    .insert(tasksTable)
    .values({ titulo, userId, descripcion: descripcion ?? null, fechaVencimiento: fechaVencimiento ?? null })
    .returning();

  return res.status(201).json({
    id: task.id,
    userId: task.userId,
    titulo: task.titulo,
    descripcion: task.descripcion ?? null,
    fechaVencimiento: task.fechaVencimiento ?? null,
    completada: task.completada,
    createdAt: task.createdAt.toISOString(),
  });
});

router.patch("/tasks/:id", async (req, res) => {
  const paramsParsed = UpdateTaskParams.safeParse(req.params);
  if (!paramsParsed.success) return res.status(400).json({ error: "Invalid id" });

  const bodyParsed = UpdateTaskBody.safeParse(req.body);
  if (!bodyParsed.success) return res.status(400).json({ error: "Invalid body" });

  const { id } = paramsParsed.data;
  const updates = bodyParsed.data;

  const [task] = await db
    .update(tasksTable)
    .set({
      ...(updates.titulo !== undefined && { titulo: updates.titulo }),
      ...(updates.descripcion !== undefined && { descripcion: updates.descripcion }),
      ...(updates.fechaVencimiento !== undefined && { fechaVencimiento: updates.fechaVencimiento }),
      ...(updates.completada !== undefined && { completada: updates.completada }),
    })
    .where(eq(tasksTable.id, id))
    .returning();

  if (!task) return res.status(404).json({ error: "Task not found" });

  return res.json({
    id: task.id,
    userId: task.userId,
    titulo: task.titulo,
    descripcion: task.descripcion ?? null,
    fechaVencimiento: task.fechaVencimiento ?? null,
    completada: task.completada,
    createdAt: task.createdAt.toISOString(),
  });
});

router.delete("/tasks/:id", async (req, res) => {
  const parsed = DeleteTaskParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });
  await db.delete(tasksTable).where(eq(tasksTable.id, parsed.data.id));
  return res.status(204).send();
});

router.get("/tasks/stats", async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const today = new Date().toISOString().split("T")[0];

  const [totals] = await db
    .select({
      total: sql<number>`count(*)::int`,
      completed: sql<number>`count(*) filter (where ${tasksTable.completada} = true)::int`,
    })
    .from(tasksTable)
    .where(eq(tasksTable.userId, userId));

  const [todayRow] = await db
    .select({ completedToday: sql<number>`count(*)::int` })
    .from(tasksTable)
    .where(
      and(
        eq(tasksTable.userId, userId),
        eq(tasksTable.completada, true),
        sql`date(${tasksTable.createdAt}) = ${today}`
      )
    );

  return res.json({
    total: totals.total,
    completed: totals.completed,
    pending: totals.total - totals.completed,
    completedToday: todayRow.completedToday,
  });
});

export default router;
