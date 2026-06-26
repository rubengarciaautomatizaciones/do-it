import React from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { CheckCircle2, Mic, Calendar } from 'lucide-react';

export default function Landing() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  // Si ya está logueado, lo mandamos directo a la app
  React.useEffect(() => {
    if (!loading && user) {
      setLocation('/tasks');
    }
  }, [user, loading, setLocation]);

  if (loading || user) return <div className="min-h-screen bg-white" />;

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col selection:bg-black selection:text-white">
      {/* Header */}
      <header className="px-6 py-6 flex items-center justify-between max-w-5xl mx-auto w-full">
        <div className="font-bold text-xl tracking-tight">do it.</div>
        <Link href="/login">
          <button className="text-sm font-medium text-gray-600 hover:text-black transition-colors">
            Entrar
          </button>
        </Link>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-3xl mx-auto w-full mt-12 mb-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-5xl md:text-7xl font-semibold tracking-tight text-[#111111] mb-6 leading-tight">
            Productividad <br className="hidden md:block" />
            <span className="text-gray-400">impulsada por IA.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-xl mx-auto leading-relaxed">
            Habla o escribe. La IA estructura tus tareas, extrae fechas y las sincroniza con tu calendario. Sin fricción.
          </p>

          <Link href="/login">
            <button className="bg-black text-white rounded-full px-8 py-4 text-lg font-medium hover:bg-gray-800 transition-all hover:scale-105 active:scale-95 shadow-xl shadow-black/10">
              Empezar gratis
            </button>
          </Link>
        </motion.div>

        {/* Features Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 w-full text-left"
        >
          <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
            <Mic className="w-8 h-8 mb-4 text-black" />
            <h3 className="text-lg font-semibold mb-2">Input Mágico</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Graba un audio y la IA extraerá el título, la descripción y la fecha de vencimiento automáticamente.</p>
          </div>
          <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
            <Calendar className="w-8 h-8 mb-4 text-black" />
            <h3 className="text-lg font-semibold mb-2">Google Calendar</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Tus tareas con fecha límite se sincronizan en tiempo real con tu calendario personal.</p>
          </div>
          <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
            <CheckCircle2 className="w-8 h-8 mb-4 text-black" />
            <h3 className="text-lg font-semibold mb-2">Hábitos</h3>
            <p className="text-gray-500 text-sm leading-relaxed">Construye rutinas sólidas con un tracker visual minimalista y estadísticas de progreso.</p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}