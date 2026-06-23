import { pgTable, text, timestamp, uuid, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const habitsTable = pgTable("habits", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: uuid("user_id").notNull(),
  nombre: text("nombre").notNull(),
  frecuencia: text("frecuencia").notNull().default("daily"),
  targetDays: jsonb("target_days").$type<number[]>().default([0, 1, 2, 3, 4, 5, 6]), // 0=Dom, 1=Lun...
  archived: boolean("archived").notNull().default(false),
  currentStreak: integer("current_streak").notNull().default(0),
  bestStreak: integer("best_streak").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const habitLogsTable = pgTable("habit_logs", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  habitId: uuid("habit_id").notNull().references(() => habitsTable.id, { onDelete: "cascade" }),
  fechaCompletado: text("fecha_completado").notNull(),
});

export const insertHabitSchema = createInsertSchema(habitsTable).omit({ id: true, createdAt: true });
export type InsertHabit = z.infer<typeof insertHabitSchema>;
export type Habit = typeof habitsTable.$inferSelect;
export type HabitLog = typeof habitLogsTable.$inferSelect;