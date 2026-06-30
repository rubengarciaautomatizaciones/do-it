import React, { createContext, useContext, ReactNode } from 'react';
import { useGetPreferences } from '@workspace/api-client-react';

type Language = 'es' | 'en';

const translations = {
  es: {
    // Perfil y Tabs
    "profile.title": "Perfil", "profile.plan.free": "Plan Free", "profile.plan.premium": "Premium", "profile.language": "Idioma", "profile.weekStart": "Inicio de semana", "profile.monday": "Lunes", "profile.sunday": "Domingo", "profile.googleCalendar": "Google Calendar", "profile.connected": "Conectado", "profile.disconnected": "Desconectado", "profile.push": "Notificaciones Push", "profile.changePassword": "Cambiar contraseña", "profile.manageSub": "Gestionar suscripción", "profile.support": "Contactar soporte", "profile.logout": "Cerrar sesión", "profile.deleteAccount": "Eliminar cuenta", "tab.tasks": "Tareas", "tab.habits": "Hábitos", "tab.calendar": "Calendario", "tab.profile": "Perfil",
    // Tareas
    "tasks.title": "Tareas", "tasks.filter.status": "Estado...", "tasks.filter.all": "Todas", "tasks.filter.todo": "Sin Hacer", "tasks.filter.done": "Hechas", "tasks.sort.by": "Ordenar por...", "tasks.sort.manual": "Orden manual", "tasks.sort.date": "Fecha límite", "tasks.sort.recent": "Más recientes", "tasks.sort.old": "Más antiguas", "tasks.sort.mod": "Última modificación", "tasks.sort.project": "Proyecto (A-Z)", "tasks.project.filter": "Proyecto...", "tasks.project.none": "Sin proyecto", "tasks.col.title": "Título", "tasks.col.desc": "Descripción", "tasks.col.limit": "Límite", "tasks.col.notif": "Notificación", "tasks.col.project": "Proyecto", "tasks.col.attach": "Adjuntos",
    // Hábitos
    "habits.title": "Hábitos", "habits.today": "Hoy", "habits.all": "Todos los hábitos", "habits.days.7": "7 días", "habits.days.30": "1 mes", "habits.days.90": "3 meses", "habits.empty": "No hay hábitos activos para este día.", "habits.settings": "Ajustes de Hábitos", "habits.close": "Cerrar", "habits.active": "Activos", "habits.paused": "Pausados", "habits.archived": "Archivados", "habits.cancel": "Cancelar", "habits.edit": "Editar Hábito", "habits.new": "Nuevo Hábito", "habits.name": "Nombre del hábito (ej. Leer)", "habits.goal": "Meta diaria", "habits.bool": "Sí / No", "habits.num": "Numérica", "habits.qty": "Cantidad", "habits.unit": "Unidad (ej. min)", "habits.freq": "Frecuencia", "habits.everyday": "Todos los días", "habits.specific": "Días específicos", "habits.weekly": "Veces por semana", "habits.monthly": "Veces por mes", "habits.target": "Objetivo:", "habits.times": "veces", "habits.start": "Inicio", "habits.alert": "Aviso", "habits.status": "Estado del hábito", "habits.save": "Guardar",
    // Calendario
    "calendar.title": "Calendario", "calendar.connect": "Conectar Google", "calendar.today": "Hoy", "calendar.month": "Mes", "calendar.week": "Semana",
    // Modal Tareas
    "modal.new": "Nueva tarea", "modal.title": "Título de la tarea", "modal.from": "Desde", "modal.to": "hasta", "modal.mins": "minutos", "modal.hours": "horas", "modal.days": "días", "modal.none": "Ninguno", "modal.create": "+ Crear nuevo", "modal.link": "Enlace", "modal.file": "Archivo", "modal.add": "Añadir"
  },
  en: {
    // Profile & Tabs
    "profile.title": "Profile", "profile.plan.free": "Free Plan", "profile.plan.premium": "Premium", "profile.language": "Language", "profile.weekStart": "Week starts on", "profile.monday": "Monday", "profile.sunday": "Sunday", "profile.googleCalendar": "Google Calendar", "profile.connected": "Connected", "profile.disconnected": "Disconnected", "profile.push": "Push Notifications", "profile.changePassword": "Change password", "profile.manageSub": "Manage subscription", "profile.support": "Contact support", "profile.logout": "Log out", "profile.deleteAccount": "Delete account", "tab.tasks": "Tasks", "tab.habits": "Habits", "tab.calendar": "Calendar", "tab.profile": "Profile",
    // Tasks
    "tasks.title": "Tasks", "tasks.filter.status": "Status...", "tasks.filter.all": "All", "tasks.filter.todo": "To Do", "tasks.filter.done": "Done", "tasks.sort.by": "Sort by...", "tasks.sort.manual": "Manual order", "tasks.sort.date": "Due date", "tasks.sort.recent": "Newest", "tasks.sort.old": "Oldest", "tasks.sort.mod": "Last modified", "tasks.sort.project": "Project (A-Z)", "tasks.project.filter": "Project...", "tasks.project.none": "No project", "tasks.col.title": "Title", "tasks.col.desc": "Description", "tasks.col.limit": "Due", "tasks.col.notif": "Notification", "tasks.col.project": "Project", "tasks.col.attach": "Attachments",
    // Habits
    "habits.title": "Habits", "habits.today": "Today", "habits.all": "All habits", "habits.days.7": "7 days", "habits.days.30": "1 month", "habits.days.90": "3 months", "habits.empty": "No active habits for this day.", "habits.settings": "Habit Settings", "habits.close": "Close", "habits.active": "Active", "habits.paused": "Paused", "habits.archived": "Archived", "habits.cancel": "Cancel", "habits.edit": "Edit Habit", "habits.new": "New Habit", "habits.name": "Habit name (e.g. Read)", "habits.goal": "Daily goal", "habits.bool": "Yes / No", "habits.num": "Numeric", "habits.qty": "Amount", "habits.unit": "Unit (e.g. min)", "habits.freq": "Frequency", "habits.everyday": "Every day", "habits.specific": "Specific days", "habits.weekly": "Times per week", "habits.monthly": "Times per month", "habits.target": "Target:", "habits.times": "times", "habits.start": "Start", "habits.alert": "Alert", "habits.status": "Habit status", "habits.save": "Save",
    // Calendar
    "calendar.title": "Calendar", "calendar.connect": "Connect Google", "calendar.today": "Today", "calendar.month": "Month", "calendar.week": "Week",
    // Modal Tasks
    "modal.new": "New task", "modal.title": "Task title", "modal.from": "From", "modal.to": "to", "modal.mins": "minutes", "modal.hours": "hours", "modal.days": "days", "modal.none": "None", "modal.create": "+ Create new", "modal.link": "Link", "modal.file": "File", "modal.add": "Add"
  }
};

type TranslationKey = keyof typeof translations.es;

interface I18nContextType {
  t: (key: TranslationKey) => string;
  lang: Language;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { data: prefs } = useGetPreferences();
  const lang = (prefs?.idioma as Language) || 'es';

  const t = (key: TranslationKey): string => {
    return translations[lang][key] || translations['es'][key] || key;
  };

  return (
    <I18nContext.Provider value={{ t, lang }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useTranslation must be used within I18nProvider');
  return context;
}