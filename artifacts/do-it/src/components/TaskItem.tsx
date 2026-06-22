import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import { useUpdateTask, getGetTasksQueryKey, getGetTaskStatsQueryKey } from '@workspace/api-client-react';
import { Task } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

interface TaskItemProps {
  task: Task;
}

export function TaskItem({ task }: TaskItemProps) {
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const updateRef = useRef(updateTask.mutate);
  updateRef.current = updateTask.mutate;

  const toggleComplete = () => {
    const newStatus = !task.completada;
    
    // Optimistic update
    queryClient.setQueryData(getGetTasksQueryKey(), (old: Task[] | undefined) => {
      if (!old) return old;
      return old.map(t => t.id === task.id ? { ...t, completada: newStatus } : t);
    });

    updateRef.current(
      { id: task.id, data: { completada: newStatus } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTaskStatsQueryKey() });
        },
        onError: () => {
          // Revert on error
          queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        }
      }
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-4 py-4 border-b border-gray-100 group"
    >
      <button 
        onClick={toggleComplete}
        className="mt-1 flex-shrink-0 focus:outline-none"
      >
        <motion.div
          animate={task.completada ? "checked" : "unchecked"}
          variants={{
            checked: { scale: [1, 0.8, 1.1, 1], backgroundColor: "#111111", borderColor: "#111111" },
            unchecked: { scale: 1, backgroundColor: "#FFFFFF", borderColor: "#F5F5F5" }
          }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
        >
          {task.completada && (
            <motion.svg 
              initial={{ opacity: 0, pathLength: 0 }}
              animate={{ opacity: 1, pathLength: 1 }}
              className="w-3 h-3 text-white" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="3" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </motion.svg>
          )}
        </motion.div>
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-base transition-colors duration-200 ${task.completada ? 'text-gray-400 line-through' : 'text-gray-900 font-medium'}`}>
          {task.titulo}
        </p>
        {(task.descripcion || task.fechaVencimiento) && (
          <div className="mt-1 flex flex-col gap-1">
            {task.descripcion && (
              <p className="text-sm text-gray-400 font-normal line-clamp-2">
                {task.descripcion}
              </p>
            )}
            {task.fechaVencimiento && (
              <p className="text-xs text-gray-400 font-medium">
                {format(new Date(task.fechaVencimiento), 'MMM d, yyyy')}
              </p>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
