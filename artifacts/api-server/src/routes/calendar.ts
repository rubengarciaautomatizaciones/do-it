import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, userPreferencesTable } from "@workspace/db";
import { getGoogleAuthUrl, handleGoogleCallback } from "../lib/google-calendar";

const router = Router();

router.get("/calendar/connect", (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });

  const url = getGoogleAuthUrl(userId);
  res.json({ url });
});

router.get("/calendar/callback", async (req, res) => {
  const code = req.query.code as string;
  const userId = req.query.state as string; // Recuperamos el userId que enviamos en el state

  if (!code || !userId) {
    return res.redirect(`${process.env.CLIENT_URL}/profile?calendar=error`);
  }

  try {
    await handleGoogleCallback(code, userId);
    res.redirect(`${process.env.CLIENT_URL}/profile?calendar=success`);
  } catch (error) {
    console.error("Google Callback Error:", error);
    res.redirect(`${process.env.CLIENT_URL}/profile?calendar=error`);
  }
});

router.post("/calendar/disconnect", async (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) return res.status(400).json({ error: "userId required" });

  await db.update(userPreferencesTable)
    .set({ googleRefreshToken: null, googleCalendarId: null })
    .where(eq(userPreferencesTable.userId, userId));

  res.json({ success: true });
});

export default router;