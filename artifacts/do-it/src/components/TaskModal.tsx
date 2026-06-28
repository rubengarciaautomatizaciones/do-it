import React, { useState, useRef, useEffect } from 'react';
import { useUpdateTask, useDeleteTask, useAddTaskAttachment, useGetTaskMetadata, useGetTasks, getGetTasksQueryKey, Task } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Link as LinkIcon, Plus, Mic, X, Folder, Loader2, Trash2 } from 'lucide-react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { RichTextEditor } from './RichTextEditor';
import { Checkbox } from './TaskItem';
import { Document, Page, pdfjs } from 'react-pdf';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// --- FUNCIONES AUXILIARES PARA NOTIFICACIONES ---
function getAbsoluteNotifTime(fechaDesde: string | null, horaDesde: string | null, value: number, unit: string) {
  if (!fechaDesde || value <= 0) return { fechaNotificacion: null, horaNotificacion: null };
  const baseDate = new Date(`${fechaDesde}T${horaDesde || '00:00'}:00`);
  let offsetMs = 0;
  if (unit === 'minutos') offsetMs = value * 60 * 1000;
  if (unit === 'horas') offsetMs = value * 60 * 60 * 1000;
  if (unit === 'dias') offsetMs = value * 24 * 60 * 60 * 1000;
  const notifDate = new Date(baseDate.getTime() - offsetMs);
  return {
    fechaNotificacion: format(notifDate, 'yyyy-MM-dd'),
    horaNotificacion: format(notifDate, 'HH:mm')
  };
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

// --- COMPONENTES DE PREVISUALIZACIÓN ---
function LinkPreview({ url, onRemove }: { url: string, onRemove: () => void }) {
  const { data, isLoading } = useGetTaskMetadata({ url });
  const hostname = new URL(url).hostname.replace('www.', '');
  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex flex-col bg-gray-50 rounded-xl border border-gray-100 overflow-hidden relative group/link transition-all hover:shadow-md cursor-pointer block">
      {isLoading ? (
        <div className="w-full aspect-square bg-gray-200 animate-pulse flex items-center justify-center shrink-0"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : data?.image ? (
        <div className="w-full aspect-square bg-gray-200 relative overflow-hidden shrink-0"><img src={data.image} alt="preview" className="absolute inset-0 w-full h-full object-cover" /></div>
      ) : (
        <div className="w-full aspect-square bg-gray-100 flex items-center justify-center shrink-0"><LinkIcon className="w-8 h-8 text-gray-300" /></div>
      )}
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
        {isPdf && (
          <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-white">
            <Document file={att.fileUrl} loading={<Loader2 className="w-6 h-6 animate-spin text-gray-300" />} error={<Plus className="w-8 h-8 text-gray-300" />}>
              <Page pageNumber={1} width={250} renderTextLayer={false} renderAnnotationLayer={false} />
            </Document>
          </div>
        )}
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

function DeleteConfirmButton({ onDelete }: { onDelete: () => void }) {
  const [isConfirming, setIsConfirming] = useState(false);
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isConfirming) timer = setTimeout(() => setIsConfirming(false), 2000);
    return () => clearTimeout(timer);
  }, [isConfirming]);

  return (
    <AnimatePresence mode="wait">
      {!isConfirming ? (
        <motion.button key="trash" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={() => setIsConfirming(true)} className="w-9 h-9 flex items-center justify-center bg-white hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-xl transition-colors border border-gray-200 shadow-sm">
          <Trash2 className="w-4 h-4" />
        </motion.button>
      ) : (
        <motion.button key="confirm" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={() => { onDelete(); setIsConfirming(false); }} className="h-9 px-3 flex items-center justify-center bg-red-500 text-white text-xs font-medium rounded-xl shadow-sm">
          Eliminar
        </motion.button>
      )}
    </AnimatePresence>
  );
}

function EditableTitle({ task }: { task: Task }) {
  const [localTitle, setLocalTitle] = useState(task.titulo);
  const updateTask = useUpdateTask();
  const queryClient = useQueryClient();
  useEffect(() => { setLocalTitle(task.titulo); }, [task.titulo]);
  const handleBlur = () => {
    if (localTitle.trim() && localTitle !== task.titulo) {
      updateTask.mutate({ id: task.id, data: { titulo: localTitle.trim() } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) });
    } else {
      setLocalTitle(task.titulo);
    }
  };
  return <input value={localTitle} onChange={(e) => setLocalTitle(e.target.value)} onBlur={handleBlur} className="text-2xl font-semibold text-gray-900 bg-transparent border-none focus:ring-0 p-0 w-full outline-none" />;
}

