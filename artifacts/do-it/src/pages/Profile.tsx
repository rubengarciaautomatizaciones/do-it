import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BottomTabBar } from '../components/BottomTabBar';
import { LogOut, CreditCard, Settings, Bell, HelpCircle, ChevronRight, Loader2, Calendar as CalendarIcon, Trash2, Globe, CalendarDays, Download, Share, PlusSquare } from 'lucide-react';
import { useGetPreferences, useUpdatePreferences, useCreatePortal, useDeleteAccount, getGetPreferencesQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { supabase } from '../lib/supabase';
import { useToast } from '../hooks/use-toast';
import { useTranslation } from '../contexts/I18nContext';
import { useIsMobile } from '../hooks/use-mobile';
import { PaywallModal } from '../components/PaywallModal';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) { outputArray[i] = rawData.charCodeAt(i); }
  return outputArray;
}

function ProfileItem({ icon: Icon, label, value, onClick, isDestructive, rightElement }: any) {
  return (
    <button onClick={onClick} disabled={!onClick && !rightElement} className={`w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors border-b border-gray-100 last:border-0 ${isDestructive ? 'text-black font-semibold' : 'text-gray-900'}`}>
      <div className="flex items-center gap-3"><Icon className="w-5 h-5 opacity-70" /><span className="text-[15px]">{label}</span></div>
      <div className="flex items-center gap-2">{value && <span className="text-[15px] text-gray-500 font-medium">{value}</span>}{rightElement ? rightElement : (onClick && <ChevronRight className="w-4 h-4 text-gray-300" />)}</div>
    </button>
  );
}

