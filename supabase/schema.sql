-- Do it PWA - Supabase Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descripcion TEXT,
  fecha_vencimiento TEXT,
  hora_inicio TEXT,
  hora_vencimiento TEXT,
  fecha_notificacion TEXT,
  hora_notificacion TEXT,
  proyecto TEXT,
  orden INTEGER DEFAULT 0,
  links JSONB DEFAULT '[]'::jsonb,
  notificaciones JSONB DEFAULT '[]'::jsonb,
  completada BOOLEAN NOT NULL DEFAULT FALSE,
  google_event_id TEXT,
  qstash_message_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Task Attachments table
CREATE TABLE IF NOT EXISTS task_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habits table
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  tipo_meta TEXT NOT NULL DEFAULT 'boolean',
  meta_numero INTEGER NOT NULL DEFAULT 1,
  unidad TEXT,
  frecuencia_tipo TEXT NOT NULL DEFAULT 'diario',
  frecuencia_valor JSONB DEFAULT '[0, 1, 2, 3, 4, 5, 6]'::jsonb,
  recordatorio_hora TEXT,
  fecha_inicio TEXT NOT NULL,
  fecha_fin TEXT,
  estado TEXT NOT NULL DEFAULT 'activo',
  qstash_message_id TEXT,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Habit logs table
CREATE TABLE IF NOT EXISTS habit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  habit_id UUID NOT NULL REFERENCES habits(id) ON DELETE CASCADE,
  fecha_completado TEXT NOT NULL,
  valor INTEGER NOT NULL DEFAULT 1
);

-- User Preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  idioma TEXT NOT NULL DEFAULT 'es',
  inicio_semana TEXT NOT NULL DEFAULT 'lunes',
  has_seen_tutorial BOOLEAN NOT NULL DEFAULT FALSE,
  is_premium BOOLEAN NOT NULL DEFAULT FALSE,
  ai_usage_count INTEGER NOT NULL DEFAULT 0,
  ai_usage_reset_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  stripe_customer_id TEXT,
  google_refresh_token TEXT,
  google_calendar_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Push Subscriptions table
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Support Tickets table (NUEVA)
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  motivo TEXT NOT NULL,
  mensaje TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE habit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Tasks RLS policies
CREATE POLICY "Users can view own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

-- Task Attachments RLS policies
CREATE POLICY "Users can view own task attachments" ON task_attachments FOR SELECT USING (
  EXISTS (SELECT 1 FROM tasks WHERE id = task_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert own task attachments" ON task_attachments FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM tasks WHERE id = task_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete own task attachments" ON task_attachments FOR DELETE USING (
  EXISTS (SELECT 1 FROM tasks WHERE id = task_id AND user_id = auth.uid())
);

-- Habits RLS policies
CREATE POLICY "Users can view own habits" ON habits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own habits" ON habits FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own habits" ON habits FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habits" ON habits FOR DELETE USING (auth.uid() = user_id);

-- Habit logs RLS policies
CREATE POLICY "Users can view own habit logs" ON habit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM habits WHERE id = habit_id AND user_id = auth.uid())
);
CREATE POLICY "Users can insert own habit logs" ON habit_logs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM habits WHERE id = habit_id AND user_id = auth.uid())
);
CREATE POLICY "Users can update own habit logs" ON habit_logs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM habits WHERE id = habit_id AND user_id = auth.uid())
);
CREATE POLICY "Users can delete own habit logs" ON habit_logs FOR DELETE USING (
  EXISTS (SELECT 1 FROM habits WHERE id = habit_id AND user_id = auth.uid())
);

-- User Preferences RLS policies
CREATE POLICY "Users can view own preferences" ON user_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own preferences" ON user_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own preferences" ON user_preferences FOR UPDATE USING (auth.uid() = user_id);

-- Push Subscriptions RLS policies
CREATE POLICY "Users can view own push subscriptions" ON push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own push subscriptions" ON push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own push subscriptions" ON push_subscriptions FOR DELETE USING (auth.uid() = user_id);

-- Support Tickets RLS policies
CREATE POLICY "Users can view own tickets" ON support_tickets FOR SELECT USING (auth.uid() = user_id);