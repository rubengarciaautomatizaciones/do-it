import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUpdateTask, useDeleteTask, getGetTasksQueryKey, Task } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Trash2, Link as LinkIcon, Paperclip } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { TaskModal } from './TaskModal';

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

function DeleteConfirmButton({ onDelete }: { onDelete: (e: React.MouseEvent) => void }) {
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isConfirming) timer = setTimeout(() => setIsConfirming(false), 2000);
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

export function TaskRowDesktop({ task, currentFilter }: { task: Task, currentFilter: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    <>
      <motion.tr 
        ref={setNodeRef} style={style} {...attributes} {...listeners}
        layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 100, transition: { duration: 0.3 } }}
        onClick={() => setIsModalOpen(true)}
        className={`group border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer`}
      >
        <td className="p-2 text-center"><Checkbox completada={localCompletada} onToggle={toggleComplete} /></td>
        <td className={`p-3 text-[15px] truncate ${localCompletada ? 'text-gray-400 line-through' : 'text-gray-900 font-medium'}`}>{task.titulo}</td>
        <td className="p-3 text-gray-500 text-sm truncate">{plainTextDescription}</td>
        <td className="p-3 text-gray-500 text-sm whitespace-nowrap">
          {task.fechaVencimiento ? `${format(new Date(task.fechaVencimiento), "d MMM yyyy", { locale: es })}${task.horaVencimiento ? ` · ${task.horaVencimiento}` : ''}` : ''}
        </td>
        <td className="p-3 text-gray-500 text-sm whitespace-nowrap">
          {task.fechaNotificacion ? `${format(new Date(task.fechaNotificacion), "d MMM yyyy", { locale: es })}${task.horaNotificacion ? ` · ${task.horaNotificacion}` : ''}` : ''}
        </td>
        <td className="p-3 text-gray-500 text-sm whitespace-nowrap">{task.proyecto}</td>
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
      <TaskModal task={task} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}

export function TaskItemMobile({ task, currentFilter }: { task: Task, currentFilter: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
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
    <>
      <motion.div 
        layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: 100, transition: { duration: 0.3 } }}
        onClick={() => setIsModalOpen(true)}
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
      <TaskModal task={task} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}