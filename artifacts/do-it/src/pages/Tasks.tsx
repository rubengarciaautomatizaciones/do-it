import React, { useState } from 'react';
import { useGetTasks, useCreateTask, getGetTasksQueryKey, getGetTaskStatsQueryKey } from '@workspace/api-client-react';
import { TaskItemMobile, TaskRowDesktop } from '../components/TaskItem';
import { MagicInput } from '../components/MagicInput';
import { BottomTabBar } from '../components/BottomTabBar';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '../hooks/use-mobile';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { Plus, Loader2 } from 'lucide-react';

export default function Tasks() {
  const { data: tasks, isLoading } = useGetTasks();
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const createTask = useCreateTask();

  // ORDEN CAMBIADO: Todas > Sin Hacer > Hechas
  const [filter, setFilter] = useState("todas"); 
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const filteredTasks = React.useMemo(() => {
    if (!tasks) return [];
    if (filter === "sin_hacer") return tasks.filter(t => !t.completada);
    if (filter === "hechas") return tasks.filter(t => t.completada);
    return tasks;
  }, [tasks, filter]);

  const handleCreateDesktop = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTaskTitle.trim() && user) {
      createTask.mutate({ data: { titulo: newTaskTitle.trim(), userId: user.id } }, {
        onSuccess: () => {
          setNewTaskTitle("");
          queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTaskStatsQueryKey() });
        }
      });
    }
  };

  return (
    <div className="min-h-[100dvh] bg-white pb-32">
      <div className="px-6 pt-12 pb-6 max-w-5xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight text-[#111111] mb-6">
          Tareas
        </h1>

        <Tabs defaultValue="todas" onValueChange={setFilter} className="mb-8">
          <TabsList className="bg-gray-50/50 border border-gray-100 p-1 rounded-full w-full md:w-auto justify-start h-auto">
            <TabsTrigger value="todas" className="rounded-full px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">Todas</TabsTrigger>
            <TabsTrigger value="sin_hacer" className="rounded-full px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">Sin Hacer</TabsTrigger>
            <TabsTrigger value="hechas" className="rounded-full px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">Hechas</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : isMobile ? (
          // VISTA MÓVIL: Lista limpia
          <motion.div layout className="flex flex-col gap-1">
            <AnimatePresence>
              {filteredTasks.map((task) => (
                <TaskItemMobile key={task.id} task={task} />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          // VISTA PC: Tabla estilo Notion/Sheets
          <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="w-12 p-3 text-center font-medium"></th>
                  <th className="p-3 font-medium">Título</th>
                  <th className="p-3 font-medium w-40">Fecha</th>
                  <th className="p-3 font-medium w-32">Adjuntos</th>
                  <th className="p-3 font-medium w-12"></th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredTasks.map(task => (
                    <TaskRowDesktop key={task.id} task={task} />
                  ))}
                </AnimatePresence>
                {/* Fila vacía para crear tareas (Estilo Notion) */}
                <tr className="group hover:bg-gray-50/50 transition-colors">
                  <td className="p-3 text-center text-gray-300"><Plus className="w-4 h-4 mx-auto" /></td>
                  <td colSpan={4} className="p-0">
                    <input 
                      type="text" 
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={handleCreateDesktop}
                      placeholder="Nueva tarea... (Presiona Enter)"
                      className="w-full bg-transparent border-0 p-3 focus:ring-0 text-gray-900 placeholder:text-gray-400 outline-none"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <MagicInput />
      <BottomTabBar />
    </div>
  );
}