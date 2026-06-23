import React, { useState } from 'react';
import { useGetTasks } from '@workspace/api-client-react';
import { TaskItemMobile, TaskRowDesktop } from '../components/TaskItem';
import { MagicInput } from '../components/MagicInput';
import { BottomTabBar } from '../components/BottomTabBar';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '../hooks/use-mobile';
import { Loader2 } from 'lucide-react';

export default function Tasks() {
  const { data: tasks, isLoading } = useGetTasks();
  const isMobile = useIsMobile();

  const [filter, setFilter] = useState("todas"); 

  const filteredTasks = React.useMemo(() => {
    if (!tasks) return [];
    if (filter === "sin_hacer") return tasks.filter(t => !t.completada);
    if (filter === "hechas") return tasks.filter(t => t.completada);
    return tasks;
  }, [tasks, filter]);

  return (
    <div className="h-[100dvh] flex flex-col bg-white overflow-hidden">

      {/* HEADER FIJO */}
      <div className="px-6 pt-12 pb-4 flex-shrink-0 w-full max-w-7xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight text-[#111111] mb-6">
          Tareas
        </h1>
        <Tabs defaultValue="todas" onValueChange={setFilter}>
          <TabsList className="bg-gray-50/50 border border-gray-100 p-1 rounded-full w-full md:w-auto justify-start h-auto">
            <TabsTrigger value="todas" className="rounded-full px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">Todas</TabsTrigger>
            <TabsTrigger value="sin_hacer" className="rounded-full px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">Sin Hacer</TabsTrigger>
            <TabsTrigger value="hechas" className="rounded-full px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">Hechas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* ÁREA SCROLLABLE (TABLA O LISTA) */}
      <div className="flex-1 overflow-y-auto relative px-6 w-full max-w-7xl mx-auto pb-40">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : isMobile ? (
          <motion.div layout className="flex flex-col gap-1">
            <AnimatePresence>
              {filteredTasks.map((task) => (
                <TaskItemMobile key={task.id} task={task} />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm text-left table-fixed">
              <thead className="bg-gray-50/80 text-gray-500 border-b border-gray-100 sticky top-0 z-10">
                <tr>
                  <th className="w-14 p-3 text-center font-medium"></th>
                  <th className="w-1/4 p-3 font-medium">Título</th>
                  <th className="w-1/3 p-3 font-medium">Descripción</th>
                  <th className="w-32 p-3 font-medium">Fecha</th>
                  <th className="w-32 p-3 font-medium">Adjuntos</th>
                  <th className="w-14 p-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {filteredTasks.map(task => (
                    <TaskRowDesktop key={task.id} task={task} />
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* DEGRADADO BLANCO INFERIOR */}
      <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white via-white/90 to-transparent z-30" />

      <MagicInput />
      <BottomTabBar />
    </div>
  );
}