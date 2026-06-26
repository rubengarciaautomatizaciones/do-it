import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BottomTabBar } from '../components/BottomTabBar';
import { LogOut, User, CreditCard, Settings, Bell, HelpCircle, ChevronRight, Loader2, Calendar as CalendarIcon } from 'lucide-react';
import { useGetPreferences, useUpdatePreferences, useCreatePortal, getGetPreferencesQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/use-toast';

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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: prefs, isLoading } = useGetPreferences();
  const updatePrefs = useUpdatePreferences();
  const createPortal = useCreatePortal();

  // Estados para Modales
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSendingSupport, setIsSendingSupport] = useState(false);

  // Capturar el resultado de Google Calendar al volver
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('calendar') === 'success') {
      toast({ title: "¡Conectado!", description: "Google Calendar sincronizado correctamente." });
      // Limpiamos la URL para que no se quede el ?calendar=success
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (params.get('calendar') === 'error') {
      toast({ title: "Error", description: "No se pudo conectar con Google Calendar.", variant: "destructive" });
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [toast]);

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

  const handleGoogleConnect = async () => {
    if (!user) return;
    if (prefs?.googleRefreshToken) {
      await fetch(`/api/calendar/disconnect`, { method: 'POST', headers: { 'x-user-id': user.id } });
      queryClient.invalidateQueries({ queryKey: getGetPreferencesQueryKey() });
      toast({ title: "Desconectado", description: "Google Calendar ha sido desvinculado." });
    } else {
      const res = await fetch(`/api/calendar/connect?userId=${user.id}`).then(r => r.json());
      if (res.url) window.location.href = res.url;
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      return toast({ title: "Error", description: "La contraseña debe tener al menos 6 caracteres.", variant: "destructive" });
    }
    setIsUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsUpdatingPassword(false);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Éxito", description: "Contraseña actualizada correctamente." });
      setIsPasswordModalOpen(false);
      setNewPassword('');
    }
  };

  const handleSendSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supportSubject || !supportMessage) return;

    setIsSendingSupport(true);
    const { error } = await supabase.from('support_tickets').insert({
      user_id: user.id,
      email: user.email,
      motivo: supportSubject,
      mensaje: supportMessage
    });
    setIsSendingSupport(false);

    if (error) {
      toast({ title: "Error", description: "No se pudo enviar el mensaje.", variant: "destructive" });
    } else {
      toast({ title: "Mensaje enviado", description: "Te contactaremos pronto a tu email." });
      setIsSupportModalOpen(false);
      setSupportSubject('');
      setSupportMessage('');
    }
  };

  return (
    <div className="min-h-[100dvh] bg-white pb-32">
      <div className="px-6 pt-12 pb-6 max-w-2xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight text-[#111111] mb-8">Perfil</h1>

        <ProfileSection title="Cuenta">
          <ProfileItem icon={User} label="Email" value={user?.email} />
          <ProfileItem icon={Settings} label="Cambiar contraseña" onClick={() => setIsPasswordModalOpen(true)} />
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
              <ProfileItem 
                icon={CalendarIcon} 
                label="Google Calendar" 
                value={prefs.googleRefreshToken ? "Conectado" : "Desconectado"} 
                onClick={handleGoogleConnect} 
              />
            </>
          )}
        </ProfileSection>

        <ProfileSection title="Soporte">
          <ProfileItem icon={HelpCircle} label="Contactar soporte" onClick={() => setIsSupportModalOpen(true)} />
        </ProfileSection>

        <div className="mt-12">
          <button onClick={() => signOut()} className="w-full bg-red-50 text-red-600 rounded-xl py-4 font-medium flex items-center justify-center gap-2 hover:bg-red-100 transition-colors">
            <LogOut className="w-5 h-5" /> Cerrar sesión
          </button>
        </div>
      </div>

      {/* Modal Cambiar Contraseña */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="bg-white rounded-3xl p-6 sm:max-w-md border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Cambiar contraseña</DialogTitle>
            <DialogDescription>Ingresa tu nueva contraseña (mínimo 6 caracteres).</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePassword} className="space-y-4 mt-4">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nueva contraseña"
              className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-black"
            />
            <button type="submit" disabled={isUpdatingPassword} className="w-full bg-black text-white rounded-xl py-3 font-medium disabled:opacity-50 flex justify-center">
              {isUpdatingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Actualizar'}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Soporte Técnico */}
      <Dialog open={isSupportModalOpen} onOpenChange={setIsSupportModalOpen}>
        <DialogContent className="bg-white rounded-3xl p-6 sm:max-w-md border-0 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Contactar Soporte</DialogTitle>
            <DialogDescription>Cuéntanos tu problema o sugerencia. Te responderemos a {user?.email}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendSupport} className="space-y-4 mt-4">
            <Select value={supportSubject} onValueChange={setSupportSubject}>
              <SelectTrigger className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 h-auto text-sm focus:ring-1 focus:ring-black">
                <SelectValue placeholder="Selecciona un motivo..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="bug">Reportar un error</SelectItem>
                <SelectItem value="billing">Problema con pagos/suscripción</SelectItem>
                <SelectItem value="feature">Sugerir una mejora</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
            <textarea
              value={supportMessage}
              onChange={(e) => setSupportMessage(e.target.value)}
              placeholder="Describe los detalles aquí..."
              className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-black min-h-[120px] resize-none"
            />
            <button type="submit" disabled={isSendingSupport || !supportSubject || !supportMessage} className="w-full bg-black text-white rounded-xl py-3 font-medium disabled:opacity-50 flex justify-center">
              {isSendingSupport ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar mensaje'}
            </button>
          </form>
        </DialogContent>
      </Dialog>

      <BottomTabBar />
    </div>
  );
}