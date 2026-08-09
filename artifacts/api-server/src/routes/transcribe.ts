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

  const groqApiKey = process.env.GROQ_API_KEY;
  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (!groqApiKey && !geminiApiKey) {
    return res.status(500).json({ error: "Neither GROQ_API_KEY nor GEMINI_API_KEY is configured" });
  }

  const formatter = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const madridTime = formatter.format(new Date());

  const prompt = `Extrae de este audio una tarea. La fecha y hora actual en España/Madrid es: ${madridTime}.
  REGLAS ESTRICTAS: 
  1. 'titulo': Crea un título corto (MÁXIMO 5 PALABRAS) que resuma la acción principal.
  2. 'descripcion': Mantén la información original INTACTA. Formatea el texto en HTML BÁSICO (<p>, <ul>, <li>, <strong>, <br>). Si hay varios puntos o listas, usa etiquetas <ul> y <li>. NO uses markdown (ni asteriscos ni hashtags). Si el texto es corto, envuélvelo en un <p>. Si no hay detalles extra, devuelve null.
  3. 'fecha_vencimiento': Extrae la fecha en formato "YYYY-MM-DD" calculada desde hoy. Si no hay, null.
  4. 'hora_inicio': Extrae la hora de inicio en formato 24h "HH:mm". Si el usuario dice "a las 9", pon "09:00". Si no hay, null.
  5. 'hora_vencimiento': Extrae la hora de fin en formato 24h "HH:mm". Si el usuario no especifica fin, calcúlala sumando 1 hora a la hora_inicio. Si no hay, null.
  6. 'links': Array de strings con URLs detectadas. Si no hay, [].
  Devuelve SOLO un JSON válido, sin bloques de código markdown: {"titulo": "string", "descripcion": "string|null", "fecha_vencimiento": "string|null", "hora_inicio": "string|null", "hora_vencimiento": "string|null", "links": []}`;

  let extractedTask = { titulo: "Nota de voz", descripcion: null, fecha_vencimiento: null, hora_inicio: null, hora_vencimiento: null, links: [] };

  try {
    if (groqApiKey) {
      // Fast Groq pipeline: 1. Transcribe audio with Whisper 2. Extract JSON with Llama 3.3
      const audioBuffer = Buffer.from(audioBase64, 'base64');
      const audioBlob = new Blob([audioBuffer], { type: mimeType || 'audio/webm' });
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.webm');
      formData.append('model', 'whisper-large-v3-turbo');
      formData.append('language', 'es');
      formData.append('response_format', 'json');

      const sttResponse = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqApiKey}` },
        body: formData,
      });

      if (!sttResponse.ok) {
        const errText = await sttResponse.text();
        throw new Error(`Groq STT failed (${sttResponse.status}): ${errText}`);
      }

      const sttData = await sttResponse.json() as { text?: string };
      const transcribedText = sttData.text || "";

      const llmPrompt = `${prompt}\n\nTexto transcrito del audio del usuario: "${transcribedText}"`;
      const llmResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: llmPrompt }],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
      });

      if (!llmResponse.ok) {
        const errText = await llmResponse.text();
        throw new Error(`Groq LLM failed (${llmResponse.status}): ${errText}`);
      }

      const llmData = await llmResponse.json() as { choices?: Array<{ message?: { content?: string } }> };
      const aiText = llmData.choices?.[0]?.message?.content ?? "";
      const cleaned = aiText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsedData = JSON.parse(cleaned);

      extractedTask.titulo = parsedData.titulo || (transcribedText.slice(0, 30) || extractedTask.titulo);
      extractedTask.descripcion = parsedData.descripcion || null;
      extractedTask.fecha_vencimiento = parsedData.fecha_vencimiento || null;
      extractedTask.hora_inicio = parsedData.hora_inicio || null;
      extractedTask.hora_vencimiento = parsedData.hora_vencimiento || null;
      extractedTask.links = parsedData.links || [];
    } else {
      // Fallback to Gemini if GROQ_API_KEY is not set
      const ai = new GoogleGenAI({ apiKey: geminiApiKey! });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: "user", parts: [{ inlineData: { mimeType, data: audioBase64 } }, { text: prompt }] }],
      });
      const cleaned = (response.candidates?.[0]?.content?.parts?.[0]?.text ?? "").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsedData = JSON.parse(cleaned);

      extractedTask.titulo = parsedData.titulo || extractedTask.titulo;
      extractedTask.descripcion = parsedData.descripcion || null;
      extractedTask.fecha_vencimiento = parsedData.fecha_vencimiento || null;
      extractedTask.hora_inicio = parsedData.hora_inicio || null;
      extractedTask.hora_vencimiento = parsedData.hora_vencimiento || null;
      extractedTask.links = parsedData.links || [];
    }

    await db.update(userPreferencesTable).set({ 
      aiUsageCount: currentUsage + 1,
      aiUsageResetDate: newResetDate
    }).where(eq(userPreferencesTable.userId, userId));
  } catch (err) {
    req.log.error({ err }, "Transcription/AI extraction failed");
  }

  const [task] = await db.insert(tasksTable).values({
    userId,
    titulo: extractedTask.titulo || "Nota de Voz",
    descripcion: extractedTask.descripcion ?? null,
    fechaVencimiento: extractedTask.fecha_vencimiento ?? null,
    horaInicio: extractedTask.hora_inicio ?? null,
    horaVencimiento: extractedTask.hora_vencimiento ?? null,
    links: extractedTask.links || [],
  }).returning();

  return res.status(201).json(task);
});

export default router;