export function TaskModal({ task, isOpen, onClose }: { task: Task | null, isOpen: boolean, onClose: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const addAttachment = useAddTaskAttachment();
  const { data: allTasks } = useGetTasks();

  const currentTask = allTasks?.find(t => t.id === task?.id) || task;

  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLink, setNewLink] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [notifValue, setNotifValue] = useState<string>('');
  const [notifUnit, setNotifUnit] = useState<string>('minutos');

  useEffect(() => {
    if (currentTask?.fechaNotificacion) {
      const rel = getRelativeNotif(currentTask.fechaVencimiento, currentTask.horaInicio, currentTask.fechaNotificacion, currentTask.horaNotificacion);
      setNotifValue(rel.value);
      setNotifUnit(rel.unit);
    } else {
      setNotifValue('');
      setNotifUnit('minutos');
    }
  }, [currentTask?.fechaNotificacion, currentTask?.horaNotificacion, currentTask?.fechaVencimiento, currentTask?.horaInicio]);

  if (!currentTask) return null;

  const handleDescriptionChange = (html: string) => updateTask.mutate({ id: currentTask.id, data: { descripcion: html } });

  const handleProjectSelect = (val: string) => {
    if (val === "__new__") setIsCreatingProject(true);
    else updateTask.mutate({ id: currentTask.id, data: { proyecto: val === "none" ? null : val } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) });
  };

  const saveNewProject = () => {
    if (newProjectName.trim()) updateTask.mutate({ id: currentTask.id, data: { proyecto: newProjectName.trim() } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) });
    setIsCreatingProject(false);
    setNewProjectName("");
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.trim()) return;
    const formattedLink = newLink.trim().startsWith('http') ? newLink.trim() : `https://${newLink.trim()}`;
    const updatedLinks = [...(currentTask.links || []), formattedLink];
    updateTask.mutate({ id: currentTask.id, data: { links: updatedLinks } }, { onSuccess: () => { setIsAddingLink(false); setNewLink(""); queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }); } });
  };

  const removeLink = (linkToRemove: string) => {
    const newLinks = currentTask.links?.filter(l => l !== linkToRemove) || [];
    updateTask.mutate({ id: currentTask.id, data: { links: newLinks } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) });
  };

  const removeAttachment = async (attId: string) => {
    if (!user) return;
    await fetch(`/api/tasks/${currentTask.id}/attachments/${attId}`, { method: 'DELETE', headers: { 'x-user-id': user.id } });
    queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    toast({ title: "Subiendo archivo..." });
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const { data, error } = await supabase.storage.from('attachments').upload(`${user.id}/${fileName}`, file);
    if (error) return toast({ title: "Error al subir", description: error.message, variant: "destructive" });
    const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(data.path);
    addAttachment.mutate({ id: currentTask.id, data: { fileName: file.name, fileUrl: publicUrl, fileType: file.type } }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }); toast({ title: "Archivo adjuntado" }); } });
  };

  const handleDelete = () => {
    deleteTask.mutate({ id: currentTask.id }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }); onClose(); } });
  };

  // LÓGICA DE AUTO-COMPLETADO INTELIGENTE
  const handleDesdeChange = (newFecha: string | null, newHora: string | null) => {
    const updates: any = { fechaVencimiento: newFecha, horaInicio: newHora };

    // Auto-completar Fecha Hasta (Si estaba vacía o era igual a la antigua)
    if (newFecha && (!(currentTask as any).fechaFin || (currentTask as any).fechaFin === currentTask.fechaVencimiento)) {
      updates.fechaFin = newFecha;
    }

    // Auto-completar Hora Hasta (+1 hora)
    if (newHora && newHora !== currentTask.horaInicio) {
      const [hours, minutes] = newHora.split(':').map(Number);
      const endDate = new Date();
      endDate.setHours(hours + 1, minutes);
      updates.horaVencimiento = format(endDate, 'HH:mm');
    }

    // Actualizar Notificación Relativa
    const numVal = parseInt(notifValue);
    if (!isNaN(numVal) && numVal > 0) {
      const absTime = getAbsoluteNotifTime(newFecha, newHora, numVal, notifUnit);
      updates.fechaNotificacion = absTime.fechaNotificacion;
      updates.horaNotificacion = absTime.horaNotificacion;
    }

    updateTask.mutate({ id: currentTask.id, data: updates }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) });
  };

  const handleNotifChange = (val: string, unit: string) => {
    setNotifValue(val);
    setNotifUnit(unit);
    const numVal = parseInt(val);
    if (isNaN(numVal) || numVal <= 0) {
      updateTask.mutate({ id: currentTask.id, data: { fechaNotificacion: null, horaNotificacion: null } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) });
      return;
    }
    const absTime = getAbsoluteNotifTime(currentTask.fechaVencimiento, currentTask.horaInicio, numVal, unit);
    updateTask.mutate({ id: currentTask.id, data: absTime }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) });
  };

  const projects = Array.from(new Set(allTasks?.map(t => t.proyecto).filter(Boolean) || []));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white border border-gray-100/50 shadow-2xl w-[95vw] sm:w-[calc(100vw-4rem)] max-w-4xl rounded-3xl p-0 gap-0 overflow-hidden [&>button]:hidden">

        {/* CABECERA */}
        <div className="p-6 border-b border-gray-100/50 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <Checkbox completada={currentTask.completada} onToggle={() => updateTask.mutate({ id: currentTask.id, data: { completada: !currentTask.completada } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) })} />
            <EditableTitle task={currentTask} />
          </div>
          <div className="flex items-center gap-2">
            <DeleteConfirmButton onDelete={handleDelete} />
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center bg-white hover:bg-gray-50 text-gray-500 rounded-xl transition-colors border border-gray-200 shadow-sm">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="p-6 max-h-[75vh] overflow-y-auto no-scrollbar space-y-8">
          <RichTextEditor content={currentTask.descripcion || ''} onChange={handleDescriptionChange} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* COLUMNA 1: Programación */}
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex flex-col justify-center gap-5">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-gray-900 w-12">Desde</span>
                <input type="date" value={currentTask.fechaVencimiento || ''} onChange={(e) => handleDesdeChange(e.target.value || null, currentTask.horaInicio)} className="pill-input" />
                <input type="time" value={currentTask.horaInicio || ''} onChange={(e) => handleDesdeChange(currentTask.fechaVencimiento, e.target.value || null)} className="pill-input" />
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-medium text-gray-900 w-12">hasta</span>
                <input type="date" value={(currentTask as any).fechaFin || ''} onChange={(e) => updateTask.mutate({ id: currentTask.id, data: { fechaFin: e.target.value || null } as any }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) })} className="pill-input" />
                <input type="time" value={currentTask.horaVencimiento || ''} onChange={(e) => updateTask.mutate({ id: currentTask.id, data: { horaVencimiento: e.target.value || null } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) })} className="pill-input" />
              </div>
            </div>

            {/* COLUMNA 2: Notificación y Proyecto */}
            <div className="flex flex-col gap-4">
              <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 flex items-center justify-between gap-4 flex-1">
                <span className="text-sm font-medium text-gray-900">Notificación</span>
                <div className="flex items-center gap-2">
                  <input type="number" min="1" value={notifValue} onChange={e => handleNotifChange(e.target.value, notifUnit)} className="w-16 bg-white border border-gray-200 rounded-xl px-2 py-2 text-sm text-center font-medium text-gray-700 focus:ring-1 focus:ring-black outline-none shadow-sm" placeholder="0" />
                  <Select value={notifUnit} onValueChange={(val) => handleNotifChange(notifValue, val)}>
                    <SelectTrigger className="bg-white border border-gray-200 rounded-xl h-[38px] px-3 text-sm font-medium text-gray-700 focus:ring-1 focus:ring-black shadow-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="minutos">minutos</SelectItem>
                      <SelectItem value="horas">horas</SelectItem>
                      <SelectItem value="dias">días</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-gray-50 p-5 rounded-3xl border border-gray-100 flex items-center justify-between gap-4 flex-1">
                <span className="text-sm font-medium text-gray-900">Proyecto</span>
                <div className="flex items-center gap-2">
                  <Folder className="w-4 h-4 text-gray-400" />
                  {isCreatingProject ? (
                    <input autoFocus type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} onBlur={saveNewProject} onKeyDown={(e) => e.key === 'Enter' && saveNewProject()} placeholder="Nombre..." className="bg-transparent border-0 p-0 text-sm text-gray-900 focus:ring-0 outline-none w-full max-w-[120px]" />
                  ) : (
                    <Select value={currentTask.proyecto || "none"} onValueChange={handleProjectSelect}>
                      <SelectTrigger className="bg-white border border-gray-200 rounded-xl h-[38px] px-3 text-sm font-medium text-gray-700 focus:ring-1 focus:ring-black shadow-sm w-auto min-w-[120px]">
                        <SelectValue placeholder="Ninguno" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="__new__" className="font-medium text-blue-600">+ Crear nuevo</SelectItem>
                        <SelectItem value="none" className="text-gray-400">Ninguno</SelectItem>
                        {projects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ADJUNTOS Y ENLACES */}
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {isAddingLink ? (
                <form onSubmit={handleAddLink} className="flex flex-1 gap-2">
                  <input autoFocus type="text" value={newLink} onChange={e => setNewLink(e.target.value)} placeholder="https://..." className="flex-1 text-sm bg-gray-50 border-0 rounded-lg px-3 py-2 outline-none" />
                  <button type="submit" className="bg-black text-white px-3 py-2 rounded-lg text-sm font-medium">Añadir</button>
                  <button type="button" onClick={() => setIsAddingLink(false)} className="px-3 py-2 text-sm text-gray-500 font-medium hover:bg-gray-50 rounded-lg">Cancelar</button>
                </form>
              ) : (
                <button onClick={() => setIsAddingLink(true)} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-black hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors">
                  <Plus className="w-4 h-4" /> Enlace
                </button>
              )}
              <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-black hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors">
                <Plus className="w-4 h-4" /> Archivo
              </button>
            </div>
            {(currentTask.links && currentTask.links.length > 0) || (currentTask.attachments && currentTask.attachments.length > 0) ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {currentTask.links?.map((link, i) => (
                  <LinkPreview key={i} url={link} onRemove={() => removeLink(link)} />
                ))}
                {currentTask.attachments?.map((att) => (
                  <AttachmentPreview key={att.id} att={att} onRemove={() => removeAttachment(att.id)} />
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}