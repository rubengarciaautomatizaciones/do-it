import { google } from "googleapis";
import { db, userPreferencesTable, tasksTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.CLIENT_URL}/api/calendar/callback`
);

export function getGoogleAuthUrl(userId: string) {
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent", // Fuerza a que nos den el refresh_token siempre
    scope: ["https://www.googleapis.com/auth/calendar"],
    state: userId, // Pasamos el ID del usuario para saber de quién es el token al volver
  });
}

export async function handleGoogleCallback(code: string, userId: string) {
  const { tokens } = await oauth2Client.getToken(code);
  oauth2Client.setCredentials(tokens);

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  // 1. Buscar si ya existe el calendario "Do it!"
  const calendarList = await calendar.calendarList.list();
  let doItCalendar = calendarList.data.items?.find(c => c.summary === "Do it!");

  // 2. Si no existe, lo creamos
  if (!doItCalendar) {
    const newCal = await calendar.calendars.insert({
      requestBody: { summary: "Do it!", description: "Tareas sincronizadas desde la app Do it!" }
    });
    doItCalendar = newCal.data;
  }

  // 3. Guardar en base de datos
  if (tokens.refresh_token && doItCalendar?.id) {
    await db.update(userPreferencesTable)
      .set({ googleRefreshToken: tokens.refresh_token, googleCalendarId: doItCalendar.id })
      .where(eq(userPreferencesTable.userId, userId));
  }
}

export async function syncTaskToGoogle(task: any, userId: string) {
  if (!task.fechaVencimiento) return;

  const [prefs] = await db.select().from(userPreferencesTable).where(eq(userPreferencesTable.userId, userId));
  if (!prefs?.googleRefreshToken || !prefs?.googleCalendarId) return;

  oauth2Client.setCredentials({ refresh_token: prefs.googleRefreshToken });
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  let startDateTime, endDateTime;

  if (task.horaInicio && task.horaVencimiento) {
    startDateTime = `${task.fechaVencimiento}T${task.horaInicio}:00`;
    endDateTime = `${task.fechaVencimiento}T${task.horaVencimiento}:00`;
  } else if (task.horaVencimiento) {
    // Si solo hay hora de fin, asumimos 1 hora de duración
    endDateTime = `${task.fechaVencimiento}T${task.horaVencimiento}:00`;
    const startDate = new Date(endDateTime);
    startDate.setHours(startDate.getHours() - 1);
    startDateTime = startDate.toISOString().slice(0, 19);
  } else {
    // Evento de todo el día
    startDateTime = task.fechaVencimiento;
    const endDate = new Date(task.fechaVencimiento);
    endDate.setDate(endDate.getDate() + 1);
    endDateTime = endDate.toISOString().split('T')[0];
  }

  const eventBody = {
    summary: task.completada ? `✅ ${task.titulo}` : task.titulo,
    description: task.descripcion || "",
    start: startDateTime.includes('T') ? { dateTime: startDateTime, timeZone: "Europe/Madrid" } : { date: startDateTime },
    end: endDateTime.includes('T') ? { dateTime: endDateTime, timeZone: "Europe/Madrid" } : { date: endDateTime },
    colorId: "8", // <-- NUEVO: Color Grafito de Google Calendar
  };

  try {
    if (task.googleEventId) {
      await calendar.events.update({
        calendarId: prefs.googleCalendarId,
        eventId: task.googleEventId,
        requestBody: eventBody,
      });
    } else {
      const res = await calendar.events.insert({
        calendarId: prefs.googleCalendarId,
        requestBody: eventBody,
      });
      if (res.data.id) {
        await db.update(tasksTable).set({ googleEventId: res.data.id }).where(eq(tasksTable.id, task.id));
      }
    }
  } catch (error) {
    console.error("Error syncing to Google Calendar:", error);
  }
}

export async function deleteTaskFromGoogle(googleEventId: string, userId: string) {
  const [prefs] = await db.select().from(userPreferencesTable).where(eq(userPreferencesTable.userId, userId));
  if (!prefs?.googleRefreshToken || !prefs?.googleCalendarId) return;

  oauth2Client.setCredentials({ refresh_token: prefs.googleRefreshToken });
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  try {
    await calendar.events.delete({
      calendarId: prefs.googleCalendarId,
      eventId: googleEventId,
    });
  } catch (error) {
    console.error("Error deleting from Google Calendar:", error);
  }
}