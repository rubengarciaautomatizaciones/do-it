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

  const prompt = `Extrae de este audio una tarea. La fecha y hora actual en España/Madrid es: ${madridTime}.
  REGLAS ESTRICTAS: 
  1. 'titulo': Crea un título corto (MÁXIMO 5 PALABRAS) que resuma la acción principal.
  2. 'descripcion': Mantén la información original INTACTA. Formatea el texto en HTML BÁSICO (<p>, <ul>, <li>, <strong>, <br>). Si hay varios puntos o listas, usa etiquetas <ul> y <li>. NO uses markdown (ni asteriscos ni hashtags). Si el texto es corto, envuélvelo en un <p>. Si no hay detalles extra, devuelve null.
  3. 'fecha_vencimiento': Extrae la fecha en formato "YYYY-MM-DD" calculada desde hoy. Si no hay, null.
  4. 'hora_vencimiento': Extrae la hora en formato 24h "HH:mm". Si no hay, null.
  5. 'links': Array de strings con URLs detectadas. Si no hay, [].
  Devuelve SOLO un JSON válido, sin bloques de código markdown: {"titulo": "string", "descripcion": "string|null", "fecha_vencimiento": "string|null", "hora_vencimiento": "string|null", "links": []}`;

  let extractedTask = { titulo: "Nota de voz", descripcion: null, fecha_vencimiento: null, hora_vencimiento: null, links: [] };

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ inlineData: { mimeType, data: audioBase64 } }, { text: prompt }] }],
    });
    const cleaned = (response.candidates?.[0]?.content?.parts?.[0]?.text ?? "").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsedData = JSON.parse(cleaned);

    extractedTask.titulo = parsedData.titulo || extractedTask.titulo;
    extractedTask.descripcion = parsedData.descripcion || null;
    extractedTask.fecha_vencimiento = parsedData.fecha_vencimiento || null;
    extractedTask.hora_vencimiento = parsedData.hora_vencimiento || null;
    extractedTask.links = parsedData.links || [];

    await db.update(userPreferencesTable).set({ 
      aiUsageCount: currentUsage + 1,
      aiUsageResetDate: newResetDate
    }).where(eq(userPreferencesTable.userId, userId));
  } catch (err) {
    req.log.error({ err }, "Gemini transcription failed");
  }

  const [task] = await db.insert(tasksTable).values({
    userId,
    titulo: extractedTask.titulo || "Nota de Voz",
    descripcion: extractedTask.descripcion ?? null,
    fechaVencimiento: extractedTask.fecha_vencimiento ?? null,
    horaVencimiento: extractedTask.hora_vencimiento ?? null,
    links: extractedTask.links || [],
  }).returning();

  return res.status(201).json(task);
});

export default router;prompt