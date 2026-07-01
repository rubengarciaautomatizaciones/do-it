import React, { useState, useRef, useEffect } from 'react';
import { useUpdateTask, useCreateTask, useDeleteTask, useAddTaskAttachment, useGetTaskMetadata, useGetTasks, getGetTasksQueryKey, Task, useGetPreferences } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link as LinkIcon, Plus, Mic, X, Folder, Loader2, Trash2, Check, Repeat } from 'lucide-react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { RichTextEditor } from './RichTextEditor';
import { Checkbox } from './TaskItem';
import { Document, Page, pdfjs } from 'react-pdf';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../contexts/I18nContext';
import { PaywallModal } from './PaywallModal';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function getAbsoluteNotifTime(fechaDesde: string | null, horaDesde: string | null, value: number, unit: string) {
  if (!fechaDesde || value <= 0) return { fechaNotificacion: null, horaNotificacion: null };
  const baseDate = new Date(`${fechaDesde}T${horaDesde || '00:00'}:00`);
  let offsetMs = 0;
  if (unit === 'minutos') offsetMs = value * 60 * 1000;
  if (unit === 'horas') offsetMs = value * 60 * 60 * 1000;
  if (unit === 'dias') offsetMs = value * 24 * 60 * 60 * 1000;
  const notifDate = new Date(baseDate.getTime() - offsetMs);
  return { fechaNotificacion: format(notifDate, 'yyyy-MM-dd'), horaNotificacion: format(notifDate, 'HH:mm') };
}

function getRelativeNotif(fechaDesde: string | null, horaDesde: string | null, fechaNotif: string | null, horaNotif: string | null) {
  if (!fechaDesde || !fechaNotif) return { value: '', unit: 'minutos' };
  const baseDate = new Date(`${fechaDesde}T${horaDesde || '00:00'}:00`);
  const notifDate = new Date(`${fechaNotif}T${horaNotif || '00:00'}:00`);
  const diffMs = baseDate.getTime() - notifDate.getTime();
  if (diffMs <= 0) return { value: '', unit: 'minutos' };
  const diffMins = Math.round(diffMs / (60 * 1000));
  if (diffMins % (24 * 60) === 0) return { value: (diffMins / (24 * 60)).toString(), unit: 'dias' };
  if (diffMins % 60 === 0) return { value: (diffMins / 60).toString(), unit: 'horas' };
  return { value: diffMins.toString(), unit: 'minutos' };
}

function LinkPreview({ url, onRemove }: { url: string, onRemove: () => void }) {
  const { data, isLoading } = useGetTaskMetadata({ url });
  const hostname = new URL(url).hostname.replace('www.', '');
  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex flex-col bg-gray-50 rounded-xl border border-gray-100 overflow-hidden relative group/link transition-all hover:shadow-md cursor-pointer block">
      {isLoading ? <div className="w-full aspect-square bg-gray-200 animate-pulse flex items-center justify-center shrink-0"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div> : data?.image ? <div className="w-full aspect-square bg-gray-200 relative overflow-hidden shrink-0"><img src={data.image} alt="preview" className="absolute inset-0 w-full h-full object-cover" /></div> : <div className="w-full aspect-square bg-gray-100 flex items-center justify-center shrink-0"><LinkIcon className="w-8 h-8 text-gray-300" /></div>}
      <div className="p-3 bg-white flex-1">
        <p className="text-sm font-medium text-gray-900 line-clamp-1">{data?.title || url}</p>
        {data?.description && <p className="text-xs text-gray-500 line-clamp-2 mt-1">{data.description}</p>}
        <p className="text-[10px] text-gray-400 mt-2 uppercase font-semibold tracking-wider">{hostname}</p>
      </div>
      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }} className="absolute top-2 right-2 z-10 p-1.5 text-gray-500 hover:text-black hover:bg-white/90 rounded-full bg-white/50 backdrop-blur-md transition-colors shadow-sm"><X className="w-4 h-4" /></button>
    </a>
  );
}

