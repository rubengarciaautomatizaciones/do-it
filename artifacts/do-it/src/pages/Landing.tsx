import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Mic, Calendar, Target, ArrowRight, Check, Minus } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';

export default function Landing() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isAnnual, setIsAnnual] = useState(true);

  useEffect(() => {
    if (!loading && user) setLocation('/tasks');
  }, [user, loading, setLocation]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', () => setSelectedIndex(emblaApi.selectedScrollSnap()));
  }, [emblaApi]);

  if (loading || user) return <div className="min-h-screen bg-white" />;

  const slides = [
    {
      icon: Mic,
      title: "Input Mágico",
      desc: "Habla o escribe. La IA extrae la acción, limpia la descripción y calcula las fechas por ti."
    },
    {
      icon: Calendar,
      title: "Google Calendar",
      desc: "Sincronización bidireccional en tiempo real. Tus tareas y eventos, en un solo lugar."
    },
    {
      icon: Target,
      title: "Hábitos Sólidos",
      desc: "Construye rutinas con un tracker visual minimalista y rachas automáticas."
    }
  ];

  return (
    <div className="min-h-[100dvh] bg-white flex flex-col selection:bg-black selection:text-white overflow-x-hidden">

      {/* HEADER */}
      <header className="px-6 py-6 flex items-center justify-between w-full max-w-5xl mx-auto z-10">
        <div className="font-bold text-2xl tracking-tighter text-black">do it.</div>
        <Link href="/login">
          <button className="text-sm font-semibold text-gray-500 hover:text-black transition-colors">
            Entrar
          </button>
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center w-full">

        {/* HERO SECTION */}
        <section className="w-full max-w-4xl mx-auto px-6 pt-12 pb-20 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <span className="inline-block py-1 px-3 rounded-full bg-gray-100 text-black text-xs font-bold tracking-widest uppercase mb-6">
              Ponlo y hazlo
            </span>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-black mb-6 leading-[1.1]">
              Productividad <br className="hidden md:block" />
              <span className="text-gray-300">sin fricción.</span>
            </h1>
            <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
              El gestor de tareas y hábitos impulsado por IA que respeta tu tiempo y tu atención.
            </p>
            <Link href="/signup">
              <button className="bg-black text-white rounded-2xl px-8 py-4 text-lg font-semibold hover:bg-gray-800 transition-all active:scale-[0.98] shadow-xl shadow-black/10 flex items-center justify-center gap-2 mx-auto">
                Empezar gratis <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
          </motion.div>
        </section>

        {/* CAROUSEL SECTION */}
        <section className="w-full max-w-5xl mx-auto px-4 py-12">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ duration: 0.8 }}>
            <div className="overflow-hidden rounded-[2rem] border border-gray-100 bg-gray-50 shadow-sm" ref={emblaRef}>
              <div className="flex touch-pan-y">
                {slides.map((slide, index) => (
                  <div key={index} className="flex-[0_0_100%] md:flex-[0_0_50%] min-w-0 p-10 flex flex-col items-center text-center border-r border-gray-100/50 last:border-0">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-6 border border-gray-100">
                      <slide.icon className="w-8 h-8 text-black" />
                    </div>
                    <h3 className="text-2xl font-bold text-black mb-3 tracking-tight">{slide.title}</h3>
                    <p className="text-gray-500 font-medium leading-relaxed">{slide.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-center gap-2 mt-6 md:hidden">
              {slides.map((_, idx) => (
                <button key={idx} onClick={() => emblaApi?.scrollTo(idx)} className={`h-2 rounded-full transition-all duration-300 ${idx === selectedIndex ? 'w-6 bg-black' : 'w-2 bg-gray-200'}`} />
              ))}
            </div>
          </motion.div>
        </section>

        {/* PRICING SECTION */}
        <section className="w-full max-w-5xl mx-auto px-6 py-24">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-black mb-4">Planes simples.</h2>
            <p className="text-gray-500 font-medium">Empieza gratis, mejora cuando lo necesites.</p>

            <div className="flex items-center justify-center bg-gray-50 p-1 rounded-full mt-8 w-fit mx-auto border border-gray-100">
              <button onClick={() => setIsAnnual(false)} className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-colors ${!isAnnual ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>Mensual</button>
              <button onClick={() => setIsAnnual(true)} className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-colors flex items-center gap-2 ${isAnnual ? 'bg-white shadow-sm text-black' : 'text-gray-400'}`}>
                Anual <span className="bg-black text-white text-[10px] px-2 py-0.5 rounded-full">-40%</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Plan */}
            <div className="bg-white rounded-[2rem] p-8 border border-gray-200 shadow-sm flex flex-col">
              <h3 className="text-2xl font-bold text-black mb-2">Free</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-black">0€</span>
                <span className="text-gray-500 font-medium">/para siempre</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-gray-600 font-medium"><Check className="w-5 h-5 text-black" /> Tareas ilimitadas</li>
                <li className="flex items-center gap-3 text-gray-600 font-medium"><Check className="w-5 h-5 text-black" /> Notificaciones Push</li>
                <li className="flex items-center gap-3 text-gray-600 font-medium"><Minus className="w-5 h-5 text-gray-300" /> 3 usos de IA al mes</li>
                <li className="flex items-center gap-3 text-gray-600 font-medium"><Minus className="w-5 h-5 text-gray-300" /> 5 hábitos activos</li>
                <li className="flex items-center gap-3 text-gray-400 font-medium"><X className="w-5 h-5 text-gray-200" /> Google Calendar</li>
                <li className="flex items-center gap-3 text-gray-400 font-medium"><X className="w-5 h-5 text-gray-200" /> Estadísticas avanzadas</li>
              </ul>
              <Link href="/signup">
                <button className="w-full bg-gray-50 text-black border border-gray-200 rounded-xl py-4 font-semibold hover:bg-gray-100 transition-colors">
                  Crear cuenta gratis
                </button>
              </Link>
            </div>

            {/* Premium Plan */}
            <div className="bg-black rounded-[2rem] p-8 border border-black shadow-xl flex flex-col relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-white text-black text-xs font-bold px-4 py-1.5 rounded-bl-2xl">RECOMENDADO</div>
              <h3 className="text-2xl font-bold text-white mb-2">Premium</h3>
              <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-white">{isAnnual ? '49.99€' : '6.99€'}</span>
                <span className="text-gray-400 font-medium">/{isAnnual ? 'año' : 'mes'}</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                <li className="flex items-center gap-3 text-gray-300 font-medium"><Check className="w-5 h-5 text-white" /> Tareas ilimitadas</li>
                <li className="flex items-center gap-3 text-gray-300 font-medium"><Check className="w-5 h-5 text-white" /> Notificaciones Push</li>
                <li className="flex items-center gap-3 text-white font-semibold"><Check className="w-5 h-5 text-white" /> IA Ilimitada</li>
                <li className="flex items-center gap-3 text-white font-semibold"><Check className="w-5 h-5 text-white" /> Hábitos ilimitados</li>
                <li className="flex items-center gap-3 text-white font-semibold"><Check className="w-5 h-5 text-white" /> Google Calendar</li>
                <li className="flex items-center gap-3 text-white font-semibold"><Check className="w-5 h-5 text-white" /> Estadísticas avanzadas</li>
              </ul>
              <Link href="/signup">
                <button className="w-full bg-white text-black rounded-xl py-4 font-bold hover:bg-gray-100 transition-colors active:scale-[0.98]">
                  Empezar 7 días gratis
                </button>
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-gray-100 bg-gray-50 py-12 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="font-bold text-xl tracking-tighter text-black">do it.</div>
          <div className="flex items-center gap-6 text-sm font-medium text-gray-500">
            <a href="#" className="hover:text-black transition-colors">Términos</a>
            <a href="#" className="hover:text-black transition-colors">Privacidad</a>
            <a href="mailto:soporte.doit.app@gmail.com" className="hover:text-black transition-colors">Contacto</a>
          </div>
          <div className="text-sm text-gray-400">
            © {new Date().getFullYear()} Do it. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}

// Componente X (Cruz) que falta en lucide-react por defecto en algunos imports
function X(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
}