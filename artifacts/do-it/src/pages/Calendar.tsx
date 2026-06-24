// artifacts/do-it/src/pages/Calendar.tsx
import React, { useState, useMemo } from 'react';
import { useGetTasks } from '@workspace/api-client-react';
import { BottomTabBar } from '../components/BottomTabBar';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, addMonths, subMonths, startOfWeek, endOfWeek } from 'date-fns';
import { es } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export default function Calendar() {
  const { data: tasks } = useGetTasks();
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const tasksByDate = useMemo(() => {
    if (!tasks) return {};
    const map: Record<string, typeof tasks> = {};
    tasks.forEach(task => {
      if (!task.fechaVencimiento) return;
      const dateStr = task.fechaVencimiento;
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push(task);
    });
    return map;
  }, [tasks]);

  return (
    <div className="min-h-[100dvh] bg-white pb-32 flex flex-col">
      <div className="px-6 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-[#111111]">Calendario</h1>
        <button className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black transition-colors bg-gray-50 px-3 py-1.5 rounded-full">
          <CalendarIcon className="w-4 h-4" /> Conectar Google
        </button>
      </div>

      <div className="px-6 flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-gray-900 capitalize">
          {format(currentDate, 'MMMM yyyy', { locale: es })}
        </h2>
        <div className="flex gap-2">
          <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* GRID DEL CALENDARIO */}
      <div className="flex-1 px-6 overflow-x-auto no-scrollbar">
        <div className="min-w-[700px] border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/50">
          {/* Cabecera días de la semana */}
          <div className="grid grid-cols-7 border-b border-gray-100 bg-white">
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(day => (
              <div key={day} className="py-3 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          {/* Celdas de días */}
          <div className="grid grid-cols-7 auto-rows-[minmax(100px,auto)] bg-gray-100 gap-px">
            {daysInMonth.map((day, idx) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayTasks = tasksByDate[dateKey] || [];
              const isCurrentMonth = isSameMonth(day, currentDate);
              const isDayToday = isToday(day);

              return (
                <div key={idx} className={`bg-white p-2 flex flex-col gap-1 transition-colors hover:bg-gray-50/30 ${!isCurrentMonth ? 'opacity-40' : ''}`}>
                  <div className="flex justify-end mb-1">
                    <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isDayToday ? 'bg-black text-white' : 'text-gray-500'}`}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 overflow-y-auto no-scrollbar max-h-[80px]">
                    {dayTasks.map(task => (
                      <div key={task.id} className={`text-[10px] px-1.5 py-1 rounded truncate font-medium ${task.completada ? 'bg-gray-100 text-gray-400 line-through' : 'bg-gray-100 text-gray-800'}`}>
                        {task.titulo}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <BottomTabBar />
    </div>
  );
}