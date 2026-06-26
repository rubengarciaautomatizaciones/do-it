import { Client } from "@upstash/qstash";
import { db, tasksTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const qstash = new Client({ token: process.env.QSTASH_TOKEN || "dummy" });

export async function scheduleNotification(task: any) {
  if (!process.env.QSTASH_TOKEN || !process.env.CRON_SECRET || !process.env.CLIENT_URL) return;

  // 1. Si ya había una notificación programada para esta tarea, la cancelamos
  if (task.qstashMessageId) {
    try { await qstash.messages.delete(task.qstashMessageId); } catch (e) {}
  }

  // 2. Si la tarea tiene fecha/hora de notificación y NO está completada
  if (task.fechaNotificacion && task.horaNotificacion && !task.completada) {
    // Forzamos la zona horaria de España (+02:00 en verano, +01:00 en invierno). Usamos +02:00 por defecto.
    const dateStr = `${task.fechaNotificacion}T${task.horaNotificacion}:00+02:00`;
    const timestamp = Math.floor(Date.parse(dateStr) / 1000);

    // Si la fecha ya pasó, no hacemos nada
    if (timestamp * 1000 <= Date.now()) return;

    try {
      // Programamos el mensaje en QStash
      const res = await qstash.publishJSON({
        url: `${process.env.CLIENT_URL}/api/notifications/send`,
        body: { taskId: task.id, userId: task.userId },
        notBefore: timestamp,
        headers: { 
          // Usamos nuestro CRON_SECRET como contraseña para que nadie más pueda llamar a este endpoint
          Authorization: `Bearer ${process.env.CRON_SECRET}` 
        }
      });

      // Guardamos el ID del mensaje en la base de datos por si luego hay que cancelarlo
      await db.update(tasksTable).set({ qstashMessageId: res.messageId }).where(eq(tasksTable.id, task.id));
    } catch (error) {
      console.error("Error scheduling QStash:", error);
    }
  }
}

export async function cancelNotification(qstashMessageId: string) {
  if (!process.env.QSTASH_TOKEN || !qstashMessageId) return;
  try { await qstash.messages.delete(qstashMessageId); } catch (e) {}
}