import { pgTable, text, timestamp, uuid, boolean, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userPreferencesTable = pgTable("user_preferences", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: uuid("user_id").notNull().unique(),
  idioma: text("idioma").notNull().default("es"),
  inicioSemana: text("inicio_semana").notNull().default("lunes"),
  hasSeenTutorial: boolean("has_seen_tutorial").notNull().default(false), // <-- NUEVO
  isPremium: boolean("is_premium").notNull().default(false),
  aiUsageCount: integer("ai_usage_count").notNull().default(0),
  aiUsageResetDate: timestamp("ai_usage_reset_date").notNull().defaultNow(),
  stripeCustomerId: text("stripe_customer_id"),
  googleRefreshToken: text("google_refresh_token"), // <-- NUEVO
  googleCalendarId: text("google_calendar_id"),     // <-- NUEVO
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertUserPreferenceSchema = createInsertSchema(userPreferencesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertUserPreference = z.infer<typeof insertUserPreferenceSchema>;
export type UserPreference = typeof userPreferencesTable.$inferSelect;

export const pushSubscriptionsTable = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: uuid("user_id").notNull(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});