import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BottomTabBar } from '../components/BottomTabBar';
import { LogOut, User, CreditCard, Settings, Bell, HelpCircle, ChevronRight, Loader2, Calendar as CalendarIcon, Trash2 } from 'lucide-react';
import { useGetPreferences, useUpdatePreferences, useCreatePortal, useDeleteAccount, getGetPreferencesQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/use-toast';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function ProfileItem({ icon: Icon, label, value, onClick, isDestructive, rightElement }: { icon: any, label: string, value?: string, onClick?: () => void, isDestructive?: boolean, rightElement?: React.ReactNode }) {
  return (
    <button onClick={onClick} disabled={!onClick && !rightElement} className={`w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0 ${isDestructive ? 'text-black font-semibold' : 'text-gray-900'}`}>
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 opacity-70" />
        <span className="text-[15px]">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value && <span className="text-[15px] text-gray-400">{value}</span>}
        {rightElement ? rightElement : (onClick && !isDestructive && <ChevronRight className="w-4 h-4 text-gray-300" />)}
      </div>
    </button>
  );
}

function ProfileSelectRow({ icon: Icon, label, value, options, onChange }: { icon: any, label: string, value: string, options: {label: string, value: string}[], onChange: (val: string) => void }) {
  return (
    <div className="w-full flex items-center justify-between p-4 bg-white border-b border-gray-100 last:border-0 text-gray-900">
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 opacity-70" />
        <span className="text-[15px]">{label}</span>
      </div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-auto h-auto p-0 border-0 bg-transparent shadow-none focus:ring-0 text-[15px] text-gray-400 [&>svg]:hidden">
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
  const deleteAccount = useDeleteAccount();

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSendingSupport, setIsSendingSupport] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [pushStatus, setPushStatus] = useState<boolean>(false);

  useEffect(() => {
    if (!('Notification' in window)) return;
    setPushStatus(Notification.permission === 'granted');
  }, []);

  const handlePrefChange = (key: 'idioma' | 'inicioSemana', value: string) => {
    updatePrefs.mutate({ data: { [key]: value } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetPreferencesQueryKey() }) });
  };

  const handleManageSubscription = () => {
    if (!user) return;
    createPortal.mutate({ data: { userId: user.id } }, { onSuccess: (res) => { if (res.url) window.location.href = res.url; } });
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
    if (!newPassword || newPassword.length < 6) return toast({ title: "Error", description: "La contraseña debe tener al menos 6 caracteres.", variant: "destructive" });
    setIsUpdatingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsUpdatingPassword(false);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Éxito", description: "Contraseña actualizada correctamente." }); setIsPasswordModalOpen(false); setNewPassword(''); }
  };

  const handleSendSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supportSubject || !supportMessage) return;
    setIsSendingSupport(true);
    const { error } = await supabase.from('support_tickets').insert({ user_id: user.id, email: user.email, motivo: supportSubject, mensaje: supportMessage });
    setIsSendingSupport(false);
    if (error) toast({ title: "Error", description: "No se pudo enviar el mensaje.", variant: "destructive" });
    else { toast({ title: "Mensaje enviado", description: "Te contactaremos pronto a tu email." }); setIsSupportModalOpen(false); setSupportSubject(''); setSupportMessage(''); }
  };

  const handleEnablePush = async (checked: boolean) => {
    if (!checked) return toast({ title: "Aviso", description: "Para desactivar las notificaciones, hazlo desde los ajustes de tu dispositivo." });
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return toast({ title: "Error", description: "Tu dispositivo no soporta notificaciones Push.", variant: "destructive" });
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      setPushStatus(false);
      return toast({ title: "Permiso denegado", description: "Debes permitir las notificaciones en los ajustes de tu móvil.", variant: "destructive" });
    }
    try {
      toast({ title: "Activando...", description: "Conectando con el servidor." });
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY) });
      await fetch('/api/notifications/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user-id': user!.id }, body: JSON.stringify({ userId: user!.id, subscription }) });
      setPushStatus(true);
      toast({ title: "¡Listo!", description: "Recibirás notificaciones de tus tareas." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (deleteConfirmText !== 'ELIMINAR' || !user) return;
    setIsDeleting(true);
    deleteAccount.mutate({ params: { userId: user.id } } as any, {
      onSuccess: async () => { await signOut(); window.location.href = '/'; },
      onError: (err: any) => { setIsDeleting(false); toast({ title: "Error", description: err.message, variant: "destructive" }); }
    });
  };

  return (
    <div className="min-h-[100dvh] bg-[#F9FAFB] pb-32">

      {/* HERO SECTION (iOS Style) */}
      <div className="flex flex-col items-center justify-center pt-16 pb-8 px-6">
        <div className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center text-3xl font-medium mb-4 shadow-sm">
          {user?.email?.[0]?.toUpperCase() || ''}
        </div>
        <h2 className="text-xl font-semibold text-gray-900">{user?.email}</h2>
        <span className="mt-2 px-3 py-1 bg-gray-200 text-black text-xs font-semibold tracking-wide uppercase rounded-full">
          {prefs?.isPremium ? 'Premium' : 'Plan Free'}
        </span>
      </div>

      <div className="px-4 md:px-6 max-w-2xl mx-auto space-y-6">

        {/* BLOQUE 1: General */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {isLoading || !prefs ? (
            <div className="p-4 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
          ) : (
            <>
              <ProfileSelectRow icon={Settings} label="Idioma" value={prefs.idioma} onChange={(val) => handlePrefChange('idioma', val)} options={[{label: 'Español', value: 'es'}, {label: 'English', value: 'en'}]} />
              <ProfileSelectRow icon={Settings} label="Inicio de semana" value={prefs.inicioSemana} onChange={(val) => handlePrefChange('inicioSemana', val)} options={[{label: 'Lunes', value: 'lunes'}, {label: 'Domingo', value: 'domingo'}]} />
              <ProfileItem icon={CalendarIcon} label="Google Calendar" value={prefs.googleRefreshToken ? "Conectado" : "Desconectado"} onClick={handleGoogleConnect} />
            </>
          )}
        </div>

        {/* BLOQUE 2: Seguridad y Notificaciones */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <ProfileItem icon={Bell} label="Notificaciones Push" rightElement={<Switch checked={pushStatus} onCheckedChange={handleEnablePush} />} />
          <ProfileItem icon={Settings} label="Cambiar contraseña" onClick={() => setIsPasswordModalOpen(true)} />
        </div>

        {/* BLOQUE 3: Soporte y Suscripción */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          {prefs?.isPremium && <ProfileItem icon={CreditCard} label={createPortal.isPending ? "Cargando..." : "Gestionar suscripción"} onClick={handleManageSubscription} />}
          <ProfileItem icon={HelpCircle} label="Contactar soporte" onClick={() => setIsSupportModalOpen(true)} />
        </div>

        {/* BLOQUE 4: Zona de Peligro */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm mt-8">
          <ProfileItem icon={LogOut} label="Cerrar sesión" onClick={() => signOut()} />
          <ProfileItem icon={Trash2} label="Eliminar cuenta" onClick={() => setIsDeleteModalOpen(true)} isDestructive />
        </div>

      </div>

      {/* Modales (Mismo código interno, pero con botones negros) */}
      <Dialog open={isPasswordModalOpen} onOpenChange={setIsPasswordModalOpen}>
        <DialogContent className="bg-white rounded-3xl p-6 sm:max-w-md border-0 shadow-2xl [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Cambiar contraseña</DialogTitle>
            <DialogDescription>Ingresa tu nueva contraseña (mínimo 6 caracteres).</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePassword} className="space-y-4 mt-4">
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nueva contraseña" className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-black" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="flex-1 bg-gray-100 text-black rounded-xl py-3 font-medium">Cancelar</button>
              <button type="submit" disabled={isUpdatingPassword} className="flex-1 bg-black text-white rounded-xl py-3 font-medium disabled:opacity-50 flex justify-center">{isUpdatingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Actualizar'}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isSupportModalOpen} onOpenChange={setIsSupportModalOpen}>
        <DialogContent className="bg-white rounded-3xl p-6 sm:max-w-md border-0 shadow-2xl [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">Contactar Soporte</DialogTitle>
            <DialogDescription>Cuéntanos tu problema o sugerencia. Te responderemos a {user?.email}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSendSupport} className="space-y-4 mt-4">
            <Select value={supportSubject} onValueChange={setSupportSubject}>
              <SelectTrigger className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 h-auto text-sm focus:ring-1 focus:ring-black"><SelectValue placeholder="Selecciona un motivo..." /></SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="bug">Reportar un error</SelectItem>
                <SelectItem value="billing">Problema con pagos/suscripción</SelectItem>
                <SelectItem value="feature">Sugerir una mejora</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
            <textarea value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} placeholder="Describe los detalles aquí..." className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-black min-h-[120px] resize-none" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsSupportModalOpen(false)} className="flex-1 bg-gray-100 text-black rounded-xl py-3 font-medium">Cancelar</button>
              <button type="submit" disabled={isSendingSupport || !supportSubject || !supportMessage} className="flex-1 bg-black text-white rounded-xl py-3 font-medium disabled:opacity-50 flex justify-center">{isSendingSupport ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar'}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="bg-white rounded-3xl p-6 sm:max-w-md border-0 shadow-2xl [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-black">Eliminar cuenta</DialogTitle>
            <DialogDescription>Esta acción es irreversible. Se cancelará tu suscripción y se borrarán todos tus datos.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDeleteAccount} className="space-y-4 mt-4">
            <p className="text-sm text-gray-600">Escribe <strong>ELIMINAR</strong> para confirmar:</p>
            <input type="text" value={deleteConfirmText} onChange={(e) => setDeleteConfirmText(e.target.value)} placeholder="ELIMINAR" className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-black" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="flex-1 bg-gray-100 text-black rounded-xl py-3 font-medium">Cancelar</button>
              <button type="submit" disabled={isDeleting || deleteConfirmText !== 'ELIMINAR'} className="flex-1 bg-black text-white rounded-xl py-3 font-medium disabled:opacity-50 flex justify-center">{isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Eliminar'}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <BottomTabBar />
    </div>
  );
}