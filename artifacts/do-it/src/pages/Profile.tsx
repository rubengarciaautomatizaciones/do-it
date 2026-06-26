import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BottomTabBar } from '../components/BottomTabBar';
import { LogOut, User, CreditCard, Settings, Bell, HelpCircle, ChevronRight, Loader2 } from 'lucide-react';
import { useGetPreferences, useUpdatePreferences, useCreatePortal, getGetPreferencesQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

function ProfileSelectRow({ icon: Icon, label, value, options, onChange }: { icon: any, label: string, value: string, options: {label: string, value: string}[], onChange: (val: string) => void }) {
  return (
    <div className="w-full flex items-center justify-between p-4 bg-white border-b border-gray-50 last:border-0 text-gray-900">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 opacity-70" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-auto h-auto p-0 border-0 bg-transparent shadow-none focus:ring-0 text-sm text-gray-400 [&>svg]:hidden">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end" className="rounded-xl">
          {options.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const { data: prefs, isLoading } = useGetPreferences();
  const updatePrefs = useUpdatePreferences();
  const createPortal = useCreatePortal();

  const handlePrefChange = (key: 'idioma' | 'inicioSemana', value: string) => {
    updatePrefs.mutate({ data: { [key]: value } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetPreferencesQueryKey() })
    });
  };

  const handleManageSubscription = () => {
    if (!user) return;
    createPortal.mutate({ data: { userId: user.id } }, {
      onSuccess: (res) => { 
        if (res.url) window.location.href = res.url; 
      }
    });
  };

  return (
    <div className="min-h-[100dvh] bg-white pb-32">
      <div className="px-6 pt-12 pb-6 max-w-2xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight text-[#111111] mb-8">Perfil</h1>

        <ProfileSection title="Cuenta">
          <ProfileItem icon={User} label="Email" value={user?.email} />
          <ProfileItem icon={Settings} label="Cambiar contraseña" />
        </ProfileSection>

        <ProfileSection title="Suscripción">
          {isLoading ? (
            <div className="p-4 flex justify-center bg-white"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
          ) : (
            <>
              <ProfileItem icon={CreditCard} label="Estado del plan" value={prefs?.isPremium ? "Premium" : "Gratis"} />
              {prefs?.isPremium && (
                <ProfileItem 
                  icon={CreditCard} 
                  label={createPortal.isPending ? "Cargando portal..." : "Gestionar suscripción"} 
                  onClick={handleManageSubscription} 
                />
              )}
              {!prefs?.isPremium && (
                <ProfileItem icon={CreditCard} label="Restaurar compra" />
              )}
            </>
          )}
        </ProfileSection>

        <ProfileSection title="Personalización">
          {isLoading || !prefs ? (
            <div className="p-4 flex justify-center bg-white"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
          ) : (
            <>
              <ProfileSelectRow 
                icon={Settings} label="Idioma" value={prefs.idioma} 
                onChange={(val) => handlePrefChange('idioma', val)}
                options={[{label: 'Español', value: 'es'}, {label: 'English', value: 'en'}]} 
              />
              <ProfileSelectRow 
                icon={Settings} label="Inicio de semana" value={prefs.inicioSemana} 
                onChange={(val) => handlePrefChange('inicioSemana', val)}
                options={[{label: 'Lunes', value: 'lunes'}, {label: 'Domingo', value: 'domingo'}]} 
              />
            </>
          )}
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