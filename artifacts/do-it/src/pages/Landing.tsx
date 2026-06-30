import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Mic, Calendar, Target, ArrowRight, Check, Minus, ChevronLeft, ChevronRight, Zap, Clock } from 'lucide-react';

// --- COMPONENTE: CARRUSEL 3D PREMIUM ---
const ShowcaseCarousel = () => {
  const [currentIndex, setCurrentIndex] = useState(1);

  // Mockups de la app hechos con Tailwind (sin necesidad de imágenes)
  const items = [
    <div key="1" className="w-full h-full bg-white rounded-3xl border border-gray-200 shadow-2xl p-6 flex flex-col">
      <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center mb-6"><Mic className="w-5 h-5 text-white" /></div>
      <h3 className="text-xl font-bold text-black mb-2">Input Mágico</h3>
      <p className="text-sm text-gray-500 mb-6">"Recuérdame llamar a mamá mañana a las 18:00"</p>
      <div className="mt-auto bg-gray-50 rounded-xl p-4 border border-gray-100">
        <div className="w-full h-2 bg-gray-200 rounded-full mb-2"></div>
        <div className="w-2/3 h-2 bg-gray-200 rounded-full"></div>
      </div>
    </div>,
    <div key="2" className="w-full h-full bg-white rounded-3xl border border-gray-200 shadow-2xl p-6 flex flex-col">
      <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center mb-6"><Target className="w-5 h-5 text-white" /></div>
      <h3 className="text-xl font-bold text-black mb-2">Hábitos</h3>
      <div className="grid grid-cols-4 gap-2 mt-4">
        {[...Array(16)].map((_, i) => (
          <div key={i} className={`aspect-square rounded-md ${i % 3 === 0 ? 'bg-black' : 'bg-gray-100'}`}></div>
        ))}
      </div>
    </div>,
    <div key="3" className="w-full h-full bg-white rounded-3xl border border-gray-200 shadow-2xl p-6 flex flex-col">
      <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center mb-6"><Calendar className="w-5 h-5 text-white" /></div>
      <h3 className="text-xl font-bold text-black mb-2">Calendario</h3>
      <div className="flex-1 mt-4 border-t border-gray-100 pt-4 space-y-3">
        <div className="w-full h-8 bg-gray-100 rounded-lg"></div>
        <div className="w-full h-12 bg-black rounded-lg"></div>
        <div className="w-full h-8 bg-gray-100 rounded-lg"></div>
      </div>
    </div>
  ];

  const handleNext = useCallback(() => setCurrentIndex((prev) => (prev + 1) % items.length), [items.length]);
  const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);

  useEffect(() => {
    const timer = setInterval(handleNext, 4000);
    return () => clearInterval(timer);
  }, [handleNext]);

  return (
    <div className="relative w-full h-[400px] md:h-[500px] flex items-center justify-center mt-12 mb-24">
      <div className="relative w-full max-w-4xl h-full flex items-center justify-center [perspective:1000px]">
        {items.map((item, index) => {
          const offset = index - currentIndex;
          const total = items.length;
          let pos = (offset + total) % total;
          if (pos > Math.floor(total / 2)) pos -= total;

          const isCenter = pos === 0;
          const isAdjacent = Math.abs(pos) === 1;

          return (
            <div
              key={index}
              className="absolute w-[260px] h-[380px] md:w-[320px] md:h-[460px] transition-all duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] flex items-center justify-center"
              style={{
                transform: `translateX(${pos * 55}%) scale(${isCenter ? 1 : isAdjacent ? 0.85 : 0.7}) rotateY(${pos * -15}deg)`,
                zIndex: isCenter ? 10 : isAdjacent ? 5 : 1,
                opacity: isCenter ? 1 : isAdjacent ? 0.5 : 0,
                filter: isCenter ? 'blur(0px)' : 'blur(4px)',
                visibility: Math.abs(pos) > 1 ? 'hidden' : 'visible',
              }}
            >
              {item}
            </div>
          );
        })}
      </div>

      <button onClick={handlePrev} className="absolute left-4 md:left-12 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/80 backdrop-blur-md border border-gray-200 shadow-sm flex items-center justify-center text-black hover:bg-gray-50 transition-colors z-20">
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button onClick={handleNext} className="absolute right-4 md:right-12 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/80 backdrop-blur-md border border-gray-200 shadow-sm flex items-center justify-center text-black hover:bg-gray-50 transition-colors z-20">
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
};

