import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUpdateTask, useDeleteTask, useAddTaskAttachment, getGetTasksQueryKey, getGetTaskStatsQueryKey, Task } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Trash2, Link as LinkIcon, Paperclip, Plus, File, Image as ImageIcon, Loader2, Mic, Clock, X, Download, Bell } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { RichTextEditor } from './RichTextEditor';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function DeleteConfirmButton({ onDelete }: { onDelete: (e: React.MouseEvent) => void }) {
  const [isConfirming, setIsConfirming] = useState(false);
  return (
    <div className="relative flex items-center justify-end h-8" onClick={e => e.stopPropagation()}>
      <AnimatePresence mode="wait">
        {!isConfirming ? (
          <motion.button
            key="trash"
            initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsConfirming(true); }}
            className="text-gray-400 hover:text-black p-2 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </motion.button>
        ) : (
          <motion.button
            key="confirm"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(e); setIsConfirming(false); }}
            className="bg-black text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm"
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
    <button onClick={onToggle} className="flex-shrink-0 focus:outline-none flex items-center justify-center w-8 h-8">
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
  );
}

function TaskDetails({ task, onClose }: { task: Task, onClose?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const addAttachment = useAddTaskAttachment();

  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLink, setNewLink] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDescriptionChange = (html: string) => {
    updateTask.mutate({ id: task.id, data: { descripcion: html } });
  };

  const handleDelete = (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (onClose) onClose(); 
    deleteTask.mutate({ id: task.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTaskStatsQueryKey() });
      }
    });
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.trim()) return;
    const updatedLinks = [...(task.links || []), newLink.trim()];
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

  return (
    <div className="space-y-8 pt-2">
      <RichTextEditor content={task.descripcion || ''} onChange={handleDescriptionChange} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* TARJETA LÍMITE */}
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

        {/* TARJETA NOTIFICACIÓN */}
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

      <div className="space-y-3">
        {(task.links && task.links.length > 0) || (task.attachments && task.attachments.length > 0) ? (
          <div className="flex flex-col gap-2">
            {task.links?.map((link, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl group/link">
                <a href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="bg-white p-2 rounded-lg shadow-sm"><LinkIcon className="w-4 h-4 text-black" /></div>
                  <span className="text-sm text-gray-900 truncate">{link}</span>
                </a>
                <button onClick={() => removeLink(link)} className="p-2 text-gray-400 hover:text-black rounded-lg transition-colors"><X className="w-4 h-4" /></button>
              </div>
            ))}
            {task.attachments?.map((att) => (
              <div key={att.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl group/file">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="bg-white p-2 rounded-lg shadow-sm">
                    {att.fileType.includes('audio') ? <Mic className="w-4 h-4 text-black" /> :
                     att.fileType.includes('image') ? <ImageIcon className="w-4 h-4 text-black" /> : 
                     <File className="w-4 h-4 text-black" />}
                  </div>
                  <span className="text-sm text-gray-900 truncate">{att.fileName}</span>
                </div>
                <a href={att.fileUrl} download target="_blank" rel="noreferrer" className="p-2 text-gray-400 hover:text-black rounded-lg transition-colors"><Download className="w-4 h-4" /></a>
                <button onClick={() => removeAttachment(att.id)} className="p-2 text-gray-400 hover:text-black rounded-lg transition-colors"><X className="w-4 h-4" /></button>
              </div>
            ))}
          </div>
        ) : null}

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
      </div>

      <div className="pt-4 border-t border-gray-100 flex justify-end">
        <button onClick={handleDelete} className="bg-black text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:bg-gray-800 transition-colors">
          Eliminar tarea
        </button>
      </div>
    </div>
  );
}

// --- VISTA PC (Fila de Tabla con Drag & Drop) ---
export function TaskRowDesktop({ task, isHighlighted }: { task: Task, isHighlighted: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

  const toggleComplete = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const newStatus = !task.completada;
    queryClient.setQueryData(getGetTasksQueryKey(), (old: Task[] | undefined) => old?.map(t => t.id === task.id ? { ...t, completada: newStatus } : t));
    updateTask.mutate({ id: task.id, data: { completada: newStatus } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) });
  };

  const plainTextDescription = task.descripcion ? task.descripcion.replace(/<[^>]*>?/gm, '') : '';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <tr 
          ref={setNodeRef} style={style} {...attributes} {...listeners}
          id={`task-${task.id}`}
          className={`group border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-grab active:cursor-grabbing ${isHighlighted ? 'bg-gray-100' : ''}`}
        >
          <td className="p-2 text-center" onClick={e => e.stopPropagation()}>
            <Checkbox completada={task.completada} onToggle={toggleComplete} />
          </td>
          <td className={`p-3 whitespace-nowrap ${task.completada ? 'text-gray-400 line-through' : 'text-gray-900 font-medium'}`}>
            {task.titulo}
          </td>
          <td className="p-3 text-gray-500 text-sm max-w-[200px] truncate">
            {plainTextDescription}
          </td>
          <td className="p-3 text-gray-500 text-sm whitespace-nowrap">
            {task.fechaVencimiento ? format(new Date(task.fechaVencimiento), "d MMM yyyy", { locale: es }) : ''}
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
        </tr>
      </DialogTrigger>
      <DialogContent className="bg-white border border-gray-100/50 shadow-2xl w-[calc(100vw-4rem)] max-w-4xl rounded-3xl p-0 gap-0 overflow-hidden">
        <div className="p-6 border-b border-gray-100/50 flex items-center gap-4">
          <Checkbox completada={task.completada} onToggle={toggleComplete} />
          <DialogTitle className="text-2xl font-semibold text-gray-900 leading-tight flex-1">
            {task.titulo}
          </DialogTitle>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto no-scrollbar">
          <TaskDetails task={task} onClose={() => setIsOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- VISTA MÓVIL ---
export function TaskItemMobile({ task, isHighlighted }: { task: Task, isHighlighted: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();

  const toggleComplete = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const newStatus = !task.completada;
    queryClient.setQueryData(getGetTasksQueryKey(), (old: Task[] | undefined) => old?.map(t => t.id === task.id ? { ...t, completada: newStatus } : t));
    updateTask.mutate({ id: task.id, data: { completada: newStatus } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div id={`task-${task.id}`} className={`flex items-center gap-3 py-3 px-2 rounded-xl cursor-pointer transition-colors ${isHighlighted ? 'bg-gray-100' : 'hover:bg-gray-50/50'}`}>
          <Checkbox completada={task.completada} onToggle={toggleComplete} />
          <div className="flex-1 min-w-0">
            <p className={`text-[15px] leading-tight truncate ${task.completada ? 'text-gray-400 line-through' : 'text-gray-900 font-medium'}`}>
              {task.titulo}
            </p>
          </div>
          {task.fechaVencimiento && (
            <span className="text-xs text-gray-400 flex items-center gap-1 flex-shrink-0">
              <Calendar className="w-3 h-3"/> {format(new Date(task.fechaVencimiento), "d MMM", { locale: es })}
            </span>
          )}
        </div>
      </DialogTrigger>
      <DialogContent className="bg-white border border-gray-100/50 shadow-2xl w-[90%] max-w-sm rounded-3xl p-0 gap-0 overflow-hidden">
        <div className="p-6 border-b border-gray-100/50 flex items-center gap-3">
          <Checkbox completada={task.completada} onToggle={toggleComplete} />
          <DialogTitle className="text-xl font-semibold text-gray-900 leading-tight flex-1">
            {task.titulo}
          </DialogTitle>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto no-scrollbar">
          <TaskDetails task={task} onClose={() => setIsOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}