import React, { useState } from 'react';
import { useGetTasks, getGetTasksQueryKey } from '@workspace/api-client-react';
import { TaskItemMobile, TaskRowDesktop } from '../components/TaskItem';
import { MagicInput } from '../components/MagicInput';
import { BottomTabBar } from '../components/BottomTabBar';
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

      <div className="px-3 md:px-6 pt-12 pb-4 flex-shrink-0 w-full max-w-[1600px] mx-auto bg-white z-20">
        <h1 className="text-3xl font-semibold tracking-tight text-[#111111] mb-6">
          Tareas
        </h1>

        {/* FILTROS ESTRICTAMENTE HORIZONTALES */}
        <div className="bg-gray-50 border border-gray-100 p-1.5 rounded-full flex flex-row flex-nowrap items-center gap-2 w-fit max-w-full overflow-x-auto no-scrollbar">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="bg-white rounded-full border border-gray-100/50 shadow-sm text-sm font-medium px-4 py-1.5 h-auto focus:ring-0 focus:ring-offset-0 whitespace-nowrap">
              <SelectValue placeholder="Estado..." />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="todas">Todas</SelectItem>
              <SelectItem value="sin_hacer">Sin Hacer</SelectItem>
              <SelectItem value="hechas">Hechas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="bg-white rounded-full border border-gray-100/50 shadow-sm text-sm font-medium px-4 py-1.5 h-auto focus:ring-0 focus:ring-offset-0 whitespace-nowrap">
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
            <SelectTrigger className="bg-white rounded-full border border-gray-100/50 shadow-sm text-sm font-medium px-4 py-1.5 h-auto focus:ring-0 focus:ring-offset-0 whitespace-nowrap">
              <SelectValue placeholder="Proyecto..." />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {projects.map(p => <SelectItem key={p} value={p}>{p || "Sin proyecto"}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* CONTENEDOR DE LA TABLA CON SCROLL INDEPENDIENTE PARA STICKY HEADER */}
      <div className="flex-1 relative w-full max-w-[1600px] mx-auto px-2 md:px-6 pb-32 flex flex-col min-h-0">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : isMobile ? (
          <div className="overflow-y-auto no-scrollbar h-full pb-20">
            <motion.div layout className="flex flex-col gap-1">
              <AnimatePresence>
                {filteredAndSortedTasks.map((task) => (
                  <TaskItemMobile key={task.id} task={task} />
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto no-scrollbar border border-gray-100 rounded-xl shadow-sm bg-white relative">
            <table className="w-full text-sm text-left table-fixed">
              <thead className="bg-gray-50/95 backdrop-blur-sm text-gray-500 border-b border-gray-100 sticky top-0 z-20">
                <tr>
                  <th className="w-14 p-3 text-center font-medium"></th>
                  <th className="w-1/4 p-3 font-medium">Título</th>
                  <th className="w-1/4 p-3 font-medium">Descripción</th>
                  <th className="w-40 p-3 font-medium">Límite</th>
                  <th className="w-40 p-3 font-medium">Notificación</th>
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

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-white/90 to-transparent z-30" />

      <MagicInput />
      <BottomTabBar />
    </div>
  );
}