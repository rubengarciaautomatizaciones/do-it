// artifacts/do-it/src/pages/Habits.tsx
import React, { useState, useMemo } from 'react';
import { useGetHabits, useCreateHabit, useLogHabit, useUnlogHabit, getGetHabitsQueryKey } from '@workspace/api-client-react';
import { BottomTabBar } from '../components/BottomTabBar';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { format, subDays, addDays, isToday, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Checkbox } from '../components/TaskItem';

export default function Habits() {
  const { user } = useAuth();
  const { data: habits, isLoading } = useGetHabits();
  const createHabit = useCreateHabit();
  const logHabit = useLogHabit();
  const unlogHabit = useUnlogHabit();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newHabitName, setNewHabitName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  // --- LÓGICA DE ESTADÍSTICAS ---
  const stats = useMemo(() => {
    if (!habits || habits.length === 0) return { todayCompleted: 0, total: 0, percent: 0, weeklyData: [] };

    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const todayCompleted = habits.filter(h => h.logs?.includes(dateStr)).length;
    const percent = Math.round((todayCompleted / habits.length) * 100);

    // Datos para el BarChart (últimos 7 días)
    const weeklyData = Array.from({ length: 7 }).map((_, i) => {
      const d = subDays(new Date(), 6 - i);
      const dStr = format(d, 'yyyy-MM-dd');
      const completed = habits.filter(h => h.logs?.includes(dStr)).length;
      return {
        name: format(d, 'EEEEEE', { locale: es }).toUpperCase(),
        completados: completed,
        total: habits.length,
        fullDate: format(d, "d 'de' MMMM", { locale: es })
      };
    });

    return { todayCompleted, total: habits.length, percent, weeklyData };
  }, [habits, selectedDate]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim() || !user) return;
    createHabit.mutate({ data: { nombre: newHabitName.trim(), userId: user.id } }, {
      onSuccess: () => {
        setNewHabitName('');
        setIsAdding(false);
        queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() });
      }
    });
  };

  const handleToggleLog = (habitId: string, isLogged: boolean) => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    // Optimistic update
    queryClient.setQueryData(getGetHabitsQueryKey(), (old: any) => {
      if (!old) return old;
      return old.map((h: any) => {
        if (h.id === habitId) {
          const newLogs = isLogged ? h.logs.filter((l: string) => l !== dateStr) : [...h.logs, dateStr];
          return { ...h, logs: newLogs };
        }
        return h;
      });
    });

    if (isLogged) {
      unlogHabit.mutate({ id: habitId, date: dateStr } as any, {
        onSettled: () => queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() })
      });
    } else {
      logHabit.mutate({ id: habitId, date: dateStr } as any, {
        onSettled: () => queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() })
      });
    }
  };

  return (
    <div className="min-h-[100dvh] bg-white pb-32">
      <div className="px-6 pt-12 pb-6 max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[#111111]">Hábitos</h1>
          <button onClick={() => setIsAdding(!isAdding)} className="p-2 bg-gray-50 rounded-full text-gray-900 hover:bg-gray-100 transition-colors">
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* GRÁFICAS */}
        {!isLoading && habits && habits.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {/* Donut Chart */}
            <div className="bg-gray-50 rounded-2xl p-6 flex items-center justify-between border border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Progreso del día</p>
                <p className="text-3xl font-semibold text-gray-900">{stats.todayCompleted}<span className="text-lg text-gray-400">/{stats.total}</span></p>
              </div>
              <div className="w-24 h-24 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { value: stats.todayCompleted, color: '#111111' },
                        { value: stats.total - stats.todayCompleted, color: '#E5E7EB' }
                      ]}
                      cx="50%" cy="50%" innerRadius={30} outerRadius={40}
                      dataKey="value" stroke="none" startAngle={90} endAngle={-270}
                    >
                      {[{ color: '#111111' }, { color: '#E5E7EB' }].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-semibold text-gray-900">{stats.percent}%</span>
                </div>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 h-[144px] flex flex-col">
              <p className="text-sm font-medium text-gray-500 mb-2">Últimos 7 días</p>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.weeklyData}>
                    <RechartsTooltip 
                      cursor={{ fill: 'transparent' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-black text-white text-xs py-1 px-2 rounded-lg shadow-xl">
                              {data.fullDate}: {data.completados}/{data.total}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="completados" fill="#111111" radius={[4, 4, 4, 4]} maxBarSize={30} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#A3A3A3' }} dy={5} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* SELECTOR DE FECHA */}
        <div className="flex items-center justify-between bg-white border border-gray-100 rounded-full p-1 mb-6 shadow-sm">
          <button onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-sm font-semibold text-gray-900">
              {isToday(selectedDate) ? 'Hoy' : format(selectedDate, "d 'de' MMMM", { locale: es })}
            </span>
          </div>
          <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} disabled={isToday(selectedDate)} className={`p-2 rounded-full transition-colors ${isToday(selectedDate) ? 'opacity-30' : 'hover:bg-gray-50'}`}>
            <ChevronRight className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* INPUT NUEVO HÁBITO */}
        <AnimatePresence>
          {isAdding && (
            <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} onSubmit={handleCreate} className="mb-6 overflow-hidden">
              <div className="flex gap-2">
                <input type="text" autoFocus value={newHabitName} onChange={(e) => setNewHabitName(e.target.value)} placeholder="Ej: Leer 10 páginas..." className="flex-1 bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-black placeholder:text-gray-400" />
                <button type="submit" className="bg-black text-white px-4 py-3 rounded-xl text-sm font-medium">Guardar</button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {/* LISTA DE HÁBITOS (Estilo Tareas) */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : habits?.length === 0 ? (
          <div className="py-12 text-center"><p className="text-[#A3A3A3]">No tienes hábitos creados.</p></div>
        ) : (
          <div className="space-y-1">
            {habits?.map((habit) => {
              const dateStr = format(selectedDate, 'yyyy-MM-dd');
              const isLogged = habit.logs?.includes(dateStr);

              return (
                <motion.div layout key={habit.id} className="flex items-center gap-3 py-3 px-2 rounded-xl cursor-pointer transition-colors hover:bg-gray-50/50" onClick={() => handleToggleLog(habit.id, isLogged)}>
                  <Checkbox completada={isLogged} onToggle={(e) => { e.stopPropagation(); handleToggleLog(habit.id, isLogged); }} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-[15px] leading-tight truncate transition-colors ${isLogged ? 'text-gray-400 line-through' : 'text-gray-900 font-medium'}`}>
                      {habit.nombre}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
      <BottomTabBar />
    </div>
  );
}