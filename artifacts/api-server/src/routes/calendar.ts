import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, userPreferencesTable } from "@workspace/db";
import { getGoogleAuthUrl, handleGoogleCallback } from "../lib/google-calendar";
import { google } from "googleapis";

const router = Router();

router.get("/calendar/connect", (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });
  const url = getGoogleAuthUrl(userId);
  res.json({ url });
});

router.get("/calendar/callback", async (req, res) => {
  const code = req.query.code as string;
  const userId = req.query.state as string;
  if (!code || !userId) return res.redirect(`${process.env.CLIENT_URL}/profile?calendar=error`);
  try {
    await handleGoogleCallback(code, userId);
    res.redirect(`${process.env.CLIENT_URL}/profile?calendar=success`);
  } catch (error) {
    res.redirect(`${process.env.CLIENT_URL}/profile?calendar=error`);
  }
});

router.post("/calendar/disconnect", async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });
  await db.update(userPreferencesTable).set({ googleRefreshToken: null, googleCalendarId: null }).where(eq(userPreferencesTable.userId, userId));
  res.json({ success: true });
});

// NUEVO ENDPOINT: Obtener eventos de Google Calendar
router.get("/calendar/events", async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const [prefs] = await db.select().from(userPreferencesTable).where(eq(userPreferencesTable.userId, userId));
  if (!prefs?.googleRefreshToken) return res.json([]);

  try {
    const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
    oauth2Client.setCredentials({ refresh_token: prefs.googleRefreshToken });
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    // Traemos los eventos desde hace 1 mes hasta dentro de 2 meses
    const timeMin = new Date();
    timeMin.setMonth(timeMin.getMonth() - 1);
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 2);

    const response = await calendar.events.list({
      calendarId: 'primary', // El calendario principal del usuario
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = response.data.items?.map(item => ({
      id: item.id,
      title: item.summary || "Sin título",
      start: item.start?.dateTime || item.start?.date,
      end: item.end?.dateTime || item.end?.date,
      allDay: !item.start?.dateTime,
      isGoogleCalendar: true // Flag para el frontend
    })) || [];

    res.json(events);
  } catch (error) {
    console.error("Error fetching GC events:", error);
    res.json([]); // Si falla, devolvemos array vacío para no romper la app
  }
});

export default router;