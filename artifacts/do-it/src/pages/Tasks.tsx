import React, { useState } from 'react';
import { useGetTasks, getGetTasksQueryKey, Task } from '@workspace/api-client-react';
import { TaskItemMobile, TaskRowDesktop } from '../components/TaskItem';
import { MagicInput } from '../components/MagicInput';
import { BottomTabBar } from '../components/BottomTabBar';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '../hooks/use-mobile';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';

export default function Tasks() {
  const { data: tasks, isLoading } = useGetTasks();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState("todas"); 
  const [sortBy, setSortBy] = useState("orden");
  const [projectFilter, setProjectFilter] = useState("Todos");

  const projects = React.useMemo(() => {
    if (!tasks) return ["Todos"];
    const unique = new Set(tasks.map(t => t.proyecto).filter(Boolean));
    return ["Todos", ...Array.from(unique)];
  }, [tasks]);

  const filteredAndSortedTasks = React.useMemo(() => {
    if (!tasks) return [];
    let result = [...tasks];

    if (filter === "sin_hacer") result = result.filter(t => !t.completada);
    if (filter === "hechas") result = result.filter(t => t.completada);
    if (projectFilter !== "Todos") result = result.filter(t => t.proyecto === projectFilter);

    result.sort((a, b) => {
      if (sortBy === "fecha_limite") {
        if (!a.fechaVencimiento) return 1;
        if (!b.fechaVencimiento) return -1;
        return new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime();
      }
      if (sortBy === "recientes") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "antiguas") return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sortBy === "modificacion") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (sortBy === "proyecto") return (a.proyecto || "").localeCompare(b.proyecto || "");
      return (a.orden || 0) - (b.orden || 0);
    });

    return result;
  }, [tasks, filter, sortBy, projectFilter]);

  // DND: Añadimos un retraso de 5px para que no secuestre los clicks normales
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = filteredAndSortedTasks.findIndex(t => t.id === active.id);
      const newIndex = filteredAndSortedTasks.findIndex(t => t.id === over.id);
      const newOrder = arrayMove(filteredAndSortedTasks, oldIndex, newIndex);
      queryClient.setQueryData(getGetTasksQueryKey(), newOrder);
    }
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-white overflow-hidden">

      <div className="px-6 pt-12 pb-4 flex-shrink-0 w-full max-w-7xl mx-auto bg-white z-20">
        <h1 className="text-3xl font-semibold tracking-tight text-[#111111] mb-6">
          Tareas
        </h1>

      // Reemplaza la zona de {/* PASTILLAS CON EL MISMO DISEÑO */} de Tasks.tsx con esto:

      <div className="bg-gray-50 border border-gray-100 p-1.5 rounded-full flex flex-wrap items-center gap-2 w-fit">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="bg-white rounded-full border border-gray-100/50 shadow-sm text-sm font-medium px-4 py-1.5 h-auto focus:ring-0 focus:ring-offset-0">
            <SelectValue placeholder="Estado..." />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="sin_hacer">Sin Hacer</SelectItem>
            <SelectItem value="hechas">Hechas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="bg-white rounded-full border border-gray-100/50 shadow-sm text-sm font-medium px-4 py-1.5 h-auto focus:ring-0 focus:ring-offset-0">
            <SelectValue placeholder="Ordenar por..." />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="orden">Orden manual</SelectItem>
            <SelectItem value="fecha_limite">Fecha límite</SelectItem>
            <SelectItem value="recientes">Más recientes</SelectItem>
            <SelectItem value="antiguas">Más antiguas</SelectItem>
            <SelectItem value="modificacion">Última modificación</SelectItem>
            <SelectItem value="proyecto">Proyecto (A-Z)</SelectItem>
          </SelectContent>
        </Select>

        <Select value={projectFilter} onValueChange={setProjectFilter}>
          <SelectTrigger className="bg-white rounded-full border border-gray-100/50 shadow-sm text-sm font-medium px-4 py-1.5 h-auto focus:ring-0 focus:ring-offset-0">
            <SelectValue placeholder="Proyecto..." />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            {projects.map(p => <SelectItem key={p} value={p}>{p || "Sin proyecto"}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar relative px-6 w-full max-w-7xl mx-auto pb-40">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : isMobile ? (
          <motion.div layout className="flex flex-col gap-1">
            <AnimatePresence>
              {filteredAndSortedTasks.map((task) => (
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
                  <th className="w-1/4 p-3 font-medium">Descripción</th>
                  <th className="w-32 p-3 font-medium">Límite</th>
                  <th className="w-32 p-3 font-medium">Notificación</th>
                  <th className="w-32 p-3 font-medium">Proyecto</th>
                  <th className="w-24 p-3 font-medium">Adjuntos</th>
                  <th className="w-14 p-3 font-medium"></th>
                </tr>
              </thead>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={filteredAndSortedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <tbody className="bg-white">
                    <AnimatePresence>
                      {filteredAndSortedTasks.map(task => (
                        <TaskRowDesktop key={task.id} task={task} />
                      ))}
                    </AnimatePresence>
                  </tbody>
                </SortableContext>
              </DndContext>
            </table>
          </div>
        )}
      </div>

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-white via-white/90 to-transparent z-30" />

      <MagicInput />
      <BottomTabBar />
    </div>
  );
}