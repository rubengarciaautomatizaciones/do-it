import { Router } from "express";
import { db, habitsTable, habitLogsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

router.get("/cron/habits", async (req, res) => {
  // 1. Verificación de seguridad con CRON_SECRET
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    // 2. Obtener la fecha de ayer
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split("T")[0];
    const dayOfWeek = yesterday.getDay(); // 0 = Dom, 1 = Lun...

    // 3. Obtener todos los hábitos y los logs de ayer
    const allHabits = await db.select().from(habitsTable).where(eq(habitsTable.estado, "activo"));
    const yesterdayLogs = await db.select().from(habitLogsTable).where(eq(habitLogsTable.fechaCompletado, yesterdayStr));
    const loggedHabitIds = new Set(yesterdayLogs.map(l => l.habitId));

    // 4. Calcular rachas
    for (const habit of allHabits) {
      const targetDays = habit.targetDays as number[];

      // Si ayer era un día en el que tocaba hacer el hábito
      if (targetDays.includes(dayOfWeek)) {
        const wasCompleted = loggedHabitIds.has(habit.id);
        let newStreak = habit.currentStreak;
        let newBest = habit.bestStreak;

        if (wasCompleted) {
          newStreak += 1;
          if (newStreak > newBest) newBest = newStreak;
        } else {
          newStreak = 0; // Rompió la racha
        }

        // Solo actualizamos si hubo cambios
        if (newStreak !== habit.currentStreak || newBest !== habit.bestStreak) {
          await db.update(habitsTable)
            .set({ currentStreak: newStreak, bestStreak: newBest })
            .where(eq(habitsTable.id, habit.id));
        }
      }
    }

    return res.json({ success: true, message: "Rachas de hábitos actualizadas correctamente." });
  } catch (error: any) {
    req.log.error({ err: error }, "Fallo en el Cron Job de Hábitos");
    return res.status(500).json({ error: error.message });
  }
});

export default router;