function ProfileSelectRow({ icon: Icon, label, value, options, onChange }: any) {
  return (
    <div className="w-full flex items-center justify-between p-4 bg-white border-b border-gray-100 last:border-0 text-gray-900">
      <div className="flex items-center gap-3"><Icon className="w-5 h-5 opacity-70" /><span className="text-[15px]">{label}</span></div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-auto h-auto p-0 border-0 bg-transparent shadow-none focus:ring-0 text-[15px] text-gray-500 font-medium [&>svg]:hidden"><SelectValue /></SelectTrigger>
        <SelectContent align="end" className="rounded-xl">{options.map((opt:any) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

export default function Profile() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { data: prefs, isLoading } = useGetPreferences();
  const updatePrefs = useUpdatePreferences();
  const createPortal = useCreatePortal();
  const deleteAccount = useDeleteAccount();

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [supportSubject, setSupportSubject] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [isSendingSupport, setIsSendingSupport] = useState(false);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [isDisconnectingCalendar, setIsDisconnectingCalendar] = useState(false);

  const [pushStatus, setPushStatus] = useState<boolean>(false);
  const [showPaywall, setShowPaywall] = useState(false);

  const [isInstalled, setIsInstalled] = useState(true);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    if (!('Notification' in window)) return;
    setPushStatus(Notification.permission === 'granted');

    if (window.location.search.includes('recovery=true')) {
      setIsRecoveryMode(true);
      setIsPasswordModalOpen(true);
    }

    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    setIsInstalled(checkStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    if (isMobile && !checkStandalone && !sessionStorage.getItem('installPromptDismissed')) {
      setTimeout(() => setShowInstallModal(true), 500);
    }

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, [isMobile]);

  const handleInstallClick = async () => {
    if (isIOS) return;
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setShowInstallModal(false);
      }
      setDeferredPrompt(null);
    }
  };

  const closeInstallModal = () => {
    sessionStorage.setItem('installPromptDismissed', 'true');
    setShowInstallModal(false);
  };

  const handlePrefChange = (key: 'idioma' | 'inicioSemana', value: string) => {
    updatePrefs.mutate({ data: { [key]: value } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetPreferencesQueryKey() }) });
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) return toast({ title: "Error", description: "Mínimo 6 caracteres.", variant: "destructive" });
    setIsUpdatingPassword(true);

    try {
      if (!isRecoveryMode && user?.email) {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
        if (signInError) throw new Error("La contraseña actual es incorrecta.");
      }
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      toast({ title: "Éxito", description: "Contraseña actualizada." });
      setIsPasswordModalOpen(false); setCurrentPassword(''); setNewPassword('');
      if (isRecoveryMode) window.history.replaceState({}, document.title, "/profile");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !deletePassword) return;
    setIsDeleting(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: user.email, password: deletePassword });
      if (signInError) throw new Error("Contraseña incorrecta.");

      deleteAccount.mutate({ params: { userId: user.id } } as any, {
        onSuccess: async () => { await signOut(); window.location.href = '/'; },
        onError: (err: any) => { setIsDeleting(false); toast({ title: "Error", description: err.message, variant: "destructive" }); }
      });
    } catch (error: any) {
      setIsDeleting(false);
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleSendSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !supportSubject || !supportMessage) return;
    setIsSendingSupport(true);

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email, motivo: supportSubject, mensaje: supportMessage })
      });
      if (!res.ok) throw new Error("Fallo al enviar");

      toast({ title: "Mensaje enviado", description: "Te contactaremos pronto." }); 
      setIsSupportModalOpen(false); setSupportSubject(''); setSupportMessage('');
    } catch (error) {
      toast({ title: "Error", description: "No se pudo enviar el mensaje.", variant: "destructive" });
    } finally {
      setIsSendingSupport(false);
    }
  };

  const handleGoogleClick = async () => {
    if (!user) return;

    // BLOQUEO PAYWALL
    if (!prefs?.isPremium && !prefs?.googleRefreshToken) {
      setShowPaywall(true);
      return;
    }

    if (prefs?.googleRefreshToken) {
      setIsCalendarModalOpen(true);
    } else {
      const res = await fetch(`/api/calendar/connect?userId=${user.id}`).then(r => r.json());
      if (res.url) window.location.href = res.url;
    }
  };

  const confirmDisconnectCalendar = async () => {
    if (!user) return;
    setIsDisconnectingCalendar(true);
    try {
      await fetch(`/api/calendar/disconnect`, { method: 'POST', headers: { 'x-user-id': user.id } });
      queryClient.invalidateQueries({ queryKey: getGetPreferencesQueryKey() });
      toast({ title: "Desconectado", description: "Google Calendar ha sido desvinculado." });
      setIsCalendarModalOpen(false);
    } catch (error) {
      toast({ title: "Error", description: "No se pudo desconectar.", variant: "destructive" });
    } finally {
      setIsDisconnectingCalendar(false);
    }
  };

  const handleEnablePush = async (checked: boolean) => {
    if (!checked) return toast({ title: "Aviso", description: "Desactívalo desde los ajustes de tu navegador o sistema operativo." });

    if (!('Notification' in window) || !('serviceWorker' in navigator)) {
      return toast({ title: "Error", description: "Tu navegador no soporta notificaciones Push.", variant: "destructive" });
    }

    if (Notification.permission === 'denied') {
      return toast({ title: "Permiso bloqueado", description: "Has bloqueado las notificaciones. Debes permitirlas en el candado de la barra de direcciones de tu navegador.", variant: "destructive" });
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') { 
        setPushStatus(false); 
        return toast({ title: "Permiso denegado", description: "No podemos enviarte notificaciones sin tu permiso.", variant: "destructive" }); 
      }

      const registration = await navigator.serviceWorker.ready;
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

      if (!vapidKey) throw new Error("Falta la clave VAPID en el servidor.");

      const subscription = await registration.pushManager.subscribe({ 
        userVisibleOnly: true, 
        applicationServerKey: urlBase64ToUint8Array(vapidKey) 
      });

      await fetch('/api/notifications/subscribe', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'x-user-id': user!.id }, 
        body: JSON.stringify({ userId: user!.id, subscription }) 
      });

      setPushStatus(true); 
      toast({ title: "¡Listo!", description: "Notificaciones activadas correctamente." });
    } catch (error: any) { 
      toast({ title: "Error", description: error.message, variant: "destructive" }); 
    }
  };

  const handleManageSubscription = () => {
    if (!user) return;
    createPortal.mutate({ data: { userId: user.id } }, { 
      onSuccess: (res) => { 
        if (res.url) window.location.href = res.url; 
      },
      onError: (err: any) => {
        toast({ title: "No disponible", description: "No tienes una suscripción activa en Stripe asociada a esta cuenta.", variant: "destructive" });
      }
    });
  };

  return (
    <div className="min-h-[100dvh] bg-[#F9FAFB] pb-32">
      <div className="flex flex-col items-center justify-center pt-16 pb-8 px-6">
        <div className="w-20 h-20 bg-black text-white rounded-full flex items-center justify-center text-3xl font-medium mb-4 shadow-sm">{user?.email?.[0]?.toUpperCase() || ''}</div>
        <h2 className="text-xl font-semibold text-gray-900">{user?.email}</h2>
        <span className="mt-2 px-3 py-1 bg-gray-200 text-black text-xs font-semibold tracking-wide uppercase rounded-full">{prefs?.isPremium ? t('profile.plan.premium') : t('profile.plan.free')}</span>
      </div>

      <div className="px-4 md:px-6 max-w-2xl mx-auto space-y-6">

        {isLoading || !prefs ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : (
          <>
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <ProfileSelectRow icon={Globe} label={t('profile.language')} value={prefs.idioma} onChange={(val: string) => handlePrefChange('idioma', val)} options={[{label: 'Español', value: 'es'}, {label: 'English', value: 'en'}]} />
              <ProfileSelectRow icon={CalendarDays} label={t('profile.weekStart')} value={prefs.inicioSemana} onChange={(val: string) => handlePrefChange('inicioSemana', val)} options={[{label: t('profile.monday'), value: 'lunes'}, {label: t('profile.sunday'), value: 'domingo'}]} />
              <button onClick={handleGoogleClick} className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 active:bg-gray-100 transition-colors border-t border-gray-100">
                <div className="flex items-center gap-3"><CalendarIcon className="w-5 h-5 opacity-70" /><span className="text-[15px] text-gray-900">{t('profile.googleCalendar')}</span></div>
                <span className="text-[15px] text-gray-500 font-medium">{prefs.googleRefreshToken ? t('profile.connected') : t('profile.disconnected')}</span>
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              <ProfileItem icon={Bell} label={t('profile.push')} rightElement={<Switch checked={pushStatus} onCheckedChange={handleEnablePush} />} />
              <ProfileItem icon={Settings} label={t('profile.changePassword')} onClick={() => {setIsRecoveryMode(false); setIsPasswordModalOpen(true);}} />
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
              {prefs?.isPremium && <ProfileItem icon={CreditCard} label={createPortal.isPending ? "..." : t('profile.manageSub')} onClick={handleManageSubscription} />}
              <ProfileItem icon={HelpCircle} label={t('profile.support')} onClick={() => setIsSupportModalOpen(true)} />
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm mt-8">
              <ProfileItem icon={LogOut} label={t('profile.logout')} onClick={() => signOut()} isDestructive />
              <ProfileItem icon={Trash2} label={t('profile.deleteAccount')} onClick={() => setIsDeleteModalOpen(true)} isDestructive />
            </div>
          </>
        )}
      </div>

      <Dialog open={showInstallModal} onOpenChange={closeInstallModal}>
        <DialogContent className="bg-white rounded-3xl p-6 sm:max-w-md border-0 shadow-2xl [&>button]:hidden">
          <DialogHeader>
            <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
              <Download className="w-6 h-6" />
            </div>
            <DialogTitle className="text-xl font-semibold text-center text-black">Instala la App</DialogTitle>
            <DialogDescription className="text-center text-gray-500">
              Añade Do it! a tu pantalla de inicio para una experiencia más rápida, a pantalla completa y con notificaciones.
            </DialogDescription>
          </DialogHeader>

          <div className="mt-6">
            {isIOS ? (
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3 text-sm text-gray-600 font-medium">
                <p className="flex items-center gap-2"><span className="w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-black">1</span> Toca el botón <Share className="w-4 h-4 mx-1 text-black" /> en la barra de Safari.</p>
                <p className="flex items-center gap-2"><span className="w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-black">2</span> Selecciona <strong>Añadir a inicio</strong> <PlusSquare className="w-4 h-4 mx-1 text-black" />.</p>
              </div>
            ) : (
              <button onClick={handleInstallClick} className="w-full bg-black text-white rounded-xl py-3.5 font-medium flex justify-center items-center gap-2 active:scale-95 transition-transform shadow-sm">
                Instalar ahora
              </button>
            )}
            <button onClick={closeInstallModal} className="w-full mt-3 text-sm font-medium text-gray-400 hover:text-black transition-colors py-2">
              Quizás más tarde
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCalendarModalOpen} onOpenChange={setIsCalendarModalOpen}>
        <DialogContent className="bg-white rounded-3xl p-6 sm:max-w-md border-0 shadow-2xl [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-black">Desconectar Calendario</DialogTitle>
            <DialogDescription>¿Estás seguro de que quieres desvincular tu cuenta de Google Calendar? Tus tareas dejarán de sincronizarse.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mt-4">
            <button onClick={() => setIsCalendarModalOpen(false)} className="flex-1 bg-gray-100 text-black rounded-xl py-3 font-medium active:scale-95 transition-transform">Cancelar</button>
            <button onClick={confirmDisconnectCalendar} disabled={isDisconnectingCalendar} className="flex-1 bg-black text-white rounded-xl py-3 font-medium disabled:opacity-50 flex justify-center active:scale-95 transition-transform">
              {isDisconnectingCalendar ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Desconectar'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isPasswordModalOpen} onOpenChange={(open) => {setIsPasswordModalOpen(open); if(!open && isRecoveryMode) window.history.replaceState({}, document.title, "/profile");}}>
        <DialogContent className="bg-white rounded-3xl p-6 sm:max-w-md border-0 shadow-2xl [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-black">Cambiar contraseña</DialogTitle>
            <DialogDescription>{isRecoveryMode ? 'Ingresa tu nueva contraseña.' : 'Por seguridad, ingresa tu contraseña actual.'}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdatePassword} className="space-y-4 mt-4">
            {!isRecoveryMode && (
              <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="Contraseña actual" className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-black" />
            )}
            <input type="password" required value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nueva contraseña" className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-black" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsPasswordModalOpen(false)} className="flex-1 bg-gray-100 text-black rounded-xl py-3 font-medium active:scale-95 transition-transform">Cancelar</button>
              <button type="submit" disabled={isUpdatingPassword} className="flex-1 bg-black text-white rounded-xl py-3 font-medium disabled:opacity-50 flex justify-center active:scale-95 transition-transform">{isUpdatingPassword ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Actualizar'}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="bg-white rounded-3xl p-6 sm:max-w-md border-0 shadow-2xl [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-black">Eliminar cuenta</DialogTitle>
            <DialogDescription>Esta acción es irreversible. Ingresa tu contraseña para confirmar.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleDeleteAccount} className="space-y-4 mt-4">
            <input type="password" required value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Tu contraseña" className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-black" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsDeleteModalOpen(false)} className="flex-1 bg-gray-100 text-black rounded-xl py-3 font-medium active:scale-95 transition-transform">Cancelar</button>
              <button type="submit" disabled={isDeleting || !deletePassword} className="flex-1 bg-black text-white rounded-xl py-3 font-medium disabled:opacity-50 flex justify-center active:scale-95 transition-transform">{isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Eliminar'}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isSupportModalOpen} onOpenChange={setIsSupportModalOpen}>
        <DialogContent className="bg-white rounded-3xl p-6 sm:max-w-md border-0 shadow-2xl [&>button]:hidden">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-black">Contactar Soporte</DialogTitle>
            <DialogDescription>Te responderemos a {user?.email}.</DialogDescription>
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
            <textarea required value={supportMessage} onChange={(e) => setSupportMessage(e.target.value)} placeholder="Describe los detalles aquí..." className="w-full bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-black min-h-[120px] resize-none" />
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsSupportModalOpen(false)} className="flex-1 bg-gray-100 text-black rounded-xl py-3 font-medium active:scale-95 transition-transform">Cancelar</button>
              <button type="submit" disabled={isSendingSupport || !supportSubject || !supportMessage} className="flex-1 bg-black text-white rounded-xl py-3 font-medium disabled:opacity-50 flex justify-center active:scale-95 transition-transform">{isSendingSupport ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar'}</button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />
      <BottomTabBar />
    </div>
  );
}