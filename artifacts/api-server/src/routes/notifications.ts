import { Router } from "express";
import { db, pushSubscriptionsTable, tasksTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import webpush from "web-push";

const router = Router();

// Configurar las llaves VAPID
if (process.env.VITE_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:soporte@doit.com',
    process.env.VITE_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// 1. Endpoint para que el móvil se suscriba
router.post("/notifications/subscribe", async (req, res) => {
  const { userId, subscription } = req.body;
  if (!userId || !subscription) return res.status(400).json({ error: "Missing data" });

  try {
    const existing = await db.select().from(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.endpoint, subscription.endpoint));

    if (existing.length === 0) {
      await db.insert(pushSubscriptionsTable).values({
        userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Endpoint que llama QStash a la hora exacta
router.post("/notifications/send", async (req, res) => {
  // Verificamos que la llamada viene de nuestro QStash (usando el CRON_SECRET)
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const { taskId, userId } = req.body;
  if (!taskId || !userId) return res.status(400).json({ error: "Missing data" });

  try {
    const [task] = await db.select().from(tasksTable).where(eq(tasksTable.id, taskId));

    // Si la tarea ya se completó o se borró, ignoramos la notificación
    if (!task || task.completada) return res.json({ success: true, message: "Ignored" });

    const subs = await db.select().from(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.userId, userId));

    const payload = JSON.stringify({
      title: "Recordatorio: " + task.titulo,
      body: task.descripcion || "Tienes una tarea pendiente.",
      url: "/tasks"
    });

    // Enviamos el Push a todos los dispositivos del usuario (Móvil, PC, iPad...)
    for (const sub of subs) {
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth }
        }, payload);
      } catch (err: any) {
        // Si el usuario revocó el permiso, borramos la suscripción de la BD
        if (err.statusCode === 410 || err.statusCode === 404) {
          await db.delete(pushSubscriptionsTable).where(eq(pushSubscriptionsTable.id, sub.id));
        }
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;