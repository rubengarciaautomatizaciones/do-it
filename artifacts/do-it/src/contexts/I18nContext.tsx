import React, { createContext, useContext, ReactNode } from 'react';
import { useGetPreferences } from '@workspace/api-client-react';

type Language = 'es' | 'en';

const translations = {
  es: {
    "profile.title": "Perfil",
    "profile.plan.free": "Plan Free",
    "profile.plan.premium": "Premium",
    "profile.language": "Idioma",
    "profile.weekStart": "Inicio de semana",
    "profile.monday": "Lunes",
    "profile.sunday": "Domingo",
    "profile.googleCalendar": "Google Calendar",
    "profile.connected": "Conectado",
    "profile.disconnected": "Desconectado",
    "profile.push": "Notificaciones Push",
    "profile.changePassword": "Cambiar contraseña",
    "profile.manageSub": "Gestionar suscripción",
    "profile.support": "Contactar soporte",
    "profile.logout": "Cerrar sesión",
    "profile.deleteAccount": "Eliminar cuenta",
    "tab.tasks": "Tareas",
    "tab.habits": "Hábitos",
    "tab.calendar": "Calendario",
    "tab.profile": "Perfil"
  },
  en: {
    "profile.title": "Profile",
    "profile.plan.free": "Free Plan",
    "profile.plan.premium": "Premium",
    "profile.language": "Language",
    "profile.weekStart": "Week starts on",
    "profile.monday": "Monday",
    "profile.sunday": "Sunday",
    "profile.googleCalendar": "Google Calendar",
    "profile.connected": "Connected",
    "profile.disconnected": "Disconnected",
    "profile.push": "Push Notifications",
    "profile.changePassword": "Change password",
    "profile.manageSub": "Manage subscription",
    "profile.support": "Contact support",
    "profile.logout": "Log out",
    "profile.deleteAccount": "Delete account",
    "tab.tasks": "Tasks",
    "tab.habits": "Habits",
    "tab.calendar": "Calendar",
    "tab.profile": "Profile"
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