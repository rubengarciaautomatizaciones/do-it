import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext';
import { motion, PanInfo } from 'framer-motion';
import { Mic, Calendar, Target, ArrowRight, Check, Minus, ChevronLeft, ChevronRight, Zap, Clock, Apple, Smartphone, Info } from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from '@/lib/utils';

// --- COMPONENTE: CARRUSEL 3D (Estilo 21dev adaptado) ---
const ShowcaseCarousel = () => {
  const isMobile = useIsMobile();
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides = [
    {
      title: "Input Mágico",
      mockup: (
        <div className="w-full h-full bg-white rounded-3xl border border-gray-200 shadow-xl p-5 flex flex-col">
          <div className="flex items-end gap-3 mb-6">
            <div className="w-10 h-10 bg-black rounded-full flex items-center justify-center shrink-0"><Mic className="w-5 h-5 text-white" /></div>
            <div className="bg-gray-100 rounded-2xl rounded-bl-none p-4 text-sm text-left text-gray-800 leading-snug font-medium">
              "Recuérdame llamar al dentista mañana a las 10 de la mañana"
            </div>
          </div>
          <div className="mt-auto border border-gray-100 rounded-2xl p-4 bg-white shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
              <span className="font-bold text-base text-black">Llamar al dentista</span>
            </div>
            <div className="flex gap-2">
              <span className="text-xs font-bold bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5"/> Mañana</span>
              <span className="text-xs font-bold bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5"><Clock className="w-3.5 h-3.5"/> 10:00</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Hábitos Sólidos",
      mockup: (
        <div className="w-full h-full bg-white rounded-3xl border border-gray-200 shadow-xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
            <span className="font-bold text-base text-black">Esta semana</span>
            <Target className="w-5 h-5 text-gray-400"/>
          </div>
          <div className="space-y-6 flex-1 flex flex-col justify-center">
            {[
              { n: 'Leer 20 págs', p: [1,1,1,0,1,0,0] },
              { n: 'Gimnasio', p: [1,0,1,0,0,0,0] },
              { n: 'Beber agua', p: [1,1,1,1,1,1,0] }
            ].map((h, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-700 w-24 text-left truncate">{h.n}</span>
                <div className="flex gap-1.5">
                  {h.p.map((done, d) => (
                    <div key={d} className={`w-4 h-4 rounded-md ${done ? 'bg-black' : 'bg-gray-100'}`} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      title: "Google Calendar",
      mockup: (
        <div className="w-full h-full bg-white rounded-3xl border border-gray-200 shadow-xl p-6 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <span className="font-bold text-base text-black">Hoy</span>
            <Calendar className="w-5 h-5 text-gray-400"/>
          </div>
          <div className="relative flex-1 border-l-2 border-gray-100 ml-2 pl-5 space-y-4 py-2">
            <div className="absolute w-3 h-3 bg-black rounded-full -left-[7px] top-8 border-2 border-white"></div>
            <div className="bg-gray-50 p-4 rounded-xl text-left border border-gray-100">
              <span className="font-bold text-sm text-black block mb-1">Reunión de equipo</span>
              <span className="text-xs text-gray-500 font-medium">10:00 - 11:00</span>
            </div>
            <div className="bg-black p-4 rounded-xl text-left shadow-lg">
              <span className="font-bold text-sm text-white block mb-1">Entregar reporte</span>
              <span className="text-xs text-gray-300 font-medium">12:00</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  const handleNext = () => setCurrentIndex((prev) => (prev + 1) % slides.length);
  const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + slides.length) % slides.length);

  // Lógica de Swipe para móvil
  const handleDragEnd = (e: any, { offset, velocity }: PanInfo) => {
    const swipe = offset.x;
    if (swipe < -50) handleNext();
    else if (swipe > 50) handlePrev();
  };

  return (
    <div className="relative w-full h-[400px] md:h-[500px] flex items-center justify-center overflow-hidden bg-[#FAFAFA]">

      {/* Capa invisible para detectar el swipe en móvil */}
      {isMobile && (
        <motion.div 
          drag="x" 
          dragConstraints={{ left: 0, right: 0 }} 
          onDragEnd={handleDragEnd} 
          className="absolute inset-0 z-40 cursor-grab active:cursor-grabbing" 
        />
      )}

      <div className="relative w-full max-w-5xl h-full flex items-center justify-center [perspective:1200px] pointer-events-none md:pointer-events-auto">
        {slides.map((slide, index) => {
          const offset = index - currentIndex;
          const total = slides.length;
          let pos = (offset + total) % total;
          if (pos > Math.floor(total / 2)) pos -= total;

          const isCenter = pos === 0;
          const isAdjacent = Math.abs(pos) === 1;

          return (
            <div
              key={index}
              className={cn(
                'absolute w-[280px] h-[380px] md:w-[340px] md:h-[460px] transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)]',
                'flex flex-col items-center justify-center'
              )}
              style={{
                transform: `translateX(${pos * 60}%) scale(${isCenter ? 1 : isAdjacent ? 0.85 : 0.7}) rotateY(${pos * -15}deg)`,
                zIndex: isCenter ? 10 : isAdjacent ? 5 : 1,
                opacity: isCenter ? 1 : isAdjacent ? 0.3 : 0,
                filter: isCenter ? 'blur(0px)' : 'blur(4px)',
                visibility: Math.abs(pos) > 1 ? 'hidden' : 'visible',
              }}
            >
              {slide.mockup}
            </div>
          );
        })}
      </div>

      {/* Botones de navegación solo en PC */}
      {!isMobile && (
        <>
          <button onClick={handlePrev} className="absolute left-8 top-1/2 -translate-y-1/2 rounded-full h-12 w-12 z-30 bg-white/80 backdrop-blur-md border border-gray-200 shadow-sm flex items-center justify-center text-black hover:bg-gray-50 transition-colors">
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button onClick={handleNext} className="absolute right-8 top-1/2 -translate-y-1/2 rounded-full h-12 w-12 z-30 bg-white/80 backdrop-blur-md border border-gray-200 shadow-sm flex items-center justify-center text-black hover:bg-gray-50 transition-colors">
            <ChevronRight className="h-6 w-6" />
          </button>
        </>
      )}
    </div>
  );
};

// --- PÁGINA PRINCIPAL ---
export default function Landing() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const [isAnnual, setIsAnnual] = useState(false);

  const [isIOS, setIsIOS] = useState(false);
  const [isSafari, setIsSafari] = useState(false);
  const [showIOSAlert, setShowIOSAlert] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    if (!loading && user) setLocation('/tasks');
  }, [user, loading, setLocation]);

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    const safari = ios && /webkit/.test(userAgent) && !/crios|fxios|opios/.test(userAgent);
    setIsIOS(ios);
    setIsSafari(safari);

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleIOSDownload = () => {
    if (!isSafari) setShowIOSAlert(true);
    else setShowIOSInstructions(true);
  };

  const handleAndroidDownload = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    } else {
      alert("Para instalar la app, toca los 3 puntos del navegador y selecciona 'Añadir a la pantalla de inicio'.");
    }
  };

  if (loading || user) return <div className="min-h-screen bg-white" />;

  return (
    <div className="min-h-[100dvh] bg-[#FAFAFA] flex flex-col selection:bg-black selection:text-white overflow-x-hidden font-sans">

      {/* HEADER STICKY */}
      <header className="fixed top-0 left-0 right-0 px-6 py-4 flex items-center justify-between w-full z-50 bg-[#FAFAFA]/80 backdrop-blur-md border-b border-gray-200/50">
        <div className="w-full max-w-6xl mx-auto flex items-center justify-between">
          <div className="font-bold text-2xl tracking-tighter text-black">do it!</div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <button className="text-sm font-semibold text-gray-500 hover:text-black transition-colors hidden md:block">
                Entrar
              </button>
            </Link>
            {!isMobile && (
              <Link href="/signup">
                <button className="bg-black text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-gray-800 transition-transform active:scale-95 shadow-sm">
                  Empezar
                </button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center w-full">

        {/* HERO SECTION (100vh en PC, Auto en Móvil) */}
        <section className="w-full md:min-h-screen flex flex-col items-center justify-center pt-32 pb-12 md:pt-0 md:pb-0 text-center px-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }} className="max-w-4xl mx-auto w-full">
            <h1 className="text-6xl md:text-[7rem] font-bold tracking-tighter text-black mb-6 leading-[1.05]">
              Ponlo y hazlo.
            </h1>
            <p className="text-xl md:text-3xl text-gray-500 mb-12 max-w-2xl mx-auto font-medium leading-tight">
              Menos ruido. Más acción.
            </p>

            {isMobile ? (
              <div className="flex flex-col gap-3 w-full max-w-xs mx-auto">
                <button onClick={handleIOSDownload} className="w-full bg-black text-white rounded-2xl py-4 text-base font-semibold hover:bg-gray-800 transition-all active:scale-[0.98] shadow-lg flex items-center justify-center gap-2">
                  <Apple className="w-5 h-5" /> Descargar en iOS
                </button>
                <button onClick={handleAndroidDownload} className="w-full bg-white text-black border-2 border-gray-200 rounded-2xl py-4 text-base font-semibold hover:bg-gray-50 transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2">
                  <Smartphone className="w-5 h-5" /> Descargar en Android
                </button>
              </div>
            ) : (
              <Link href="/signup">
                <button className="bg-black text-white border-2 border-black rounded-full px-10 py-4 text-lg font-semibold hover:bg-white hover:text-black transition-colors active:scale-[0.98] shadow-xl flex items-center justify-center gap-2 mx-auto">
                  Empezar gratis <ArrowRight className="w-5 h-5" />
                </button>
              </Link>
            )}
          </motion.div>
        </section>

        {/* CARRUSEL 3D */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="w-full">
          <ShowcaseCarousel />
        </motion.section>

        {/* NUESTRA HISTORIA (Diseño Editorial 2 Columnas) */}
        <section className="w-full max-w-6xl mx-auto px-6 py-32">
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}>
            <div className="grid md:grid-cols-12 gap-12 md:gap-20 items-start">
              <div className="md:col-span-5 md:sticky md:top-32">
                <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-black leading-tight">
                  Por qué creé <br/> do it!
                </h2>
              </div>
              <div className="md:col-span-7 space-y-8 text-xl md:text-2xl text-gray-500 font-medium leading-relaxed">
                <p className="text-black font-semibold">
                  Buscaba una herramienta que trabajara para mí, no al revés.
                </p>
                <p>
                  Las apps del mercado estaban llenas de colores estridentes, gráficos innecesarios y formularios complejos que me hacían perder el tiempo.
                </p>
                <p>
                  Quería algo donde pudiera entrar, soltar lo que tenía en la cabeza (por voz o texto) y salir en 3 segundos, sabiendo que una IA lo organizaría todo por mí.
                </p>
                <p>
                  Como no existía, la construí. Minimalismo extremo por fuera, tecnología punta por dentro.
                </p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* BENTO GRID */}
        <section className="w-full max-w-6xl mx-auto px-6 py-16">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6 }}>
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold tracking-tighter text-black mb-3">Todo lo que necesitas.</h2>
              <p className="text-xl text-gray-500 font-medium">Nada de lo que no.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 bg-white rounded-[2rem] p-10 border border-gray-200 shadow-sm flex flex-col justify-between overflow-hidden relative group">
                <div className="relative z-10">
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 mb-6 group-hover:scale-110 transition-transform duration-500"><Mic className="w-7 h-7 text-black" /></div>
                  <h3 className="text-3xl font-bold text-black mb-3 tracking-tight">Input Mágico</h3>
                  <p className="text-lg text-gray-500 font-medium max-w-md">Graba un audio o escribe. La IA extrae la acción, limpia el contexto y calcula las fechas automáticamente.</p>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] p-10 border border-gray-200 shadow-sm flex flex-col justify-between group">
                <div>
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 mb-6 group-hover:scale-110 transition-transform duration-500"><Calendar className="w-7 h-7 text-black" /></div>
                  <h3 className="text-2xl font-bold text-black mb-3 tracking-tight">Google Calendar</h3>
                  <p className="text-gray-500 font-medium">Sincronización bidireccional en tiempo real.</p>
                </div>
              </div>

              <div className="bg-white rounded-[2rem] p-10 border border-gray-200 shadow-sm flex flex-col justify-between group">
                <div>
                  <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 mb-6 group-hover:scale-110 transition-transform duration-500"><Target className="w-7 h-7 text-black" /></div>
                  <h3 className="text-2xl font-bold text-black mb-3 tracking-tight">Hábitos</h3>
                  <p className="text-gray-500 font-medium">Tracker visual minimalista con rachas automáticas.</p>
                </div>
              </div>

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
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-black mb-4">Empieza gratis.</h2>
              <p className="text-xl text-gray-500 font-medium">Mejora cuando lo necesites.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-12 md:gap-8 max-w-4xl mx-auto">

              {/* Free Plan */}
              <div className="bg-white rounded-[2.5rem] p-10 border border-gray-200 shadow-sm flex flex-col hover:shadow-md transition-shadow">
                <h3 className="text-3xl font-bold text-black mb-2 tracking-tight">Free</h3>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-6xl font-bold text-black tracking-tighter">0€</span>
                  <span className="text-gray-500 font-medium text-base">/para siempre</span>
                </div>
                <ul className="space-y-5 mb-10 flex-1">
                  <li className="flex items-center gap-4 text-gray-700 font-medium text-base"><Check className="w-5 h-5 text-black shrink-0" /> Tareas ilimitadas</li>
                  <li className="flex items-center gap-4 text-gray-700 font-medium text-base"><Check className="w-5 h-5 text-black shrink-0" /> Notificaciones Push</li>
                  <li className="flex items-center gap-4 text-gray-700 font-medium text-base"><Minus className="w-5 h-5 text-gray-300 shrink-0" /> 3 usos de IA al mes</li>
                  <li className="flex items-center gap-4 text-gray-700 font-medium text-base"><Minus className="w-5 h-5 text-gray-300 shrink-0" /> 5 hábitos activos</li>
                  <li className="flex items-center gap-4 text-gray-400 font-medium text-base"><X className="w-5 h-5 text-gray-200 shrink-0" /> Google Calendar</li>
                  <li className="flex items-center gap-4 text-gray-400 font-medium text-base"><X className="w-5 h-5 text-gray-200 shrink-0" /> Estadísticas avanzadas</li>
                </ul>
                <Link href="/signup">
                  <button className="w-full bg-black text-white border-2 border-black rounded-2xl py-4 font-bold hover:bg-white hover:text-black transition-colors text-lg">
                    Crear cuenta gratis
                  </button>
                </Link>
              </div>

              {/* Premium Plan */}
              <div className="relative bg-black rounded-[2.5rem] p-10 border border-black shadow-2xl flex flex-col">

                {/* Switch de precios flotante (Mitad fuera, mitad dentro) */}
                <div className="absolute -top-6 left-8 bg-white border border-gray-200 p-1.5 rounded-full flex items-center shadow-lg z-10 w-max">
                  <button onClick={() => setIsAnnual(false)} className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${!isAnnual ? 'bg-gray-100 text-black' : 'text-gray-400 hover:text-black'}`}>Mensual</button>
                  <button onClick={() => setIsAnnual(true)} className={`px-5 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${isAnnual ? 'bg-gray-100 text-black' : 'text-gray-400 hover:text-black'}`}>
                    Anual <span className="bg-black text-white text-[10px] px-2 py-0.5 rounded-full">-40%</span>
                  </button>
                </div>

                <h3 className="text-3xl font-bold text-white mb-2 tracking-tight mt-4">Premium</h3>
                <div className="flex items-baseline gap-1 mb-8">
                  <span className="text-6xl font-bold text-white tracking-tighter">{isAnnual ? '49.99€' : '6.99€'}</span>
                  <span className="text-gray-400 font-medium text-base">/{isAnnual ? 'año' : 'mes'}</span>
                </div>
                <ul className="space-y-5 mb-10 flex-1">
                  <li className="flex items-center gap-4 text-gray-300 font-medium text-base"><Check className="w-5 h-5 text-white shrink-0" /> Tareas ilimitadas</li>
                  <li className="flex items-center gap-4 text-gray-300 font-medium text-base"><Check className="w-5 h-5 text-white shrink-0" /> Notificaciones Push</li>
                  <li className="flex items-center gap-4 text-white font-bold text-base"><Check className="w-5 h-5 text-white shrink-0" /> IA Ilimitada</li>
                  <li className="flex items-center gap-4 text-white font-bold text-base"><Check className="w-5 h-5 text-white shrink-0" /> Hábitos ilimitados</li>
                  <li className="flex items-center gap-4 text-white font-bold text-base"><Check className="w-5 h-5 text-white shrink-0" /> Google Calendar</li>
                  <li className="flex items-center gap-4 text-white font-bold text-base"><Check className="w-5 h-5 text-white shrink-0" /> Estadísticas avanzadas</li>
                </ul>
                <Link href="/signup">
                  <button className="w-full bg-white text-black border-2 border-white rounded-2xl py-4 font-bold hover:bg-black hover:text-white transition-colors text-lg">
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
          <div className="font-bold text-2xl tracking-tighter text-black">do it!</div>
          <div className="flex items-center gap-8 text-sm font-semibold text-gray-500">
            <a href="#" className="hover:text-black transition-colors">Términos</a>
            <a href="#" className="hover:text-black transition-colors">Privacidad</a>
            <a href="mailto:soporte.doit.app@gmail.com" className="hover:text-black transition-colors">Contacto</a>
          </div>
          <div className="text-sm font-medium text-gray-400">
            © {new Date().getFullYear()} do it! Todos los derechos reservados.
          </div>
        </div>
      </footer>

      {/* MODALES DE INSTALACIÓN IOS */}
      <Dialog open={showIOSAlert} onOpenChange={setShowIOSAlert}>
        <DialogContent className="bg-white rounded-3xl p-6 sm:max-w-md border-0 shadow-2xl [&>button]:hidden">
          <DialogHeader>
            <div className="w-12 h-12 bg-gray-100 text-black rounded-2xl flex items-center justify-center mx-auto mb-4"><Info className="w-6 h-6" /></div>
            <DialogTitle className="text-xl font-semibold text-center text-black">Abre Safari</DialogTitle>
            <DialogDescription className="text-center text-gray-500">
              Apple no permite instalar aplicaciones desde este navegador. Por favor, abre <strong>do-it.app</strong> en Safari para poder instalarla.
            </DialogDescription>
          </DialogHeader>
          <button onClick={() => setShowIOSAlert(false)} className="w-full mt-4 bg-black text-white rounded-xl py-3.5 font-medium">Entendido</button>
        </DialogContent>
      </Dialog>

      <Dialog open={showIOSInstructions} onOpenChange={setShowIOSInstructions}>
        <DialogContent className="bg-white rounded-3xl p-6 sm:max-w-md border-0 shadow-2xl [&>button]:hidden">
          <DialogHeader>
            <div className="w-12 h-12 bg-black text-white rounded-2xl flex items-center justify-center mx-auto mb-4"><Apple className="w-6 h-6" /></div>
            <DialogTitle className="text-xl font-semibold text-center text-black">Instala la App</DialogTitle>
          </DialogHeader>
          <div className="mt-4 bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-3 text-sm text-gray-600 font-medium">
            <p className="flex items-center gap-2"><span className="w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-black">1</span> Toca el botón Compartir en la barra inferior.</p>
            <p className="flex items-center gap-2"><span className="w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-black">2</span> Selecciona <strong>Añadir a inicio</strong>.</p>
          </div>
          <button onClick={() => setShowIOSInstructions(false)} className="w-full mt-4 bg-black text-white rounded-xl py-3.5 font-medium">Entendido</button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function X(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
}