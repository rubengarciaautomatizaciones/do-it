import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUpdateTask, useDeleteTask, useAddTaskAttachment, useGetTaskMetadata, getGetTasksQueryKey, getGetTaskStatsQueryKey, Task } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Trash2, Link as LinkIcon, Paperclip, Plus, File, Image as ImageIcon, Mic, Clock, X, Bell, Folder, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { RichTextEditor } from './RichTextEditor';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// --- CONFIGURACIÓN DE REACT-PDF ---
import { Document, Page, pdfjs } from 'react-pdf';
// Usamos el CDN para el worker, evita problemas de empaquetado con Vite
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// --- PREVISUALIZACIÓN DE ENLACES (Estilo WhatsApp / Twitter Card) ---
function LinkPreview({ url, onRemove }: { url: string, onRemove: () => void }) {
  const { data, isLoading } = useGetTaskMetadata({ url });
  const hostname = new URL(url).hostname.replace('www.', '');

  return (
    <a href={url} target="_blank" rel="noreferrer" className="flex flex-col bg-gray-50 rounded-xl border border-gray-100 overflow-hidden relative group/link transition-all hover:shadow-md cursor-pointer block">
      {isLoading ? (
        <div className="w-full h-32 bg-gray-200 animate-pulse flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : data?.image ? (
        <div className="w-full h-32 bg-gray-200 relative">
          <img src={data.image} alt="preview" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="w-full h-32 bg-gray-100 flex items-center justify-center"><LinkIcon className="w-8 h-8 text-gray-300" /></div>
      )}
      <div className="p-3 bg-white">
        <p className="text-sm font-medium text-gray-900 line-clamp-1">{data?.title || url}</p>
        {data?.description && <p className="text-xs text-gray-500 line-clamp-2 mt-1">{data.description}</p>}
        <p className="text-[10px] text-gray-400 mt-2 uppercase font-semibold tracking-wider">{hostname}</p>
      </div>
      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }} className="absolute top-2 right-2 z-10 p-1.5 text-gray-500 hover:text-black hover:bg-white/90 rounded-full bg-white/50 backdrop-blur-md transition-colors shadow-sm">
        <X className="w-4 h-4" />
      </button>
    </a>
  );
}

// --- PREVISUALIZACIÓN DE ARCHIVOS (Imágenes, PDFs, Audios) ---
function AttachmentPreview({ att, onRemove }: { att: any, onRemove: () => void }) {
  const isImage = att.fileType.includes('image');
  const isPdf = att.fileType === 'application/pdf';
  const isAudio = att.fileType.includes('audio');

  return (
    <a href={att.fileUrl} target="_blank" rel="noreferrer" className="flex flex-col bg-gray-50 rounded-xl border border-gray-100 overflow-hidden relative group/file transition-all hover:shadow-md cursor-pointer block">
      <div className="w-full h-32 bg-gray-100 relative flex items-center justify-center overflow-hidden">
        {isImage && <img src={att.fileUrl} alt={att.fileName} className="w-full h-full object-cover" />}

        {isPdf && (
          <div className="w-full h-full flex items-center justify-center overflow-hidden bg-white">
            <Document 
              file={att.fileUrl} 
              loading={<Loader2 className="w-6 h-6 animate-spin text-gray-300" />}
              error={<File className="w-8 h-8 text-gray-300" />}
            >
              <Page pageNumber={1} width={250} renderTextLayer={false} renderAnnotationLayer={false} />
            </Document>
          </div>
        )}

        {isAudio && <Mic className="w-8 h-8 text-gray-300" />}
        {!isImage && !isPdf && !isAudio && <File className="w-8 h-8 text-gray-300" />}
      </div>

      <div className="p-3 bg-white">
        <p className="text-sm font-medium text-gray-900 line-clamp-1">{att.fileName}</p>
        <p className="text-[10px] text-gray-400 mt-1 uppercase font-semibold tracking-wider">{att.fileType.split('/')[1] || 'Archivo'}</p>
      </div>

      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(); }} className="absolute top-2 right-2 z-10 p-1.5 text-gray-500 hover:text-black hover:bg-white/90 rounded-full bg-white/50 backdrop-blur-md transition-colors shadow-sm">
        <X className="w-4 h-4" />
      </button>
    </a>
  );
}

