import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUpdateTask, useDeleteTask, getGetTasksQueryKey, getGetTaskStatsQueryKey } from '@workspace/api-client-react';
import { Task } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar, Trash2, Link as LinkIcon, AlignLeft } from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";

interface TaskItemProps {
  task: Task;
}

export function TaskItem({ task }: TaskItemProps) {
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const isMobile = useIsMobile();
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Evita que se abra el detalle al tachar
    const newStatus = !task.completada;

    queryClient.setQueryData(getGetTasksQueryKey({}), (old: Task[] | undefined) => {
      if (!old) return old;
      return old.map(t => t.id === task.id ? { ...t, completada: newStatus } : t);
    });

    updateTask.mutate(
      { id: task.id, data: { completada: newStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey({}) });
          queryClient.invalidateQueries({ queryKey: getGetTaskStatsQueryKey() });
        }
      }
    );
  };

  const handleDelete = () => {
    deleteTask.mutate({ id: task.id }, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey({}) })
    });
  };

  // Componente que dibuja la fila base
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
        {!isExpanded && (task.descripcion || task.fechaVencimiento) && (
          <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-400">
            {task.fechaVencimiento && (
              <span className="flex items-center gap-1"><Calendar className="w-3 h-3"/> {format(new Date(task.fechaVencimiento), "d MMM", { locale: es })}</span>
            )}
            {task.descripcion && (
              <span className="flex items-center gap-1 truncate"><AlignLeft className="w-3 h-3"/> {task.descripcion}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // Componente que muestra los detalles y el botón de borrar
  const Details = () => (
    <div className="pl-11 pr-2 pb-4 space-y-4">
      {task.descripcion && (
        <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 whitespace-pre-wrap">
          {task.descripcion}
        </div>
      )}

      <div className="flex items-center gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-1.5 bg-gray-50 px-3 py-1.5 rounded-lg">
          <Calendar className="w-4 h-4" /> 
          {task.fechaVencimiento ? format(new Date(task.fechaVencimiento), "EEEE d 'de' MMMM", { locale: es }) : "Sin fecha"}
          {task.horaVencimiento && ` • ${task.horaVencimiento}`}
        </div>
      </div>

      {task.links && task.links.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {task.links.map((link, i) => (
            <a key={i} href={link} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-medium hover:bg-blue-100 transition-colors">
              <LinkIcon className="w-3 h-3" /> Enlace {i + 1}
            </a>
          ))}
        </div>
      )}

      <div className="pt-2 flex justify-end">
        <button onClick={handleDelete} className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
          <Trash2 className="w-4 h-4" /> Eliminar tarea
        </button>
      </div>
    </div>
  );

  // MÓVIL: Muestra un Modal Central de cristal desenfocado
  if (isMobile) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <div><Row /></div>
        </DialogTrigger>
        <DialogContent className="bg-white/80 backdrop-blur-xl border border-gray-100/50 shadow-2xl w-[90%] max-w-sm rounded-3xl p-0 gap-0">
          <div className="p-6 border-b border-gray-100/50">
            <DialogTitle className="text-xl font-semibold text-gray-900 leading-tight">
              {task.titulo}
            </DialogTitle>
          </div>
          <div className="p-6">
            <Details />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // DESKTOP: Muestra un Acordeón que se expande hacia abajo
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