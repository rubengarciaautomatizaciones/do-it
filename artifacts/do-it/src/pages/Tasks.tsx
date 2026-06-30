import React, { useState, useEffect } from 'react';
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
import { Onboarding } from '../components/Onboarding';
import { useTranslation } from '../contexts/I18nContext';

export default function Tasks() {
  const { data: tasks, isLoading } = useGetTasks();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  const [filter, setFilter] = useState(() => localStorage.getItem("doit_filter") || "todas"); 
  const [sortBy, setSortBy] = useState(() => localStorage.getItem("doit_sortBy") || "orden");
  const [projectFilter, setProjectFilter] = useState(() => localStorage.getItem("doit_projectFilter") || "Todos");

  useEffect(() => { localStorage.setItem("doit_filter", filter); }, [filter]);
  useEffect(() => { localStorage.setItem("doit_sortBy", sortBy); }, [sortBy]);
  useEffect(() => { localStorage.setItem("doit_projectFilter", projectFilter); }, [projectFilter]);

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
        <h1 className="text-3xl font-semibold tracking-tight text-[#111111] mb-6">{t('tasks.title')}</h1>

        <div className="bg-gray-50 border border-gray-100 p-1.5 rounded-full flex flex-row flex-nowrap items-center gap-2 w-fit max-w-full overflow-x-auto no-scrollbar">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="bg-white rounded-full border border-gray-100/50 shadow-sm text-sm font-medium px-4 py-1.5 h-auto focus:ring-0 focus:ring-offset-0 whitespace-nowrap">
              <SelectValue placeholder={t('tasks.filter.status')} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="todas">{t('tasks.filter.all')}</SelectItem>
              <SelectItem value="sin_hacer">{t('tasks.filter.todo')}</SelectItem>
              <SelectItem value="hechas">{t('tasks.filter.done')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="bg-white rounded-full border border-gray-100/50 shadow-sm text-sm font-medium px-4 py-1.5 h-auto focus:ring-0 focus:ring-offset-0 whitespace-nowrap">
              <SelectValue placeholder={t('tasks.sort.by')} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="orden">{t('tasks.sort.manual')}</SelectItem>
              <SelectItem value="fecha_limite">{t('tasks.sort.date')}</SelectItem>
              <SelectItem value="recientes">{t('tasks.sort.recent')}</SelectItem>
              <SelectItem value="antiguas">{t('tasks.sort.old')}</SelectItem>
              <SelectItem value="modificacion">{t('tasks.sort.mod')}</SelectItem>
              <SelectItem value="proyecto">{t('tasks.sort.project')}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="bg-white rounded-full border border-gray-100/50 shadow-sm text-sm font-medium px-4 py-1.5 h-auto focus:ring-0 focus:ring-offset-0 whitespace-nowrap">
              <SelectValue placeholder={t('tasks.project.filter')} />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              {projects.map(p => <SelectItem key={p} value={p}>{p === "Todos" ? t('tasks.filter.all') : (p || t('tasks.project.none'))}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div id="tour-task-list" className="flex-1 relative w-full max-w-[1600px] mx-auto px-2 md:px-6 flex flex-col min-h-0">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : isMobile ? (
          <div className="overflow-y-auto no-scrollbar h-full pb-56">
            <motion.div layout className="flex flex-col gap-1">
              <AnimatePresence>
                {filteredAndSortedTasks.map((task) => (
                  <TaskItemMobile key={task.id} task={task} currentFilter={filter} />
                ))}
              </AnimatePresence>
            </motion.div>
          </div>
        ) : (
          <div className="flex-1 overflow-x-auto overflow-y-auto no-scrollbar border-t border-x border-gray-100 rounded-t-xl bg-white relative pb-56">
            <table className="w-full text-sm text-left table-fixed min-w-[900px]">
              <thead className="bg-gray-50/95 backdrop-blur-sm text-gray-500 border-b border-gray-100 sticky top-0 z-20">
                <tr>
                  <th className="w-14 p-3 text-center font-medium"></th>
                  <th className="w-2/12 p-3 font-medium">{t('tasks.col.title')}</th>
                  <th className="w-3/12 p-3 font-medium">{t('tasks.col.desc')}</th>
                  <th className="w-32 p-3 font-medium">{t('tasks.col.limit')}</th>
                  <th className="w-32 p-3 font-medium">{t('tasks.col.notif')}</th>
                  <th className="w-28 p-3 font-medium">{t('tasks.col.project')}</th>
                  <th className="w-24 p-3 font-medium">{t('tasks.col.attach')}</th>
                  <th className="w-16 p-3 font-medium"></th>
                </tr>
              </thead>
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={filteredAndSortedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <tbody className="bg-white">
                    <AnimatePresence>
                      {filteredAndSortedTasks.map(task => (
                        <TaskRowDesktop key={task.id} task={task} currentFilter={filter} />
                      ))}
                    </AnimatePresence>
                  </tbody>
                </SortableContext>
              </DndContext>
            </table>
          </div>
        )}
      </div>

      <div className="pointer-events-none fixed bottom-0 left-0 right-0 h-24 bg-white z-30" />
      <div className="pointer-events-none fixed bottom-24 left-0 right-0 h-15 bg-gradient-to-t from-white via-white/50 to-transparent z-30" />

      <Onboarding />
      <MagicInput />
      <BottomTabBar />
    </div>
  );
}