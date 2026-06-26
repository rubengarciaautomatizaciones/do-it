import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, userPreferencesTable } from "@workspace/db";
import { UpdatePreferencesBody } from "@workspace/api-zod";

const router = Router();

router.get("/preferences", async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });

  let [prefs] = await db.select().from(userPreferencesTable).where(eq(userPreferencesTable.userId, userId));

  // Si no existen, las creamos por defecto
  if (!prefs) {
    [prefs] = await db.insert(userPreferencesTable).values({ userId }).returning();
  }

  return res.json(prefs);
});

router.patch("/preferences", async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const parsed = UpdatePreferencesBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid body" });

  const [prefs] = await db.update(userPreferencesTable)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(userPreferencesTable.userId, userId))
    .returning();

  return res.json(prefs);
});

export default router;