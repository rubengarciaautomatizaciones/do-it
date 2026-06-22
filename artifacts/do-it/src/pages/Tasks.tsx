import React from 'react';
import { useGetTasks } from '@workspace/api-client-react';
import { TaskItem } from '../components/TaskItem';
import { MagicInput } from '../components/MagicInput';
import { BottomTabBar } from '../components/BottomTabBar';
import { motion } from 'framer-motion';

export default function Tasks() {
  const { data: tasks, isLoading } = useGetTasks();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  return (
    <div className="min-h-[100dvh] bg-white pb-32">
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-[#111111] mb-8">
          Tareas
        </h1>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 py-4 border-b border-gray-100">
                <div className="w-5 h-5 rounded-full bg-gray-100 animate-pulse" />
                <div className="h-5 bg-gray-100 rounded w-3/4 animate-pulse" />
              </div>
            ))}
          </div>
        ) : tasks?.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[#A3A3A3]">Todo claro por hoy.</p>
          </div>
        ) : (
          <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="flex flex-col"
          >
            {tasks?.map((task) => (
              <TaskItem key={task.id} task={task} />
            ))}
          </motion.div>
        )}
      </div>

      <MagicInput />
      <BottomTabBar />
    </div>
  );
}
