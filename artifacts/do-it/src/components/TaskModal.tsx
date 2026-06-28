import React, { useState, useRef, useEffect } from 'react';
import { useUpdateTask, useAddTaskAttachment, getGetTasksQueryKey, Task } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Calendar, Link as LinkIcon, Paperclip, Plus, File, Mic, Clock, X, Bell, Folder, Loader2 } from 'lucide-react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { RichTextEditor } from './RichTextEditor';
import { Checkbox } from './TaskItem';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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

export function TaskModal({ task, isOpen, onClose }: { task: Task | null, isOpen: boolean, onClose: () => void }) {
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

  if (!task) return null;

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

  const toggleComplete = () => {
    updateTask.mutate({ id: task.id, data: { completada: !task.completada } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) });
  };

  const tasksData = queryClient.getQueryData<Task[]>(getGetTasksQueryKey());
  const projects = Array.from(new Set(tasksData?.map(t => t.proyecto).filter(Boolean) || []));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white border border-gray-100/50 shadow-2xl w-[95vw] sm:w-[calc(100vw-4rem)] max-w-4xl rounded-3xl p-0 gap-0 overflow-hidden">
        <div className="p-6 border-b border-gray-100/50 flex items-center gap-4">
          <Checkbox completada={task.completada} onToggle={toggleComplete} />
          <div className="flex-1">
            <EditableTitle task={task} />
          </div>
        </div>
        <div className="p-6 max-h-[70vh] overflow-y-auto no-scrollbar space-y-8">
          <RichTextEditor content={task.descripcion || ''} onChange={handleDescriptionChange} />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Proyecto</p>
              <div className="flex items-center gap-2">
                <Folder className="w-4 h-4 text-gray-500" />
                {isCreatingProject ? (
                  <input 
                    autoFocus type="text" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} 
                    onBlur={saveNewProject} onKeyDown={(e) => e.key === 'Enter' && saveNewProject()}
                    placeholder="Nombre del proyecto..." className="bg-transparent border-0 p-0 text-sm text-gray-900 focus:ring-0 outline-none w-full" 
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
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Programación</p>
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <input type="date" value={task.fechaVencimiento || ''} onChange={(e) => updateTask.mutate({ id: task.id, data: { fechaVencimiento: e.target.value || null } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) })} className="bg-transparent border-0 p-0 text-sm text-gray-900 focus:ring-0 cursor-pointer outline-none w-full" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <span className="text-xs text-gray-400 w-8">Inicio</span>
                <input type="time" value={task.horaInicio || ''} onChange={(e) => updateTask.mutate({ id: task.id, data: { horaInicio: e.target.value || null } }, { onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }) })} className="bg-transparent border-0 p-0 text-sm text-gray-900 focus:ring-0 cursor-pointer outline-none w-full" />
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500 opacity-0" />
                <span className="text-xs text-gray-400 w-8">Fin</span>
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
            {(task.links && task.links.length > 0) || (task.attachments && task.attachments.length > 0) ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {task.links?.map((link, i) => (
                  <a key={i} href={link} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition-all group relative">
                    <LinkIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 truncate">{link}</span>
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeLink(link); }} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-black bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                  </a>
                ))}
                {task.attachments?.map((att) => (
                  <a key={att.id} href={att.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition-all group relative">
                    <File className="w-5 h-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 truncate">{att.fileName}</span>
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeAttachment(att.id); }} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-black bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3 h-3" /></button>
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}