// --- PÁGINA PRINCIPAL ---
export default function Landing() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [isAnnual, setIsAnnual] = useState(true);

  useEffect(() => {
    if (!loading && user) setLocation('/tasks');
  }, [user, loading, setLocation]);

  if (loading || user) return <div className="min-h-screen bg-white" />;

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] flex flex-col selection:bg-black selection:text-white overflow-x-hidden font-sans">

      {/* HEADER STICKY */}
      <header className="fixed top-0 left-0 right-0 px-6 py-4 flex items-center justify-between w-full z-50 bg-white/70 backdrop-blur-xl border-b border-gray-200/50">
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between">
          <div className="font-bold text-2xl tracking-tighter text-black">do it.</div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <button className="text-sm font-semibold text-gray-500 hover:text-black transition-colors hidden md:block">
                Entrar
              </button>
            </Link>
            <Link href="/signup">
              <button className="bg-black text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-gray-800 transition-transform active:scale-95 shadow-sm">
                Empezar
              </button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center w-full pt-32">

        {/* HERO SECTION */}
        <section className="w-full max-w-5xl mx-auto px-6 pt-12 pb-10 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            <span className="inline-block py-1.5 px-4 rounded-full bg-white border border-gray-200 text-black text-xs font-bold tracking-widest uppercase mb-8 shadow-sm">
              Ponlo y hazlo
            </span>
            <h1 className="text-6xl md:text-8xl font-bold tracking-tighter text-black mb-8 leading-[1.05]">
              Productividad <br className="hidden md:block" />
              <span className="text-gray-300">sin fricción.</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-500 mb-12 max-w-2xl mx-auto font-medium leading-relaxed">
              El gestor de tareas y hábitos impulsado por IA que respeta tu tiempo y tu atención.
            </p>
            <Link href="/signup">
              <button className="bg-black text-white rounded-full px-10 py-5 text-lg font-semibold hover:bg-gray-800 transition-all active:scale-[0.98] shadow-2xl shadow-black/20 flex items-center justify-center gap-2 mx-auto">
                Empezar gratis <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
          </motion.div>
        </section>

        {/* 3D CAROUSEL SHOWCASE */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1, delay: 0.3 }} className="w-full overflow-hidden">
          <ShowcaseCarousel />
        </motion.section>

        {/* BENTO GRID (FEATURES) */}
        <section className="w-full max-w-6xl mx-auto px-6 py-24">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-black mb-4">Todo lo que necesitas.</h2>
              <p className="text-xl text-gray-500 font-medium">Nada de lo que no.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Bento Item 1 (Grande) */}
              <div className="md:col-span-2 bg-white rounded-[2rem] p-10 border border-gray-200 shadow-sm flex flex-col justify-between overflow-hidden relative group">
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 mb-6 group-hover:scale-110 transition-transform duration-500"><Mic className="w-7 h-7 text-black" /></div>
                  <h3 className="text-3xl font-bold text-black mb-3 tracking-tight">Input Mágico</h3>
                  <p className="text-lg text-gray-500 font-medium max-w-md">Graba un audio o escribe. La IA extrae la acción, limpia el contexto y calcula las fechas automáticamente.</p>
                </div>
              </div>

              {/* Bento Item 2 (Pequeño) */}
              <div className="bg-white rounded-[2rem] p-10 border border-gray-200 shadow-sm flex flex-col justify-between group">
                <div>
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 mb-6 group-hover:scale-110 transition-transform duration-500"><Calendar className="w-7 h-7 text-black" /></div>
                  <h3 className="text-2xl font-bold text-black mb-3 tracking-tight">Google Calendar</h3>
                  <p className="text-gray-500 font-medium">Sincronización bidireccional en tiempo real.</p>
                </div>
              </div>

              {/* Bento Item 3 (Pequeño) */}
              <div className="bg-white rounded-[2rem] p-10 border border-gray-200 shadow-sm flex flex-col justify-between group">
                <div>
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 mb-6 group-hover:scale-110 transition-transform duration-500"><Target className="w-7 h-7 text-black" /></div>
                  <h3 className="text-2xl font-bold text-black mb-3 tracking-tight">Hábitos</h3>
                  <p className="text-gray-500 font-medium">Tracker visual minimalista con rachas automáticas.</p>
                </div>
              </div>

              {/* Bento Item 4 (Grande) */}
              <div className="md:col-span-2 bg-black rounded-[2rem] p-10 border border-black shadow-xl flex flex-col justify-between overflow-hidden relative group">
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 mb-6 group-hover:scale-110 transition-transform duration-500"><Zap className="w-7 h-7 text-white" /></div>
                  <h3 className="text-3xl font-bold text-white mb-3 tracking-tight">Rendimiento Offline</h3>
                  <p className="text-lg text-gray-400 font-medium max-w-md">Diseñada como PWA. Funciona sin conexión, se instala en tu móvil y responde en 0 milisegundos.</p>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* PRICING SECTION */}
        <section className="w-full max-w-5xl mx-auto px-6 py-24 border-t border-gray-200/50">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-black mb-4">Planes simples.</h2>
              <p className="text-xl text-gray-500 font-medium">Empieza gratis, mejora cuando lo necesites.</p>

              <div className="flex items-center justify-center bg-white p-1.5 rounded-full mt-10 w-fit mx-auto border border-gray-200 shadow-sm">
                <button onClick={() => setIsAnnual(false)} className={`px-6 py-3 rounded-full text-sm font-bold transition-all ${!isAnnual ? 'bg-gray-100 text-black' : 'text-gray-400 hover:text-black'}`}>Mensual</button>
                <button onClick={() => setIsAnnual(true)} className={`px-6 py-3 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${isAnnual ? 'bg-gray-100 text-black' : 'text-gray-400 hover:text-black'}`}>
                  Anual <span className="bg-black text-white text-[10px] px-2 py-0.5 rounded-full">-40%</span>
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
              {/* Free Plan */}
              <div className="bg-white rounded-[2.5rem] p-10 border border-gray-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
                <h3 className="text-3xl font-bold text-black mb-2 tracking-tight">Free</h3>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-5xl font-bold text-black tracking-tighter">0€</span>
                  <span className="text-gray-500 font-medium">/para siempre</span>
                </div>
                <ul className="space-y-5 mb-10 flex-1">
                  <li className="flex items-center gap-4 text-gray-700 font-medium"><Check className="w-6 h-6 text-black" /> Tareas ilimitadas</li>
                  <li className="flex items-center gap-4 text-gray-700 font-medium"><Check className="w-6 h-6 text-black" /> Notificaciones Push</li>
                  <li className="flex items-center gap-4 text-gray-700 font-medium"><Minus className="w-6 h-6 text-gray-300" /> 3 usos de IA al mes</li>
                  <li className="flex items-center gap-4 text-gray-700 font-medium"><Minus className="w-6 h-6 text-gray-300" /> 5 hábitos activos</li>
                  <li className="flex items-center gap-4 text-gray-400 font-medium"><X className="w-6 h-6 text-gray-200" /> Google Calendar</li>
                  <li className="flex items-center gap-4 text-gray-400 font-medium"><X className="w-6 h-6 text-gray-200" /> Estadísticas avanzadas</li>
                </ul>
                <Link href="/signup">
                  <button className="w-full bg-white text-black border-2 border-gray-200 rounded-2xl py-4 font-bold hover:bg-gray-50 transition-colors text-lg">
                    Crear cuenta gratis
                  </button>
                </Link>
              </div>

              {/* Premium Plan */}
              <div className="bg-black rounded-[2.5rem] p-10 border border-black shadow-2xl flex flex-col relative overflow-hidden transform md:-translate-y-4">
                <div className="absolute top-0 right-0 bg-white text-black text-xs font-bold px-5 py-2 rounded-bl-3xl tracking-widest">RECOMENDADO</div>
                <h3 className="text-3xl font-bold text-white mb-2 tracking-tight">Premium</h3>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-5xl font-bold text-white tracking-tighter">{isAnnual ? '49.99€' : '6.99€'}</span>
                  <span className="text-gray-400 font-medium">/{isAnnual ? 'año' : 'mes'}</span>
                </div>
                <ul className="space-y-5 mb-10 flex-1">
                  <li className="flex items-center gap-4 text-gray-300 font-medium"><Check className="w-6 h-6 text-white" /> Tareas ilimitadas</li>
                  <li className="flex items-center gap-4 text-gray-300 font-medium"><Check className="w-6 h-6 text-white" /> Notificaciones Push</li>
                  <li className="flex items-center gap-4 text-white font-bold"><Check className="w-6 h-6 text-white" /> IA Ilimitada</li>
                  <li className="flex items-center gap-4 text-white font-bold"><Check className="w-6 h-6 text-white" /> Hábitos ilimitados</li>
                  <li className="flex items-center gap-4 text-white font-bold"><Check className="w-6 h-6 text-white" /> Google Calendar</li>
                  <li className="flex items-center gap-4 text-white font-bold"><Check className="w-6 h-6 text-white" /> Estadísticas avanzadas</li>
                </ul>
                <Link href="/signup">
                  <button className="w-full bg-white text-black rounded-2xl py-4 font-bold hover:bg-gray-100 transition-colors active:scale-[0.98] text-lg">
                    Empezar 7 días gratis
                  </button>
                </Link>
              </div>
            </div>
          </motion.div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-gray-200 bg-white py-12 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="font-bold text-2xl tracking-tighter text-black">do it.</div>
          <div className="flex items-center gap-8 text-sm font-semibold text-gray-500">
            <a href="#" className="hover:text-black transition-colors">Términos</a>
            <a href="#" className="hover:text-black transition-colors">Privacidad</a>
            <a href="mailto:soporte.doit.app@gmail.com" className="hover:text-black transition-colors">Contacto</a>
          </div>
          <div className="text-sm font-medium text-gray-400">
            © {new Date().getFullYear()} Do it. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}

// Componente X (Cruz)
function X(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
}