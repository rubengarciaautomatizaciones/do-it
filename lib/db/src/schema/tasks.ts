import { pgTable, text, boolean, timestamp, uuid, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const tasksTable = pgTable("tasks", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: uuid("user_id").notNull(),
  titulo: text("titulo").notNull(),
  descripcion: text("descripcion"),
  fechaVencimiento: text("fecha_vencimiento"), // Formato: YYYY-MM-DD
  horaVencimiento: text("hora_vencimiento"), // Formato: HH:mm
  links: jsonb("links").$type<string[]>().default([]), // Array de URLs
  notificaciones: jsonb("notificaciones").$type<string[]>().default([]), 
  completada: boolean("completada").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// NUEVA TABLA: Archivos adjuntos
export const taskAttachmentsTable = pgTable("task_attachments", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  taskId: uuid("task_id").notNull().references(() => tasksTable.id, { onDelete: "cascade" }),
  fileName: text("file_name").notNull(),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({ id: true, createdAt: true });
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
export type TaskAttachment = typeof taskAttachmentsTable.$inferSelect;