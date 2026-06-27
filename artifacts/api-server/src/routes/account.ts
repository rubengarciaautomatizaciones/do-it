import { Router } from "express";
import { db, userPreferencesTable, tasksTable, habitsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-06-20" });

router.delete("/account", async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });

  try {
    // 1. Cancelar suscripción de Stripe si existe
    const [prefs] = await db.select().from(userPreferencesTable).where(eq(userPreferencesTable.userId, userId));
    if (prefs?.stripeCustomerId) {
      const subscriptions = await stripe.subscriptions.list({ customer: prefs.stripeCustomerId });
      for (const sub of subscriptions.data) {
        await stripe.subscriptions.cancel(sub.id);
      }
    }

    // 2. Borrar usuario de Supabase Auth (usando la Service Role Key)
    const supabaseAdmin = createClient(
      process.env.VITE_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;

    // 3. Limpiar la base de datos por seguridad
    await db.delete(userPreferencesTable).where(eq(userPreferencesTable.userId, userId));
    await db.delete(tasksTable).where(eq(tasksTable.userId, userId));
    await db.delete(habitsTable).where(eq(habitsTable.userId, userId));

    res.status(204).send();
  } catch (error: any) {
    req.log.error({ err: error }, "Error deleting account");
    res.status(500).json({ error: error.message });
  }
});

export default router;