import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { useUpdateTask, useDeleteTask, useAddTaskAttachment, getGetTasksQueryKey, getGetTaskStatsQueryKey, Task } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Trash2, Link as LinkIcon, Paperclip, Plus, File, Image as ImageIcon, Loader2, Mic, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { RichTextEditor } from './RichTextEditor';

// --- COMPONENTE DE DETALLES COMPARTIDO ---
function TaskDetails({ task, onClose }: { task: Task, onClose?: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const addAttachment = useAddTaskAttachment();

  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLink, setNewLink] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDescriptionChange = (html: string) => {
    updateTask.mutate({ id: task.id, data: { descripcion: html } }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey({}) })
    });
  };

  const handleDelete = (e?: React.MouseEvent) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    if (onClose) onClose(); 
    deleteTask.mutate({ id: task.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getGetTaskStatsQueryKey() });
        toast({ title: "Tarea eliminada" });
      }
    });
  };

  const handleAddLink = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLink.trim()) return;
    const updatedLinks = [...(task.links || []), newLink.trim()];
    updateTask.mutate({ id: task.id, data: { links: updatedLinks } }, {
      onSuccess: () => {
        setIsAddingLink(false);
        setNewLink("");
        queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey({}) });
      }
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    toast({ title: "Subiendo archivo..." });

    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    const { data, error } = await supabase.storage.from('attachments').upload(filePath, file);

    if (error) {
      toast({ title: "Error al subir", description: error.message, variant: "destructive" });
      setIsUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(data.path);

    addAttachment.mutate({
      id: task.id,
      data: { fileName: file.name, fileUrl: publicUrl, fileType: file.type }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey({}) });
        toast({ title: "Archivo adjuntado" });
        setIsUploading(false);
      }
    });
  };

  return (
    <div className="space-y-6 pt-2">
      <RichTextEditor content={task.descripcion || ''} onChange={handleDescriptionChange} />

      {/* SELECTOR DE FECHA Y HORA NATIVO */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
          <Calendar className="w-4 h-4 text-gray-500" />
          <input 
            type="date" 
            value={task.fechaVencimiento || ''} 
            onChange={(e) => updateTask.mutate({ id: task.id, data: { fechaVencimiento: e.target.value || null } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey({}) }) })}
            className="bg-transparent border-0 p-0 text-sm text-gray-700 focus:ring-0 cursor-pointer outline-none"
          />
        </div>
        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
          <Clock className="w-4 h-4 text-gray-500" />
          <input 
            type="time" 
            value={task.horaVencimiento || ''} 
            onChange={(e) => updateTask.mutate({ id: task.id, data: { horaVencimiento: e.target.value || null } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey({}) }) })}
            className="bg-transparent border-0 p-0 text-sm text-gray-700 focus:ring-0 cursor-pointer outline-none"
          />
        </div>
      </div>

      <div className="space-y-3">
        {(task.links && task.links.length > 0) || (task.attachments && task.attachments.length > 0) ? (
          <div className="flex flex-col gap-2">
            {task.links?.map((link, i) => (
              <a key={i} href={link.startsWith('http') ? link : `https://${link}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group/link">
                <div className="bg-white p-2 rounded-lg shadow-sm group-hover/link:shadow"><LinkIcon className="w-4 h-4 text-blue-600" /></div>
                <span className="text-sm text-gray-700 truncate flex-1">{link}</span>
              </a>
            ))}
            {task.attachments?.map((att) => (
              <a key={att.id} href={att.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group/file">
                <div className="bg-white p-2 rounded-lg shadow-sm group-hover/file:shadow">
                  {att.fileType.includes('audio') ? <Mic className="w-4 h-4 text-green-600" /> :
                   att.fileType.includes('image') ? <ImageIcon className="w-4 h-4 text-purple-600" /> : 
                   <File className="w-4 h-4 text-orange-600" />}
                </div>
                <span className="text-sm text-gray-700 truncate flex-1">{att.fileName}</span>
              </a>
            ))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          {isAddingLink ? (
            <form onSubmit={handleAddLink} className="flex flex-1 gap-2">
              <input autoFocus type="text" value={newLink} onChange={e => setNewLink(e.target.value)} placeholder="https://..." className="flex-1 text-sm bg-gray-50 border-0 rounded-lg px-3 py-2 focus:ring-1 focus:ring-black" />
              <button type="submit" className="bg-black text-white px-3 py-2 rounded-lg text-sm font-medium">Añadir</button>
              <button type="button" onClick={() => setIsAddingLink(false)} className="px-3 py-2 text-sm text-gray-500 font-medium hover:bg-gray-50 rounded-lg">Cancelar</button>
            </form>
          ) : (
            <button onClick={() => setIsAddingLink(true)} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-black hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors">
              <Plus className="w-4 h-4" /> Enlace
            </button>
          )}

          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          <button disabled={isUploading} onClick={() => fileInputRef.current?.click()} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-black hover:bg-gray-50 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50">
            {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Paperclip className="w-4 h-4" />} Archivo
          </button>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-100 flex justify-end">
        <button onClick={handleDelete} className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 font-medium px-3 py-2 rounded-xl hover:bg-red-50 transition-colors">
          <Trash2 className="w-4 h-4" /> Eliminar
        </button>
      </div>
    </div>
  );
}

// --- CHECKBOX ANIMADO ---
function Checkbox({ completada, onToggle }: { completada: boolean, onToggle: (e: React.MouseEvent) => void }) {
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

// --- VISTA MÓVIL ---
export function TaskItemMobile({ task }: { task: Task }) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();

  const toggleComplete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newStatus = !task.completada;
    updateTask.mutate({ id: task.id, data: { completada: newStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getGetTaskStatsQueryKey() });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <div className="flex items-center gap-3 py-3 px-2 hover:bg-gray-50/50 rounded-xl cursor-pointer transition-colors">
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
      <DialogContent className="bg-white/80 backdrop-blur-xl border border-gray-100/50 shadow-2xl w-[90%] max-w-sm rounded-3xl p-0 gap-0 overflow-hidden">
        <div className="p-6 border-b border-gray-100/50">
          <DialogTitle className="text-xl font-semibold text-gray-900 leading-tight pr-6">
            {task.titulo}
          </DialogTitle>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <TaskDetails task={task} onClose={() => setIsOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- VISTA PC (Fila de Tabla que abre Modal) ---
export function TaskRowDesktop({ task }: { task: Task }) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const toggleComplete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newStatus = !task.completada;
    updateTask.mutate({ id: task.id, data: { completada: newStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getGetTaskStatsQueryKey() });
      }
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    deleteTask.mutate({ id: task.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getGetTaskStatsQueryKey() });
      }
    });
  };

  // Limpiar HTML de la descripción para la previsualización
  const plainTextDescription = task.descripcion ? task.descripcion.replace(/<[^>]*>?/gm, '') : '';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <motion.tr 
          layout
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="group border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer"
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
            {(task.attachments?.length > 0 || task.links?.length > 0) && (
              <div className="flex items-center gap-2">
                {task.attachments?.length > 0 && <span className="flex items-center gap-1"><Paperclip className="w-3 h-3"/> {task.attachments.length}</span>}
                {task.links?.length > 0 && <span className="flex items-center gap-1"><LinkIcon className="w-3 h-3"/> {task.links.length}</span>}
              </div>
            )}
          </td>
          <td className="p-3 text-right" onClick={e => e.stopPropagation()}>
            <button onClick={handleDelete} className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </td>
        </motion.tr>
      </DialogTrigger>
      <DialogContent className="bg-white/80 backdrop-blur-xl border border-gray-100/50 shadow-2xl w-[90%] max-w-2xl rounded-3xl p-0 gap-0 overflow-hidden">
        <div className="p-6 border-b border-gray-100/50">
          <DialogTitle className="text-2xl font-semibold text-gray-900 leading-tight pr-6">
            {task.titulo}
          </DialogTitle>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          <TaskDetails task={task} onClose={() => setIsOpen(false)} />
        </div>
      </DialogContent>
    </Dialog>
  );
}