function AttachmentPreview({ att, onRemove }: { att: any, onRemove: () => void }) {
  const isImage = att.fileType.includes('image');
  const isPdf = att.fileType === 'application/pdf';
  const isAudio = att.fileType.includes('audio');
  return (
    <a href={att.fileUrl} target="_blank" rel="noreferrer" className="flex flex-col bg-gray-50 rounded-xl border border-gray-100 overflow-hidden relative group/file transition-all hover:shadow-md cursor-pointer block">
      <div className="w-full aspect-square bg-gray-100 relative flex items-center justify-center overflow-hidden shrink-0">
        {isImage && <img src={att.fileUrl} alt={att.fileName} className="absolute inset-0 w-full h-full object-cover" />}
        {isPdf && <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-white"><Document file={att.fileUrl} loading={<Loader2 className="w-6 h-6 animate-spin text-gray-300" />} error={<Plus className="w-8 h-8 text-gray-300" />}><Page pageNumber={1} width={250} renderTextLayer={false} renderAnnotationLayer={false} /></Document></div>}
        {isAudio && <Mic className="w-8 h-8 text-gray-300" />}
        {!isImage && !isPdf && !isAudio && <Plus className="w-8 h-8 text-gray-300" />}
      </div>
      <div className="p-3 bg-white flex-1">
        <p className="text-sm font-medium text-gray-900 line-clamp-1">{att.fileName}</p>
        <p className="text-[10px] text-gray-400 mt-1 uppercase font-semibold tracking-wider">{att.fileType.split('/')[1] || 'Archivo'}</p>
      </div>
      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }} className="absolute top-2 right-2 z-10 p-1.5 text-gray-500 hover:text-black hover:bg-white/90 rounded-full bg-white/50 backdrop-blur-md transition-colors shadow-sm"><X className="w-4 h-4" /></button>
    </a>
  );
}

function DeleteConfirmButton({ onDelete, t }: { onDelete: () => void, t: any }) {
  const [isConfirming, setIsConfirming] = useState(false);
  useEffect(() => { let timer: NodeJS.Timeout; if (isConfirming) timer = setTimeout(() => setIsConfirming(false), 2000); return () => clearTimeout(timer); }, [isConfirming]);
  return (
    <AnimatePresence mode="wait">
      {!isConfirming ? (
        <motion.button key="trash" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={() => setIsConfirming(true)} className="w-9 h-9 flex items-center justify-center bg-white hover:bg-gray-100 text-gray-400 hover:text-black rounded-xl transition-colors border border-gray-200 shadow-sm"><Trash2 className="w-4 h-4" /></motion.button>
      ) : (
        <motion.button key="confirm" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={() => { onDelete(); setIsConfirming(false); }} className="h-9 px-3 flex items-center justify-center bg-black text-white text-xs font-medium rounded-xl shadow-sm">{t('profile.deleteAccount').split(' ')[0]}</motion.button>
      )}
    </AnimatePresence>
  );
}

