import { Router } from "express";
import { eq, and, sql, inArray } from "drizzle-orm";
import { db, tasksTable, taskAttachmentsTable } from "@workspace/db";
import { GoogleGenAI } from "@google/genai";
import ogs from "open-graph-scraper";
import {
  GetTasksQueryParams,
  CreateTaskBody,
  UpdateTaskParams,
  UpdateTaskBody,
  DeleteTaskParams,
  CreateMagicTextTaskBody,
  AddTaskAttachmentBody
} from "@workspace/api-zod";
import { syncTaskToGoogle, deleteTaskFromGoogle } from "../lib/google-calendar";

const router = Router();

const mapTask = (t: any) => ({
  id: t.id,
  userId: t.userId,
  titulo: t.titulo,
  descripcion: t.descripcion ?? null,
  fechaVencimiento: t.fechaVencimiento ?? null,
  horaVencimiento: t.horaVencimiento ?? null,
  fechaNotificacion: t.fechaNotificacion ?? null,
  horaNotificacion: t.horaNotificacion ?? null,
  proyecto: t.proyecto ?? null, 
  orden: t.orden ?? 0,
  links: (t.links as string[]) ?? [],
  notificaciones: (t.notificaciones as string[]) ?? [],
  completada: t.completada,
  createdAt: t.createdAt ? new Date(t.createdAt).toISOString() : new Date().toISOString(),
  updatedAt: t.updatedAt ? new Date(t.updatedAt).toISOString() : new Date().toISOString(),
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

  const tasks = await db.select().from(tasksTable).where(and(...conditions)).orderBy(tasksTable.orden, tasksTable.createdAt);

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
    proyecto: null,
    links: links ?? [],
    notificaciones: notificaciones ?? []
  }).returning();

  await syncTaskToGoogle(task, userId);
  return res.status(201).json({ ...mapTask(task), attachments: [] });
});

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

router.post("/tasks/magic-text", async (req, res) => {
  const parsed = CreateMagicTextTaskBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const { text, userId } = parsed.data;

  // 1. COMPROBAR LÍMITES Y RESETEO MENSUAL
  let [prefs] = await db.select().from(userPreferencesTable).where(eq(userPreferencesTable.userId, userId));
  if (!prefs) {
    [prefs] = await db.insert(userPreferencesTable).values({ userId }).returning();
  }

  const now = new Date();
  const resetDate = new Date(prefs.aiUsageResetDate);
  const nextReset = new Date(resetDate);
  nextReset.setMonth(nextReset.getMonth() + 1);

  let currentUsage = prefs.aiUsageCount;
  let newResetDate = prefs.aiUsageResetDate;

  if (now >= nextReset) {
    currentUsage = 0;
    newResetDate = now;
  }

  if (!prefs.isPremium && currentUsage >= 3) {
    return res.status(403).json({ error: "LIMIT_REACHED", message: "Has alcanzado el límite de 3 usos gratuitos." });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

  const ai = new GoogleGenAI({ apiKey });
  const formatter = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const madridTime = formatter.format(new Date());

  const prompt = `Actúa como un asistente personal ultra-inteligente. Analiza esta orden del usuario. La fecha y hora actual en España/Madrid es: ${madridTime}. REGLAS ESTRICTAS: 1. 'titulo': Extrae SOLO la acción principal. ELIMINA del título cualquier mención a fechas o horas. 2. 'fecha_vencimiento': Si menciona un día, calcúlalo basándote en la fecha actual y devuélvelo en formato "YYYY-MM-DD". Si no, null. 3. 'hora_vencimiento': Si menciona una hora, devuélvela en formato 24h "HH:mm". Si no, null. Devuelve SOLO un JSON válido: {"titulo": "string", "fecha_vencimiento": "string|null", "hora_vencimiento": "string|null"}. Texto del usuario: "${text}"`;

  let extractedTask = { titulo: text, fecha_vencimiento: null, hora_vencimiento: null };

  try {
    const response = await ai.models.generateContent({ model: "gemini-2.5-flash", contents: prompt });
    const aiText = response.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const cleaned = aiText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsedData = JSON.parse(cleaned);
    extractedTask.titulo = parsedData.titulo || extractedTask.titulo;
    extractedTask.fecha_vencimiento = parsedData.fecha_vencimiento || null;
    extractedTask.hora_vencimiento = parsedData.hora_vencimiento || null;

    // 2. ACTUALIZAR CONTADOR Y FECHA DE RESETEO
    await db.update(userPreferencesTable).set({ 
      aiUsageCount: currentUsage + 1,
      aiUsageResetDate: newResetDate
    }).where(eq(userPreferencesTable.userId, userId));
  } catch (err) {
    req.log.error({ err }, "Gemini text extraction failed");
  }

  const [task] = await db.insert(tasksTable).values({
    userId, titulo: extractedTask.titulo, descripcion: text, fechaVencimiento: extractedTask.fecha_vencimiento ?? null, horaVencimiento: extractedTask.hora_vencimiento ?? null, proyecto: null,
  }).returning();

  await syncTaskToGoogle(task, userId);
  return res.status(201).json({ ...task, attachments: [] });
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
    ...(updates.fechaNotificacion !== undefined && { fechaNotificacion: updates.fechaNotificacion }),
    ...(updates.horaNotificacion !== undefined && { horaNotificacion: updates.horaNotificacion }),
    ...(updates.proyecto !== undefined && { proyecto: updates.proyecto }),
    ...(updates.orden !== undefined && { orden: updates.orden }),
    ...(updates.links !== undefined && { links: updates.links }),
    ...(updates.notificaciones !== undefined && { notificaciones: updates.notificaciones }),
    ...(updates.completada !== undefined && { completada: updates.completada }),
    updatedAt: new Date(), 
  }).where(eq(tasksTable.id, id)).returning();

  if (!task) return res.status(404).json({ error: "Task not found" });
  await syncTaskToGoogle(task, task.userId);
  return res.json(mapTask(task));
});

router.delete("/tasks/:id", async (req, res) => {
  const parsed = DeleteTaskParams.safeParse(req.params);
  if (!parsed.success) return res.status(400).json({ error: "Invalid id" });

  // Obtener la tarea antes de borrarla para saber su googleEventId
  const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, parsed.data.id));

  if (task) {
    await db.delete(tasksTable).where(eq(tasksTable.id, parsed.data.id));
    if (task.googleEventId) {
      await deleteTaskFromGoogle(task.googleEventId, task.userId);
    }
  }

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

router.delete("/tasks/:taskId/attachments/:attachmentId", async (req, res) => {
  const { attachmentId } = req.params;
  await db.delete(taskAttachmentsTable).where(eq(taskAttachmentsTable.id, attachmentId));
  return res.status(204).send();
});

router.get("/tasks/metadata", async (req, res) => {
  const url = req.query.url as string;
  if (!url) return res.status(400).json({ error: "URL required" });

  try {
    const options = { 
      url, 
      timeout: 5000,
      fetchOptions: {
        headers: {
          // Usamos el User-Agent del bot de Facebook/WhatsApp. 
          // Instagram bloquea navegadores normales sin login, pero permite a sus propios bots leer la imagen.
          'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)'
        }
      }
    };
    const { result } = await ogs(options);

    return res.json({ 
      title: result.ogTitle || result.twitterTitle || url, 
      description: result.ogDescription || result.twitterDescription || null, 
      image: result.ogImage?.[0]?.url || result.twitterImage?.[0]?.url || null, 
      url 
    });
  } catch (e) {
    return res.json({ title: url, description: null, image: null, url });
  }
});

export default router;