import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUpdateTask, useDeleteTask, useAddTaskAttachment, getGetTasksQueryKey, getGetTaskStatsQueryKey } from '@workspace/api-client-react';
import { Task } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Trash2, Link as LinkIcon, AlignLeft, Paperclip, Plus, File, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';

interface TaskItemProps { task: Task; }

export function TaskItem({ task }: TaskItemProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const addAttachment = useAddTaskAttachment();
  const isMobile = useIsMobile();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isAddingLink, setIsAddingLink] = useState(false);
  const [newLink, setNewLink] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !task.completada;
    queryClient.setQueryData(getGetTasksQueryKey({}), (old: Task[] | undefined) => {
      if (!old) return old;
      return old.map(t => t.id === task.id ? { ...t, completada: newStatus } : t);
    });
    updateTask.mutate({ id: task.id, data: { completada: newStatus } }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey({}) });
        queryClient.invalidateQueries({ queryKey: getGetTaskStatsQueryKey() });
      }
    });
  };

  const handleDelete = () => {
    deleteTask.mutate({ id: task.id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey({}) })
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

  const Row = () => (
    <div className="flex items-start gap-4 py-3 group cursor-pointer hover:bg-gray-50/50 rounded-xl px-2 transition-colors -mx-2">
      <button onClick={toggleComplete} className="mt-1 flex-shrink-0 focus:outline-none">
        <motion.div
          animate={task.completada ? "checked" : "unchecked"}
          variants={{
            checked: { scale: [1, 0.8, 1.1, 1], backgroundColor: "#111111", borderColor: "#111111" },
            unchecked: { scale: 1, backgroundColor: "#FFFFFF", borderColor: "#E5E7EB" }
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
        >
          {task.completada && (
            <motion.svg initial={{ opacity: 0, pathLength: 0 }} animate={{ opacity: 1, pathLength: 1 }} className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </motion.svg>
          )}
        </motion.div>
      </button>
      <div className="flex-1 min-w-0 pt-0.5">
        <p className={`text-[15px] leading-tight transition-colors duration-200 ${task.completada ? 'text-gray-400 line-through' : 'text-gray-900 font-medium'}`}>
          {task.titulo}
        </p>
        {!isExpanded && (task.descripcion || task.fechaVencimiento || task.attachments?.length || task.links?.length) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-gray-400">
            {task.fechaVencimiento && <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {format(new Date(task.fechaVencimiento), "d MMM", { locale: es })}</span>}
            {task.attachments && task.attachments.length > 0 && <span className="flex items-center gap-1"><Paperclip className="w-3 h-3"/> {task.attachments.length}</span>}
            {task.links && task.links.length > 0 && <span className="flex items-center gap-1"><LinkIcon className="w-3 h-3"/> {task.links.length}</span>}
            {task.descripcion && <span className="flex items-center gap-1 truncate"><AlignLeft className="w-3 h-3"/> {task.descripcion}</span>}
          </div>
        )}
      </div>
    </div>
  );

  const Details = () => (
    <div className="pl-11 pr-2 pb-4 space-y-5">
      {task.descripcion && (
        <div className="bg-gray-50/80 rounded-xl p-3.5 text-[15px] leading-relaxed text-gray-600 whitespace-pre-wrap shadow-sm">
          {task.descripcion}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg text-sm text-gray-600 font-medium">
          <Calendar className="w-4 h-4" /> 
          {task.fechaVencimiento ? format(new Date(task.fechaVencimiento), "EEEE d 'de' MMMM", { locale: es }) : "Sin fecha"}
          {task.horaVencimiento && ` • ${task.horaVencimiento}`}
        </div>
      </div>

      {/* Enlaces y Archivos */}
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
                  {att.fileType.includes('image') ? <ImageIcon className="w-4 h-4 text-purple-600" /> : <File className="w-4 h-4 text-orange-600" />}
                </div>
                <span className="text-sm text-gray-700 truncate flex-1">{att.fileName}</span>
              </a>
            ))}
          </div>
        ) : null}

        {/* Botones de acción rápidos */}
        <div className="flex flex-wrap gap-2 pt-1">
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

  if (isMobile) {
    return (
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogTrigger asChild>
          <div><Row /></div>
        </DialogTrigger>
        <DialogContent className="bg-white/80 backdrop-blur-xl border border-gray-100/50 shadow-2xl w-[90%] max-w-sm rounded-3xl p-0 gap-0 overflow-hidden">
          <div className="p-6 border-b border-gray-100/50">
            <DialogTitle className="text-xl font-semibold text-gray-900 leading-tight pr-6">
              {task.titulo}
            </DialogTitle>
          </div>
          <div className="p-6 max-h-[70vh] overflow-y-auto">
            <Details />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="border-b border-gray-50 last:border-0">
      <div onClick={() => setIsExpanded(!isExpanded)}>
        <Row />
      </div>
      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <Details />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}