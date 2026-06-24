// artifacts/do-it/src/pages/Profile.tsx
import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BottomTabBar } from '../components/BottomTabBar';
import { LogOut, User, CreditCard, Settings, Bell, HelpCircle, ChevronRight } from 'lucide-react';

function ProfileSection({ title, children }: { title: string, children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">{title}</h3>
      <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100">
        {children}
      </div>
    </div>
  );
}

function ProfileItem({ icon: Icon, label, value, onClick, isDestructive }: { icon: any, label: string, value?: string, onClick?: () => void, isDestructive?: boolean }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${isDestructive ? 'text-red-500' : 'text-gray-900'}`}>
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 opacity-70" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-sm text-gray-400">{value}</span>}
        {!isDestructive && <ChevronRight className="w-4 h-4 text-gray-300" />}
      </div>
    </button>
  );
}

export default function Profile() {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-[100dvh] bg-white pb-32">
      <div className="px-6 pt-12 pb-6 max-w-2xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight text-[#111111] mb-8">Perfil</h1>

        <ProfileSection title="Cuenta">
          <ProfileItem icon={User} label="Email" value={user?.email} />
          <ProfileItem icon={Settings} label="Cambiar contraseña" />
        </ProfileSection>

        <ProfileSection title="Suscripción">
          <ProfileItem icon={CreditCard} label="Estado del plan" value="Gratis" />
          <ProfileItem icon={CreditCard} label="Gestionar suscripción" />
          <ProfileItem icon={CreditCard} label="Restaurar compra" />
        </ProfileSection>

        <ProfileSection title="Personalización">
          <ProfileItem icon={Settings} label="Idioma" value="Español" />
          <ProfileItem icon={Settings} label="Inicio de semana" value="Lunes" />
        </ProfileSection>

        <ProfileSection title="Notificaciones">
          <ProfileItem icon={Bell} label="Recordatorios de tareas" value="Activado" />
          <ProfileItem icon={Bell} label="Recordatorios de hábitos" value="Activado" />
          <ProfileItem icon={Bell} label="Resumen semanal" value="Desactivado" />
        </ProfileSection>

        <ProfileSection title="Soporte">
          <ProfileItem icon={HelpCircle} label="Ayuda / FAQ" />
          <ProfileItem icon={HelpCircle} label="Contactar soporte" />
          <ProfileItem icon={HelpCircle} label="Sugerir una mejora" />
        </ProfileSection>

        <div className="mt-12">
          <button onClick={() => signOut()} className="w-full bg-red-50 text-red-600 rounded-xl py-4 font-medium flex items-center justify-center gap-2 hover:bg-red-100 transition-colors">
            <LogOut className="w-5 h-5" /> Cerrar sesión
          </button>
        </div>
      </div>

      <BottomTabBar />
    </div>
  );
}