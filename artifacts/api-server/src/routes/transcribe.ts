import { Router } from "express";
import { GoogleGenAI } from "@google/genai";
import { eq } from "drizzle-orm";
import { db, tasksTable, userPreferencesTable } from "@workspace/db";
import { TranscribeAudioBody } from "@workspace/api-zod";

const router = Router();

router.post("/transcribe", async (req, res) => {
  const parsed = TranscribeAudioBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const { userId, audioBase64, mimeType } = parsed.data;

  // 1. COMPROBAR LÍMITES DE IA
  let [prefs] = await db.select().from(userPreferencesTable).where(eq(userPreferencesTable.userId, userId));
  if (!prefs) {
    [prefs] = await db.insert(userPreferencesTable).values({ userId }).returning();
  }
  if (!prefs.isPremium && prefs.aiUsageCount >= 3) {
    return res.status(403).json({ error: "LIMIT_REACHED", message: "Has alcanzado el límite de 3 usos gratuitos." });
  }

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

    // 2. INCREMENTAR CONTADOR SI FUE EXITOSO
    await db.update(userPreferencesTable).set({ aiUsageCount: prefs.aiUsageCount + 1 }).where(eq(userPreferencesTable.userId, userId));
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

  return res.status(201).json(task);
});

export default router;