function DeleteConfirmButton({ onDelete }: { onDelete: (e: React.MouseEvent) => void }) {
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isConfirming) {
      timer = setTimeout(() => setIsConfirming(false), 2000);
    }
    return () => clearTimeout(timer);
  }, [isConfirming]);

  return (
    <div className="relative flex items-center justify-end h-8 min-w-[70px]" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
      <AnimatePresence mode="wait">
        {!isConfirming ? (
          <motion.button
            key="trash"
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsConfirming(true); }}
            className="text-gray-400 hover:text-black p-2 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>
        ) : (
          <motion.button
            key="confirm"
            initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(e); setIsConfirming(false); }}
            className="bg-black text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center shadow-sm"
          >
            Eliminar
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Checkbox({ completada, onToggle }: { completada: boolean, onToggle: (e: React.MouseEvent) => void }) {
  return (
    <div onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()} className="flex items-center justify-center w-8 h-8">
      <button onClick={onToggle} className="flex-shrink-0 focus:outline-none">
        <motion.div
          animate={completada ? "checked" : "unchecked"}
          variants={{
            checked: { scale: [1, 0.8, 1.1, 1], backgroundColor: "#111111", borderColor: "#111111" },
            unchecked: { scale: 1, backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
        >
          {completada && (
            <motion.svg initial={{ opacity: 0, pathLength: 0 }} animate={{ opacity: 1, pathLength: 1 }} className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </motion.svg>
          )}
        </motion.div>
      </button>
    </div>
  );
}

function TaskDetails({ task, onClose }: { task: Task, onClose?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const addAttachment = useAddTaskAttachment();

  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLink, setNewLink] = useState("");
  const [isCreatingProject, setIsCreatingProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDescriptionChange = (html: string) => {
    updateTask.mutate({ id: task.id, data: { descripcion: html } });
  };

  const handleProjectSelect = (val: string) => {
    if (val === "__new__") {
      setIsCreatingProject(true);
    } else {
      updateTask.mutate({ id: task.id, data: { proyecto: val === "none" ? null : val } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) });
    }
  };

  const saveNewProject = () => {
    if (newProjectName.trim()) {
      updateTask.mutate({ id: task.id, data: { proyecto: newProjectName.trim() } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) });
    }
    setIsCreatingProject(false);
    setNewProjectName("");
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.trim()) return;
    const formattedLink = newLink.trim().startsWith('http') ? newLink.trim() : `https://${newLink.trim()}`;
    const updatedLinks = [...(task.links || []), formattedLink];
    updateTask.mutate({ id: task.id, data: { links: updatedLinks } }, {
      onSuccess: () => { setIsAddingLink(false); setNewLink(""); queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }); }
    });
  };

  const removeLink = (linkToRemove: string) => {
    const newLinks = task.links?.filter(l => l !== linkToRemove) || [];
    updateTask.mutate({ id: task.id, data: { links: newLinks } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) });
  };

  const removeAttachment = async (attId: string) => {
    if (!user) return;
    await fetch(`/api/tasks/${task.id}/attachments/${attId}`, { method: 'DELETE', headers: { 'x-user-id': user.id } });
    queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    toast({ title: "Subiendo archivo..." });
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;
    const { data, error } = await supabase.storage.from('attachments').upload(filePath, file);
    if (error) return toast({ title: "Error al subir", description: error.message, variant: "destructive" });
    const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(data.path);
    addAttachment.mutate({ id: task.id, data: { fileName: file.name, fileUrl: publicUrl, fileType: file.type } }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }); toast({ title: "Archivo adjuntado" }); }
    });
  };

  const tasksData = queryClient.getQueryData<Task[]>(getGetTasksQueryKey());
  const projects = Array.from(new Set(tasksData?.map(t => t.proyecto).filter(Boolean) || []));

  return (
    <div className="space-y-8 pt-2">
      <RichTextEditor content={task.descripcion || ''} onChange={handleDescriptionChange} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Proyecto</p>
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-gray-500" />
            {isCreatingProject ? (
              <input 
                autoFocus
                type="text" 
                value={newProjectName} 
                onChange={(e) => setNewProjectName(e.target.value)} 
                onBlur={saveNewProject}
                onKeyDown={(e) => e.key === 'Enter' && saveNewProject()}
                placeholder="Nombre del proyecto..."
                className="bg-transparent border-0 p-0 text-sm text-gray-900 focus:ring-0 outline-none w-full" 
              />
            ) : (
              <Select value={task.proyecto || "none"} onValueChange={handleProjectSelect}>
                <SelectTrigger className="w-full bg-transparent border-0 p-0 h-auto shadow-none focus:ring-0 text-sm text-gray-900">
                  <SelectValue placeholder="Elegir" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__new__" className="font-medium text-blue-600">+ Crear nuevo proyecto</SelectItem>
                  <SelectItem value="none" className="text-gray-400">Ninguno</SelectItem>
                  {projects.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Fecha Límite</p>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <input type="date" value={task.fechaVencimiento || ''} onChange={(e) => updateTask.mutate({ id: task.id, data: { fechaVencimiento: e.target.value || null } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) })} className="bg-transparent border-0 p-0 text-sm text-gray-900 focus:ring-0 cursor-pointer outline-none w-full" />
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <input type="time" value={task.horaVencimiento || ''} onChange={(e) => updateTask.mutate({ id: task.id, data: { horaVencimiento: e.target.value || null } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) })} className="bg-transparent border-0 p-0 text-sm text-gray-900 focus:ring-0 cursor-pointer outline-none w-full" />
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Notificación</p>
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-4 h-4 text-gray-500" />
            <input type="date" value={task.fechaNotificacion || ''} onChange={(e) => updateTask.mutate({ id: task.id, data: { fechaNotificacion: e.target.value || null } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) })} className="bg-transparent border-0 p-0 text-sm text-gray-900 focus:ring-0 cursor-pointer outline-none w-full" />
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <input type="time" value={task.horaNotificacion || ''} onChange={(e) => updateTask.mutate({ id: task.id, data: { horaNotificacion: e.target.value || null } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) })} className="bg-transparent border-0 p-0 text-sm text-gray-900 focus:ring-0 cursor-pointer outline-none w-full" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {/* BOTONES ARRIBA */}
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
            <Paperclip className="w-4 h-4" /> Archivo
          </button>
        </div>

        {/* LISTA DE ENLACES Y ARCHIVOS ABAJO (ESTILO WHATSAPP) */}
        {(task.links && task.links.length > 0) || (task.attachments && task.attachments.length > 0) ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {task.links?.map((link, i) => (
              <LinkPreview key={i} url={link} onRemove={() => removeLink(link)} />
            ))}
            {task.attachments?.map((att) => (
              <AttachmentPreview key={att.id} att={att} onRemove={() => removeAttachment(att.id)} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
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

  return (
    <input 
      value={localTitle}
      onChange={(e) => setLocalTitle(e.target.value)}
      onBlur={handleBlur}
      className="text-2xl font-semibold text-gray-900 bg-transparent border-none focus:ring-0 p-0 w-full outline-none"
    />
  );
}

export function TaskRowDesktop({ task, currentFilter }: { task: Task, currentFilter: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [localCompletada, setLocalCompletada] = useState(task.completada);
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  useEffect(() => { setLocalCompletada(task.completada); }, [task.completada]);

  const toggleComplete = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const newStatus = !localCompletada;

    if (currentFilter === "sin_hacer" && newStatus === true) {
      setLocalCompletada(true);
      setTimeout(() => {
        queryClient.setQueryData(getGetTasksQueryKey(), (old: Task[] | undefined) => old?.map(t => t.id === task.id ? { ...t, completada: newStatus } : t));
        updateTask.mutate({ id: task.id, data: { completada: newStatus } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) });
      }, 400);
    } else {
      queryClient.setQueryData(getGetTasksQueryKey(), (old: Task[] | undefined) => old?.map(t => t.id === task.id ? { ...t, completada: newStatus } : t));
      updateTask.mutate({ id: task.id, data: { completada: newStatus } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) });
    }
  };

  const plainTextDescription = task.descripcion ? task.descripcion.replace(/<[^>]*>?/gm, '') : '';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <motion.tr 
          ref={setNodeRef} style={style} {...attributes} {...listeners}
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: 100, transition: { duration: 0.3 } }}
          id={`task-${task.id}`}
          className={`group border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer`}
        >
          <td className="p-2 text-center">
            <Checkbox completada={localCompletada} onToggle={toggleComplete} />
          </td>
          <td className={`p-3 text-[15px] truncate ${localCompletada ? 'text-gray-400 line-through' : 'text-gray-900 font-medium'}`}>
            {task.titulo}
          </td>
          <td className="p-3 text-gray-500 text-sm truncate">
            {plainTextDescription}
          </td>
          <td className="p-3 text-gray-500 text-sm whitespace-nowrap">
            {task.fechaVencimiento ? `${format(new Date(task.fechaVencimiento), "d MMM yyyy", { locale: es })}${task.horaVencimiento ? ` · ${task.horaVencimiento}` : ''}` : ''}
          </td>
          <td className="p-3 text-gray-500 text-sm whitespace-nowrap">
            {task.fechaNotificacion ? `${format(new Date(task.fechaNotificacion), "d MMM yyyy", { locale: es })}${task.horaNotificacion ? ` · ${task.horaNotificacion}` : ''}` : ''}
          </td>
          <td className="p-3 text-gray-500 text-sm whitespace-nowrap">
            {task.proyecto}
          </td>
          <td className="p-3 text-gray-500 text-sm whitespace-nowrap">
            {(task.attachments?.length > 0 || task.links?.length > 0) && (
              <div className="flex items-center gap-2">
                {task.attachments?.length > 0 && <span className="flex items-center gap-1"><Paperclip className="w-3 h-3"/> {task.attachments.length}</span>}
                {task.links?.length > 0 && <span className="flex items-center gap-1"><LinkIcon className="w-3 h-3"/> {task.links.length}</span>}
              </div>
            )}
          </td>
          <td className="p-3 text-right">
            <DeleteConfirmButton onDelete={(e) => {
              e.preventDefault(); e.stopPropagation();
              deleteTask.mutate({ id: task.id }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) });
            }} />
          </td>
        </motion.tr>
      </DialogTrigger>
      <DialogContent className="bg-white border border-gray-100/50 shadow-2xl w-[calc(100vw-4rem)] max-w-4xl rounded-3xl p-0 gap-0 overflow-hidden">
        <div className="p-6 border-b border-gray-100/50 flex items-center gap-4">
          <Checkbox completada={localCompletada} onToggle={toggleComplete} />
          <div className="flex-1">
            <EditableTitle task={task} />
          </div>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto no-scrollbar">
          <TaskDetails task={task} onClose={() => setIsOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TaskItemMobile({ task, currentFilter }: { task: Task, currentFilter: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [localCompletada, setLocalCompletada] = useState(task.completada);
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();

  useEffect(() => { setLocalCompletada(task.completada); }, [task.completada]);

  const toggleComplete = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const newStatus = !localCompletada;

    if (currentFilter === "sin_hacer" && newStatus === true) {
      setLocalCompletada(true);
      setTimeout(() => {
        queryClient.setQueryData(getGetTasksQueryKey(), (old: Task[] | undefined) => old?.map(t => t.id === task.id ? { ...t, completada: newStatus } : t));
        updateTask.mutate({ id: task.id, data: { completada: newStatus } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) });
      }, 400);
    } else {
      queryClient.setQueryData(getGetTasksQueryKey(), (old: Task[] | undefined) => old?.map(t => t.id === task.id ? { ...t, completada: newStatus } : t));
      updateTask.mutate({ id: task.id, data: { completada: newStatus } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <motion.div 
          layout
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, x: 100, transition: { duration: 0.3 } }}
          id={`task-${task.id}`} 
          className={`flex items-center gap-3 py-3 px-2 rounded-xl cursor-pointer transition-colors hover:bg-gray-50/50`}
        >
          <Checkbox completada={localCompletada} onToggle={toggleComplete} />
          <div className="flex-1 min-w-0">
            <p className={`text-[15px] leading-tight truncate ${localCompletada ? 'text-gray-400 line-through' : 'text-gray-900 font-medium'}`}>
              {task.titulo}
            </p>
          </div>
          {task.fechaVencimiento && (
            <span className="text-xs text-gray-400 flex items-center gap-1 flex-shrink-0">
              <Calendar className="w-3 h-3"/> {format(new Date(task.fechaVencimiento), "d MMM", { locale: es })}
            </span>
          )}
        </motion.div>
      </DialogTrigger>
      <DialogContent className="bg-white border border-gray-100/50 shadow-2xl w-[90%] max-w-sm rounded-3xl p-0 gap-0 overflow-hidden">
        <div className="p-6 border-b border-gray-100/50 flex items-center gap-3">
          <Checkbox completada={localCompletada} onToggle={toggleComplete} />
          <div className="flex-1">
            <EditableTitle task={task} />
          </div>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto no-scrollbar">
          <TaskDetails task={task} onClose={() => setIsOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}