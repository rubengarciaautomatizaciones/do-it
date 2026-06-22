import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { BottomTabBar } from '../components/BottomTabBar';
import { LogOut } from 'lucide-react';
import { useGetTaskStats } from '@workspace/api-client-react';

export default function Profile() {
  const { user, signOut } = useAuth();
  const { data: stats } = useGetTaskStats();

  return (
    <div className="min-h-[100dvh] bg-white pb-32">
      <div className="px-6 pt-12 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-[#111111] mb-8">
          Perfil
        </h1>

        <div className="mb-12">
          <p className="text-sm text-[#A3A3A3] mb-1">Email</p>
          <p className="text-[#111111] font-medium">{user?.email}</p>
        </div>

        {stats && (
          <div className="grid grid-cols-2 gap-4 mb-12">
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-2xl font-semibold text-[#111111] mb-1">{stats.completed}</p>
              <p className="text-xs text-[#A3A3A3]">Tareas completadas</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-2xl font-semibold text-[#111111] mb-1">{stats.completedToday}</p>
              <p className="text-xs text-[#A3A3A3]">Completadas hoy</p>
            </div>
          </div>
        )}

        <button
          onClick={() => signOut()}
          className="w-full bg-gray-50 text-[#111111] rounded-xl py-4 font-medium flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar sesión
        </button>
      </div>

      <BottomTabBar />
    </div>
  );
}
