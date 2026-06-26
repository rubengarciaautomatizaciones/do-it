import { Router } from "express";
import Stripe from "stripe";
import { eq } from "drizzle-orm";
import { db, userPreferencesTable } from "@workspace/db";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", { apiVersion: "2024-06-20" });

router.post("/stripe/checkout", async (req, res) => {
  const { priceId, userId } = req.body;
  if (!priceId || !userId) return res.status(400).json({ error: "Missing parameters" });

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${process.env.CLIENT_URL}/profile?success=true`,
      cancel_url: `${process.env.CLIENT_URL}/profile?canceled=true`,
      client_reference_id: userId,
      subscription_data: {
        trial_period_days: 7, // Aquí forzamos los 7 días de prueba
      },
    });
    res.json({ url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.post("/stripe/portal", async (req, res) => {
  const { userId } = req.body;
  try {
    const [prefs] = await db.select().from(userPreferencesTable).where(eq(userPreferencesTable.userId, userId));
    if (!prefs?.stripeCustomerId) return res.status(400).json({ error: "No customer ID found" });

    const session = await stripe.billingPortal.sessions.create({
      customer: prefs.stripeCustomerId,
      return_url: `${process.env.CLIENT_URL}/profile`,
    });
    res.json({ url: session.url });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// WEBHOOK: Escucha los eventos de Stripe
router.post("/stripe/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  let event;

  try {
    // req.body aquí debe ser un Buffer (raw), lo configuraremos en app.ts
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET || "");
  } catch (err: any) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const customerId = session.customer as string;

      if (userId) {
        await db.update(userPreferencesTable)
          .set({ isPremium: true, stripeCustomerId: customerId })
          .where(eq(userPreferencesTable.userId, userId));
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const customerId = subscription.customer as string;
      await db.update(userPreferencesTable)
        .set({ isPremium: false })
        .where(eq(userPreferencesTable.stripeCustomerId, customerId));
    }

    res.json({ received: true });
  } catch (err) {
    res.status(500).send("Database error");
  }
});

export default router;