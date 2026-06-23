import React, { useState } from 'react';
import { useGetHabits, useCreateHabit, useLogHabit, useUnlogHabit, getGetHabitsQueryKey } from '@workspace/api-client-react';
import { BottomTabBar } from '../components/BottomTabBar';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { format, subDays, startOfDay } from 'date-fns';
import { motion } from 'framer-motion';

export default function Habits() {
  const { user } = useAuth();
  const { data: habits, isLoading } = useGetHabits();
  const createHabit = useCreateHabit();
  const logHabit = useLogHabit();
  const unlogHabit = useUnlogHabit();
  const queryClient = useQueryClient();
  const [newHabitName, setNewHabitName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  const last7Days = Array.from({ length: 7 }).map((_, i) => {
    return startOfDay(subDays(new Date(), 6 - i));
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHabitName.trim() || !user) return;

    createHabit.mutate(
      { data: { nombre: newHabitName.trim(), userId: user.id } },
      {
        onSuccess: () => {
          setNewHabitName('');
          setIsAdding(false);
          queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() });
        }
      }
    );
  };

  const handleToggleLog = (habitId: string, isLogged: boolean) => {
    if (isLogged) {
      unlogHabit.mutate(
        { id: habitId },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() });
          }
        }
      );
    } else {
      logHabit.mutate(
        { id: habitId },
        {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() });
          }
        }
      );
    }
  };

  return (
    <div className="min-h-[100dvh] bg-white pb-32">
      <div className="px-6 pt-12 pb-6">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[#111111]">
            Hábitos
          </h1>
          <button 
            onClick={() => setIsAdding(true)}
            className="text-sm font-medium text-[#111111]"
          >
            Añadir
          </button>
        </div>

        {isAdding && (
          <motion.form 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            onSubmit={handleCreate} 
            className="mb-8 flex gap-2"
          >
            <input
              type="text"
              autoFocus
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              placeholder="Nombre del hábito"
              className="flex-1 bg-gray-50 border-0 rounded-xl px-4 py-3 text-sm focus:ring-1 focus:ring-black placeholder:text-gray-400"
            />
            <button
              type="submit"
              className="bg-black text-white px-4 py-3 rounded-xl text-sm font-medium"
            >
              Guardar
            </button>
          </motion.form>
        )}

        {isLoading ? (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-100 rounded w-1/3 mb-3" />
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5, 6, 7].map(j => (
                    <div key={j} className="w-8 h-8 bg-gray-100 rounded" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : habits?.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[#A3A3A3]">No estás siguiendo ningún hábito.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {habits?.map((habit) => (
              <div key={habit.id}>
                <p className="text-sm font-medium text-[#111111] mb-3">{habit.nombre}</p>
                <div className="flex justify-between items-center">
                  {last7Days.map((date, idx) => {
                    const dateStr = format(date, 'yyyy-MM-dd');
                    // Check if this date is in the logs
                    const isLogged = habit.logs?.some(logDate => logDate.startsWith(dateStr));
                    const isToday = idx === 6;

                    return (
                      <button
                        key={dateStr}
                        onClick={() => isToday && handleToggleLog(habit.id, !!isLogged)}
                        disabled={!isToday}
                        className={`w-8 h-8 rounded flex items-center justify-center transition-colors
                          ${isLogged ? 'bg-black' : 'bg-gray-100'} 
                          ${isToday ? 'cursor-pointer ring-2 ring-offset-2 ring-transparent focus:ring-black' : 'cursor-default opacity-80'}`}
                      >
                        {isLogged && <div className="w-2 h-2 bg-white rounded-full" />}
                      </button>
                    );
                  })}
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
