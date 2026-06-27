import { pgTable, text, timestamp, uuid, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const habitsTable = pgTable("habits", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: uuid("user_id").notNull(),
  nombre: text("nombre").notNull(),
  descripcion: text("descripcion"),
  tipoMeta: text("tipo_meta").notNull().default("boolean"), // 'boolean' | 'numeric'
  metaNumero: integer("meta_numero").notNull().default(1),
  unidad: text("unidad"), // ej. 'vasos', 'páginas'
  frecuenciaTipo: text("frecuencia_tipo").notNull().default("diario"), // 'diario' | 'dias_especificos' | 'semanal' | 'mensual'
  frecuenciaValor: jsonb("frecuencia_valor").$type<number[]>().default([0, 1, 2, 3, 4, 5, 6]),
  recordatorioHora: text("recordatorio_hora"),
  fechaInicio: text("fecha_inicio").notNull(),
  fechaFin: text("fecha_fin"),
  estado: text("estado").notNull().default("activo"), // 'activo' | 'pausado' | 'archivado'
  qstashMessageId: text("qstash_message_id"),
  currentStreak: integer("current_streak").notNull().default(0),
  bestStreak: integer("best_streak").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const habitLogsTable = pgTable("habit_logs", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  habitId: uuid("habit_id").notNull().references(() => habitsTable.id, { onDelete: "cascade" }),
  fechaCompletado: text("fecha_completado").notNull(),
  valor: integer("valor").notNull().default(1), // Cuánto hizo ese día (ej. 4 vasos)
});

export const insertHabitSchema = createInsertSchema(habitsTable).omit({ id: true, createdAt: true });
export type InsertHabit = z.infer<typeof insertHabitSchema>;
export type Habit = typeof habitsTable.$inferSelect;
export type HabitLog = typeof habitLogsTable.$inferSelect;