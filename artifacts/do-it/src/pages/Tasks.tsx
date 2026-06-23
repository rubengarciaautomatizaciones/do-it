import React, { useState } from 'react';
import { useGetTasks } from '@workspace/api-client-react';
import { TaskItem } from '../components/TaskItem';
import { MagicInput } from '../components/MagicInput';
import { BottomTabBar } from '../components/BottomTabBar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { motion, AnimatePresence } from 'framer-motion';

export default function Tasks() {
  const { data: tasks, isLoading } = useGetTasks();
  const [filter, setFilter] = useState("sin_hacer"); // sin_hacer, hechas, todas

  const filteredTasks = React.useMemo(() => {
    if (!tasks) return [];
    if (filter === "sin_hacer") return tasks.filter(t => !t.completada);
    if (filter === "hechas") return tasks.filter(t => t.completada);
    return tasks;
  }, [tasks, filter]);

  return (
    <div className="min-h-[100dvh] bg-white pb-32">
      <div className="px-6 pt-12 pb-6 max-w-2xl mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight text-[#111111] mb-6">
          Tareas
        </h1>

        <Tabs defaultValue="sin_hacer" onValueChange={setFilter} className="mb-8">
          <TabsList className="bg-gray-50/50 border border-gray-100 p-1 rounded-full w-full justify-start h-auto">
            <TabsTrigger value="sin_hacer" className="rounded-full px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">Sin Hacer</TabsTrigger>
            <TabsTrigger value="hechas" className="rounded-full px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">Hechas</TabsTrigger>
            <TabsTrigger value="todas" className="rounded-full px-6 py-2 data-[state=active]:bg-white data-[state=active]:shadow-sm text-sm">Todas</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 py-4 border-b border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-100 animate-pulse" />
                <div className="h-5 bg-gray-100 rounded w-3/4 animate-pulse" />
              </div>
            ))}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[#A3A3A3]">No hay tareas aquí.</p>
          </div>
        ) : (
          <motion.div layout className="flex flex-col gap-2">
            <AnimatePresence>
              {filteredTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <MagicInput />
      <BottomTabBar />
    </div>
  );
}