import { Router } from "express";
import { eq, and, sql, inArray } from "drizzle-orm";
import { db, tasksTable, taskAttachmentsTable } from "@workspace/db";
import { GoogleGenAI } from "@google/genai";
import {
  GetTasksQueryParams,
  CreateTaskBody,
  UpdateTaskParams,
  UpdateTaskBody,
  DeleteTaskParams,
  CreateMagicTextTaskBody,
  AddTaskAttachmentBody
} from "@workspace/api-zod";

const router = Router();

const mapTask = (t: any) => ({
  id: t.id,
  userId: t.userId,
  titulo: t.titulo,
  descripcion: t.descripcion ?? null,
  fechaVencimiento: t.fechaVencimiento ?? null,
  horaVencimiento: t.horaVencimiento ?? null,
  links: (t.links as string[]) ?? [],
  notificaciones: (t.notificaciones as string[]) ?? [],
  completada: t.completada,
  createdAt: t.createdAt.toISOString(),
});

router.get("/tasks", async (req, res) => {
  const parsed = GetTasksQueryParams.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: "Invalid query params" });

  const { completed } = parsed.data;
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const conditions = [eq(tasksTable.userId, userId)];
  if (completed !== undefined) {
    conditions.push(eq(tasksTable.completada, completed));
  }

  const tasks = await db.select().from(tasksTable).where(and(...conditions)).orderBy(tasksTable.createdAt);

  // OBTENER ADJUNTOS PARA ESTAS TAREAS
  const taskIds = tasks.map(t => t.id);
  let attachments: any[] = [];
  if (taskIds.length > 0) {
    attachments = await db.select().from(taskAttachmentsTable).where(inArray(taskAttachmentsTable.taskId, taskIds));
  }

  const mapTaskWithAtts = (t: any) => {
    const base = mapTask(t) as any;
    base.attachments = attachments.filter(a => a.taskId === t.id).map(a => ({
      id: a.id, taskId: a.taskId, fileName: a.fileName, fileUrl: a.fileUrl, fileType: a.fileType, createdAt: a.createdAt.toISOString()
    }));
    return base;
  };

  return res.json(tasks.map(mapTaskWithAtts));
});

router.post("/tasks", async (req, res) => {
  const parsed = CreateTaskBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const { titulo, userId, descripcion, fechaVencimiento, horaVencimiento, links, notificaciones } = parsed.data;
  const [task] = await db.insert(tasksTable).values({ 
    titulo, userId, 
    descripcion: descripcion ?? null, 
    fechaVencimiento: fechaVencimiento ?? null,
    horaVencimiento: horaVencimiento ?? null,
    links: links ?? [],
    notificaciones: notificaciones ?? []
  }).returning();

  return res.status(201).json({ ...mapTask(task), attachments: [] });
});

// NUEVA RUTA: Guardar adjuntos en la BD
router.post("/tasks/:id/attachments", async (req, res) => {
  const { id } = req.params;
  const parsed = AddTaskAttachmentBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const [attachment] = await db.insert(taskAttachmentsTable).values({
    taskId: id,
    fileName: parsed.data.fileName,
    fileUrl: parsed.data.fileUrl,
    fileType: parsed.data.fileType
  }).returning();

  return res.status(201).json({
    ...attachment,
    createdAt: attachment.createdAt.toISOString()
  });
});

// ... (El resto de rutas /tasks/magic-text, patch, delete y stats se mantienen exactamente igual)
router.post("/tasks/magic-text", async (req, res) => { /* ... igual ... */ 
  const parsed = CreateMagicTextTaskBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const { text, userId } = parsed.data;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

  const ai = new GoogleGenAI({ apiKey });
  const prompt = `Actúa como un asistente personal ultra-inteligente. Analiza este texto de una nota de voz/texto. 
  1. Extrae la intención principal para crear un 'titulo' muy corto (máx 5 palabras). 
  2. Si menciona una fecha (ej: mañana, el viernes, el 23 de mayo), conviértelo a formato YYYY-MM-DD y ponlo en 'fecha_vencimiento' (si no, null). Toma como referencia que hoy es ${new Date().toISOString()}.
  3. Si menciona una hora (ej: a las 10, a las 4 de la tarde), conviértelo a HH:mm (24h) y ponlo en 'hora_vencimiento' (si no, null).
  Devuelve SOLO un JSON estricto: {"titulo": "string", "fecha_vencimiento": "string|null", "hora_vencimiento": "string|null"}. 
  Texto del usuario: "${text}"`;

  let extractedTask = { titulo: text, fecha_vencimiento: null, hora_vencimiento: null };

  try {
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
    const aiText = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const cleaned = aiText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    extractedTask = JSON.parse(cleaned);
  } catch (err) {
    req.log.error({ err }, "Gemini text extraction failed, fallback to raw text");
  }

  const [task] = await db.insert(tasksTable).values({
    userId,
    titulo: extractedTask.titulo || "Nueva tarea",
    descripcion: text, 
    fechaVencimiento: extractedTask.fecha_vencimiento ?? null,
    horaVencimiento: extractedTask.hora_vencimiento ?? null,
  }).returning();

  return res.status(201).json({ ...mapTask(task), attachments: [] });
});

router.patch("/tasks/:id", async (req, res) => {
  const paramsParsed = UpdateTaskParams.safeParse(req.params);
  const bodyParsed = UpdateTaskBody.safeParse(req.body);
  if (!paramsParsed.success || !bodyParsed.success) return res.status(400).json({ error: "Invalid request" });

  const { id } = paramsParsed.data;
  const updates = bodyParsed.data;

  const [task] = await db.update(tasksTable).set({
    ...(updates.titulo !== undefined && { titulo: updates.titulo }),
    ...(updates.descripcion !== undefined && { descripcion: updates.descripcion }),
    ...(updates.fechaVencimiento !== undefined && { fechaVencimiento: updates.fechaVencimiento }),
    ...(updates.horaVencimiento !== undefined && { horaVencimiento: updates.horaVencimiento }),
    ...(updates.links !== undefined && { links: updates.links }),
    ...(updates.notificaciones !== undefined && { notificaciones: updates.notificaciones }),
    ...(updates.completada !== undefined && { completada: updates.completada }),
  }).where(eq(tasksTable.id, id)).returning();

  if (!task) return res.status(404).json({ error: "Task not found" });
  return res.json(mapTask(task));
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
  const [totals] = await db.select({ total: sql<number>`count(*)::int`, completed: sql<number>`count(*) filter (where ${tasksTable.completada} = true)::int` }).from(tasksTable).where(eq(tasksTable.userId, userId));
  const [todayRow] = await db.select({ completedToday: sql<number>`count(*)::int` }).from(tasksTable).where(and(eq(tasksTable.userId, userId), eq(tasksTable.completada, true), sql`date(${tasksTable.createdAt}) = ${today}`));
  return res.json({ total: totals.total, completed: totals.completed, pending: totals.total - totals.completed, completedToday: todayRow.completedToday });
});

export default router;