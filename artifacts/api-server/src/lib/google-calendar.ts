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
  // Solo sincronizamos si tiene fecha
  if (!task.fechaVencimiento) return;

  const [prefs] = await db.select().from(userPreferencesTable).where(eq(userPreferencesTable.userId, userId));
  if (!prefs?.googleRefreshToken || !prefs?.googleCalendarId) return;

  oauth2Client.setCredentials({ refresh_token: prefs.googleRefreshToken });
  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  // Construir fechas para Google
  let startDateTime, endDateTime;
  if (task.horaVencimiento) {
    startDateTime = `${task.fechaVencimiento}T${task.horaVencimiento}:00`;
    // Asumimos que dura 1 hora por defecto
    const endDate = new Date(startDateTime);
    endDate.setHours(endDate.getHours() + 1);
    endDateTime = endDate.toISOString().slice(0, 19);
  } else {
    startDateTime = task.fechaVencimiento;
    const endDate = new Date(task.fechaVencimiento);
    endDate.setDate(endDate.getDate() + 1);
    endDateTime = endDate.toISOString().split('T')[0];
  }

  const eventBody = {
    summary: task.completada ? `✅ ${task.titulo}` : task.titulo,
    description: task.descripcion || "",
    start: task.horaVencimiento ? { dateTime: startDateTime, timeZone: "Europe/Madrid" } : { date: startDateTime },
    end: task.horaVencimiento ? { dateTime: endDateTime, timeZone: "Europe/Madrid" } : { date: endDateTime },
  };

  try {
    if (task.googleEventId) {
      // Actualizar evento existente
      await calendar.events.update({
        calendarId: prefs.googleCalendarId,
        eventId: task.googleEventId,
        requestBody: eventBody,
      });
    } else {
      // Crear nuevo evento
      const res = await calendar.events.insert({
        calendarId: prefs.googleCalendarId,
        requestBody: eventBody,
      });
      // Guardar el ID del evento en nuestra BD
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