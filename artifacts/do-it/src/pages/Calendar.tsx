import React from 'react';
import { useGetTasks } from '@workspace/api-client-react';
import { BottomTabBar } from '../components/BottomTabBar';
import { format, isToday, isTomorrow, isPast, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

export default function Calendar() {
  const { data: tasks, isLoading } = useGetTasks();

  const groupedTasks = React.useMemo(() => {
    if (!tasks) return {};
    
    const groups: Record<string, typeof tasks> = {};
    
    tasks.forEach(task => {
      if (!task.fechaVencimiento) return;
      
      const date = startOfDay(new Date(task.fechaVencimiento));
      let key = '';
      
      if (isToday(date)) key = 'Hoy';
      else if (isTomorrow(date)) key = 'Mañana';
      else if (isPast(date)) key = 'Atrasadas';
      else key = format(date, "EEEE d 'de' MMMM", { locale: es });
      
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    });
    
    return groups;
  }, [tasks]);

  return (
    <div className="min-h-[100dvh] bg-white pb-32">
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-[#111111] mb-8">
          Calendario
        </h1>

        {isLoading ? (
          <div className="space-y-8 animate-pulse">
            {[1, 2].map((i) => (
              <div key={i}>
                <div className="h-5 bg-gray-100 rounded w-1/4 mb-4" />
                <div className="space-y-3">
                  <div className="h-4 bg-gray-50 rounded w-full" />
                  <div className="h-4 bg-gray-50 rounded w-3/4" />
                </div>
              </div>
            ))}
          </div>
        ) : Object.keys(groupedTasks).length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[#A3A3A3]">No hay tareas con fecha programada.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedTasks).map(([group, groupTasks]) => (
              <div key={group}>
                <h2 className="text-sm font-medium text-[#A3A3A3] mb-4 capitalize">
                  {group}
                </h2>
                <div className="space-y-1">
                  {groupTasks.map(task => (
                    <div 
                      key={task.id} 
                      className={`py-2 flex items-center gap-3 ${task.completada ? 'opacity-50 line-through' : ''}`}
                    >
                      <div className={`w-1.5 h-1.5 rounded-full ${task.completada ? 'bg-gray-300' : 'bg-black'}`} />
                      <span className="text-[#111111]">{task.titulo}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomTabBar />
    </div>
  );
}
