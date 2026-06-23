import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { db, tasksTable } from "@workspace/db";
import { TranscribeAudioBody } from "@workspace/api-zod";

const router = Router();

router.post("/transcribe", async (req, res) => {
  const parsed = TranscribeAudioBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const { userId, audioBase64, mimeType } = parsed.data;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not configured" });

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Extrae de este audio una tarea. Devuelve un JSON estricto con: 'titulo' (string corto), 'descripcion' (string o null), 'fecha_vencimiento' (YYYY-MM-DD o null), 'hora_vencimiento' (HH:mm o null). Toma como referencia que hoy es ${new Date().toISOString()}. Solo el JSON, sin markdown.`;

  let extractedTask = { titulo: "Nota de voz", descripcion: null, fecha_vencimiento: null, hora_vencimiento: null };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ inlineData: { mimeType, data: audioBase64 } }, { text: prompt }] }],
    });
    const cleaned = (response.candidates?.[0]?.content?.parts?.[0]?.text ?? "").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    extractedTask = JSON.parse(cleaned);
  } catch (err) {
    req.log.error({ err }, "Gemini transcription failed");
  }

  const [task] = await db.insert(tasksTable).values({
    userId,
    titulo: extractedTask.titulo || "Nota de Voz",
    descripcion: extractedTask.descripcion ?? null,
    fechaVencimiento: extractedTask.fecha_vencimiento ?? null,
    horaVencimiento: extractedTask.hora_vencimiento ?? null,
  }).returning();

  return res.status(201).json({
    id: task.id,
    userId: task.userId,
    titulo: task.titulo,
    descripcion: task.descripcion ?? null,
    fechaVencimiento: task.fechaVencimiento ?? null,
    horaVencimiento: task.horaVencimiento ?? null,
    links: task.links as string[],
    notificaciones: task.notificaciones as string[],
    completada: task.completada,
    createdAt: task.createdAt.toISOString(),
  });
});

export default router;