export function TaskModal({ task, isOpen, onClose }: { task: Partial<Task> & { rrule?: string | null } | null, isOpen: boolean, onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const addAttachment = useAddTaskAttachment();
  const { data: allTasks } = useGetTasks();
  const { data: prefs } = useGetPreferences();

  const [localTask, setLocalTask] = useState<Partial<Task> & { rrule?: string | null } | null>(null);
  const [notifValue, setNotifValue] = useState<string>('');
  const [notifUnit, setNotifUnit] = useState<string>('minutos');

  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLink, setNewLink] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showPaywall, setShowPaywall] = useState(false);

  // Estado para "Todo el día"
  const [isAllDay, setIsAllDay] = useState(false);

  useEffect(() => {
    if (isOpen && task) {
      const existingTask = allTasks?.find(t => t.id === task.id);
      const taskData = existingTask || task;
      setLocalTask(taskData as any);

      // Si no tiene horas, asumimos que es "Todo el día"
      setIsAllDay(!taskData.horaInicio && !taskData.horaVencimiento);

      if (taskData.fechaNotificacion) {
        const rel = getRelativeNotif(taskData.fechaVencimiento || null, taskData.horaInicio || null, taskData.fechaNotificacion, taskData.horaNotificacion || null);
        setNotifValue(rel.value); setNotifUnit(rel.unit);
      } else { setNotifValue(''); setNotifUnit('minutos'); }
    }
  }, [isOpen, task, allTasks]);

  if (!localTask) return null;

  const updateLocal = (updates: Partial<Task> & { rrule?: string | null }) => setLocalTask(prev => ({ ...prev, ...updates }));

  const handleAllDayToggle = (checked: boolean) => {
    setIsAllDay(checked);
    if (checked) {
      updateLocal({ horaInicio: null, horaVencimiento: null });
    }
  };

  const handleSave = () => {
    if (!user) return;
    const isNew = !localTask.id;
    const isEmpty = !localTask.titulo || localTask.titulo.trim() === "" || localTask.titulo === t('modal.new');
    if (isNew && isEmpty) { onClose(); return; }

    const payload: any = {
      titulo: localTask.titulo || "Sin título", 
      descripcion: localTask.descripcion, 
      fechaVencimiento: localTask.fechaVencimiento, 
      fechaFin: (localTask as any).fechaFin, 
      horaInicio: localTask.horaInicio, 
      horaVencimiento: localTask.horaVencimiento, 
      fechaNotificacion: localTask.fechaNotificacion, 
      horaNotificacion: localTask.horaNotificacion, 
      proyecto: localTask.proyecto, 
      rrule: localTask.rrule, // <-- Guardamos la regla de repetición
      links: localTask.links, 
      completada: localTask.completada
    };

    queryClient.setQueryData(getGetTasksQueryKey(), (old: Task[] | undefined) => {
      if (!old) return old;
      if (isNew) return [...old, { ...payload, id: Math.random().toString(), userId: user.id, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }];
      else return old.map(t => t.id === localTask.id ? { ...t, ...payload } : t);
    });

    if (isNew) createTask.mutate({ data: { ...payload, userId: user.id } }, { onSettled: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) });
    else updateTask.mutate({ id: localTask.id!, data: payload }, { onSettled: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) });
    onClose();
  };

  const handleDelete = () => {
    if (localTask.id) {
      queryClient.setQueryData(getGetTasksQueryKey(), (old: Task[] | undefined) => old?.filter(t => t.id !== localTask.id));
      deleteTask.mutate({ id: localTask.id }, { onSettled: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) });
    }
    onClose();
  };

  const handleDesdeChange = (newFecha: string | null, newHora: string | null) => {
    const updates: any = { fechaVencimiento: newFecha, horaInicio: newHora };
    if (newFecha && (!(localTask as any).fechaFin || (localTask as any).fechaFin === localTask.fechaVencimiento)) updates.fechaFin = newFecha;
    if (newHora && newHora !== localTask.horaInicio) {
      const [hours, minutes] = newHora.split(':').map(Number);
      const endDate = new Date(); endDate.setHours(hours + 1, minutes);
      updates.horaVencimiento = format(endDate, 'HH:mm');
    }
    const numVal = parseInt(notifValue);
    if (!isNaN(numVal) && numVal > 0) {
      const absTime = getAbsoluteNotifTime(newFecha, newHora, numVal, notifUnit);
      updates.fechaNotificacion = absTime.fechaNotificacion; updates.horaNotificacion = absTime.horaNotificacion;
    }
    updateLocal(updates);
  };

  const handleNotifChange = (val: string, unit: string) => {
    setNotifValue(val); setNotifUnit(unit);
    const numVal = parseInt(val);
    if (isNaN(numVal) || numVal <= 0) { updateLocal({ fechaNotificacion: null, horaNotificacion: null }); return; }
    const absTime = getAbsoluteNotifTime(localTask.fechaVencimiento || null, localTask.horaInicio || null, numVal, unit);
    updateLocal(absTime);
  };

  const handleProjectSelect = (val: string) => {
    if (val === "__new__") setIsCreatingProject(true);
    else updateLocal({ proyecto: val === "none" ? null : val });
  };

  const saveNewProject = () => {
    if (newProjectName.trim()) updateLocal({ proyecto: newProjectName.trim() });
    setIsCreatingProject(false); setNewProjectName("");
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault(); if (!newLink.trim()) return;
    const formattedLink = newLink.trim().startsWith('http') ? newLink.trim() : `https://${newLink.trim()}`;
    updateLocal({ links: [...(localTask.links || []), formattedLink] });
    setIsAddingLink(false); setNewLink("");
  };

  const removeLink = (linkToRemove: string) => updateLocal({ links: localTask.links?.filter(l => l !== linkToRemove) || [] });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !localTask.id) return toast({ title: "Guarda la tarea primero para subir archivos" });

    if (file.size > 5 * 1024 * 1024 && !prefs?.isPremium) {
      setShowPaywall(true);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    toast({ title: "Subiendo archivo..." });
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const { data, error } = await supabase.storage.from('attachments').upload(`${user.id}/${fileName}`, file);
    if (error) return toast({ title: "Error al subir", description: error.message, variant: "destructive" });
    const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(data.path);
    addAttachment.mutate({ id: localTask.id, data: { fileName: file.name, fileUrl: publicUrl, fileType: file.type } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }); toast({ title: "Archivo adjuntado" }); } });
  };

  const projects = Array.from(new Set(allTasks?.map(t => t.proyecto).filter(Boolean) || []));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if(!open) onClose(); }}>
      <DialogContent className="bg-white border border-gray-100/50 shadow-2xl w-[95vw] sm:w-[calc(100vw-4rem)] max-w-4xl rounded-3xl p-0 gap-0 overflow-hidden [&>button]:hidden">
        <div className="p-6 border-b border-gray-100/50 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <Checkbox completada={localTask.completada || false} onToggle={() => updateLocal({ completada: !localTask.completada })} />
            <input value={localTask.titulo || ''} onChange={(e) => updateLocal({ titulo: e.target.value })} placeholder={t('modal.title')} className="text-2xl font-semibold text-gray-900 bg-transparent border-none focus:ring-0 p-0 w-full outline-none" />
          </div>
          <div className="flex items-center gap-2">
            <DeleteConfirmButton onDelete={handleDelete} t={t} />
            <button onClick={handleSave} className="w-9 h-9 flex items-center justify-center bg-black hover:bg-gray-800 text-white rounded-xl transition-colors shadow-sm"><Check className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="p-6 max-h-[75vh] overflow-y-auto no-scrollbar space-y-8">
          <RichTextEditor content={localTask.descripcion || ''} onChange={(html) => updateLocal({ descripcion: html })} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex flex-col justify-center gap-5">

              {/* Switch Todo el día */}
              <div className="flex items-center justify-between pb-4 border-b border-gray-200/50">
                <span className="text-sm font-semibold text-gray-900">Todo el día</span>
                <Switch checked={isAllDay} onCheckedChange={handleAllDayToggle} />
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-gray-900 w-12">{t('modal.from')}</span>
                <div className="relative w-full max-w-[140px]">
                  <input type="date" value={localTask.fechaVencimiento || ''} onChange={(e) => handleDesdeChange(e.target.value || null, localTask.horaInicio || null)} className="pill-input" />
                  {localTask.fechaVencimiento && <button onPointerDown={(e) => { e.preventDefault(); handleDesdeChange(null, localTask.horaInicio || null); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black bg-white"><X className="w-3 h-3"/></button>}
                </div>
                {!isAllDay && (
                  <div className="relative w-full max-w-[140px]">
                    <input type="time" value={localTask.horaInicio || ''} onChange={(e) => handleDesdeChange(localTask.fechaVencimiento || null, e.target.value || null)} className="pill-input" />
                    {localTask.horaInicio && <button onPointerDown={(e) => { e.preventDefault(); handleDesdeChange(localTask.fechaVencimiento || null, null); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black bg-white"><X className="w-3 h-3"/></button>}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-gray-900 w-12">{t('modal.to')}</span>
                <div className="relative w-full max-w-[140px]">
                  <input type="date" value={(localTask as any).fechaFin || ''} onChange={(e) => updateLocal({ fechaFin: e.target.value || null } as any)} className="pill-input" />
                  {(localTask as any).fechaFin && <button onPointerDown={(e) => { e.preventDefault(); updateLocal({ fechaFin: null } as any); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black bg-white"><X className="w-3 h-3"/></button>}
                </div>
                {!isAllDay && (
                  <div className="relative w-full max-w-[140px]">
                    <input type="time" value={localTask.horaVencimiento || ''} onChange={(e) => updateLocal({ horaVencimiento: e.target.value || null })} className="pill-input" />
                    {localTask.horaVencimiento && <button onPointerDown={(e) => { e.preventDefault(); updateLocal({ horaVencimiento: null }); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-black bg-white"><X className="w-3 h-3"/></button>}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              {/* Selector de Repetición */}
              <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 flex items-center justify-between gap-4 flex-1">
                <span className="text-sm font-medium text-gray-900 flex items-center gap-2"><Repeat className="w-4 h-4 text-gray-400" /> Repetir</span>
                <Select value={localTask.rrule || "none"} onValueChange={(val) => updateLocal({ rrule: val === "none" ? null : val })}>
                  <SelectTrigger className="bg-white border border-gray-200 rounded-xl h-[38px] px-3 text-sm font-medium text-gray-700 focus:ring-1 focus:ring-black shadow-sm w-auto min-w-[120px]">
                    <SelectValue placeholder="Nunca" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="none">Nunca</SelectItem>
                    <SelectItem value="FREQ=DAILY">Todos los días</SelectItem>
                    <SelectItem value="FREQ=WEEKLY">Cada semana</SelectItem>
                    <SelectItem value="FREQ=MONTHLY">Cada mes</SelectItem>
                    <SelectItem value="FREQ=YEARLY">Cada año</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 flex items-center justify-between gap-4 flex-1">
                <span className="text-sm font-medium text-gray-900">{t('tasks.col.notif')}</span>
                <div className="flex items-center gap-2">
                  <input type="number" inputMode="numeric" pattern="[0-9]*" value={notifValue} onChange={e => handleNotifChange(e.target.value.replace(/[^0-9]/g, ''), notifUnit)} className="w-16 bg-white border border-gray-200 rounded-xl px-2 py-2 text-sm text-center font-medium text-gray-700 focus:ring-1 focus:ring-black outline-none shadow-sm" placeholder="0" />
                  <Select value={notifUnit} onValueChange={(val) => handleNotifChange(notifValue, val)}>
                    <SelectTrigger className="bg-white border border-gray-200 rounded-xl h-[38px] px-3 text-sm font-medium text-gray-700 focus:ring-1 focus:ring-black shadow-sm"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="minutos">{t('modal.mins')}</SelectItem>
                      <SelectItem value="horas">{t('modal.hours')}</SelectItem>
                      <SelectItem value="dias">{t('modal.days')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 flex items-center justify-between gap-4 flex-1">
                <span className="text-sm font-medium text-gray-900">{t('tasks.col.project')}</span>
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-gray-400" />
                  {isCreatingProject ? (
                    <input autoFocus type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} onBlur={saveNewProject} onKeyDown={(e) => e.key === 'Enter' && saveNewProject()} placeholder="Nombre..." className="bg-transparent border-0 p-0 text-sm text-gray-900 focus:ring-0 outline-none w-full max-w-[120px]" />
                  ) : (
                    <Select value={localTask.proyecto || "none"} onValueChange={handleProjectSelect}>
                      <SelectTrigger className="bg-white border border-gray-200 rounded-xl h-[38px] px-3 text-sm font-medium text-gray-700 focus:ring-1 focus:ring-black shadow-sm w-auto min-w-[120px]"><SelectValue placeholder={t('modal.none')} /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="__new__" className="font-medium text-blue-600">{t('modal.create')}</SelectItem>
                        <SelectItem value="none" className="text-gray-400">{t('modal.none')}</SelectItem>
                        {projects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {isAddingLink ? (
                <form onSubmit={handleAddLink} className="flex flex-1 gap-2">
                  <input autoFocus type="text" value={newLink} onChange={e => setNewLink(e.target.value)} placeholder="https://..." className="flex-1 text-sm bg-gray-50 border-0 rounded-lg px-3 py-2 outline-none" />
                  <button type="submit" className="bg-black text-white px-3 py-2 rounded-lg text-sm font-medium">{t('modal.add')}</button>
                  <button type="button" onClick={() => setIsAddingLink(false)} className="px-3 py-2 text-sm text-gray-500 font-medium hover:bg-gray-50 rounded-lg">{t('habits.cancel')}</button>
                </form>
              ) : (
                <button onClick={() => setIsAddingLink(true)} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-black hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"><Plus className="w-4 h-4" /> {t('modal.link')}</button>
              )}
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-black hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors"><Plus className="w-4 h-4" /> {t('modal.file')}</button>
            </div>
            {(localTask.links && localTask.links.length > 0) || (localTask.attachments && localTask.attachments.length > 0) ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {localTask.links?.map((link, i) => <LinkPreview key={i} url={link} onRemove={() => removeLink(link)} />)}
                {localTask.attachments?.map((att) => <AttachmentPreview key={att.id} att={att} onRemove={() => removeAttachment(att.id)} />)}
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />
    </Dialog>
  );
}