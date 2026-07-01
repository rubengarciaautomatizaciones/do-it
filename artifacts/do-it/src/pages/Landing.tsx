import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';
import { Mic, Calendar, Target, ArrowRight, Check, Minus, ChevronLeft, ChevronRight, Zap, Clock, Apple, Smartphone, Info } from 'lucide-react';
import useEmblaCarousel from 'embla-carousel-react';
import { useIsMobile } from '../hooks/use-mobile';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

// --- COMPONENTE: CARRUSEL 3D ---
const ShowcaseCarousel = () => {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'center' });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', () => setSelectedIndex(emblaApi.selectedScrollSnap()));
  }, [emblaApi]);

  const handlePrev = () => emblaApi?.scrollPrev();
  const handleNext = () => emblaApi?.scrollNext();

  const slides = [
    {
      title: "Input Mágico",
      desc: "La IA extrae la acción y calcula las fechas por ti.",
      mockup: (
        <div className="w-full h-full bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col">
          <div className="flex items-end gap-3 mb-6">
            <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center shrink-0"><Mic className="w-4 h-4 text-white" /></div>
            <div className="bg-gray-100 rounded-2xl rounded-bl-none p-3 text-sm text-left text-gray-800 leading-snug">
              "Recuérdame llamar al dentista mañana a las 10 de la mañana"
            </div>
          </div>
          <div className="mt-auto border border-gray-100 rounded-xl p-3 bg-white shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
              <span className="font-semibold text-sm text-black">Llamar al dentista</span>
            </div>
            <div className="flex gap-2">
              <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md flex items-center gap-1"><Calendar className="w-3 h-3"/> Mañana</span>
              <span className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded-md flex items-center gap-1"><Clock className="w-3 h-3"/> 10:00</span>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Hábitos Sólidos",
      desc: "Tracker visual minimalista con rachas automáticas.",
      mockup: (
        <div className="w-full h-full bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col">
          <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
            <span className="font-bold text-sm text-black">Esta semana</span>
            <Target className="w-4 h-4 text-gray-400"/>
          </div>
          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {[
              { n: 'Leer 20 págs', p: [1,1,1,0,1] },
              { n: 'Gimnasio', p: [1,0,1,0,0] },
              { n: 'Beber agua', p: [1,1,1,1,1] }
            ].map((h, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-700 w-20 text-left truncate">{h.n}</span>
                <div className="flex gap-1.5">
                  {h.p.map((done, d) => (
                    <div key={d} className={`w-4 h-4 rounded-[4px] ${done ? 'bg-black' : 'bg-gray-100'}`} />
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
      desc: "Sincronización bidireccional en tiempo real.",
      mockup: (
        <div className="w-full h-full bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <span className="font-bold text-sm text-black">Hoy</span>
            <Calendar className="w-4 h-4 text-gray-400"/>
          </div>
          <div className="relative flex-1 border-l-2 border-gray-100 ml-2 pl-4 space-y-3 py-1">
            <div className="absolute w-2.5 h-2.5 bg-black rounded-full -left-[6px] top-6 border-2 border-white"></div>
            <div className="bg-gray-50 p-2.5 rounded-lg text-left border border-gray-100">
              <span className="font-bold text-xs text-black block mb-0.5">Reunión de equipo</span>
              <span className="text-[10px] text-gray-500 font-medium">10:00 - 11:00</span>
            </div>
            <div className="bg-black p-2.5 rounded-lg text-left shadow-md">
              <span className="font-bold text-xs text-white block mb-0.5">Entregar reporte</span>
              <span className="text-[10px] text-gray-300 font-medium">12:00</span>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-8">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 w-12 md:w-24 bg-gradient-to-r from-[#FAFAFA] to-transparent z-10 pointer-events-none" />
        <div className="absolute inset-y-0 right-0 w-12 md:w-24 bg-gradient-to-l from-[#FAFAFA] to-transparent z-10 pointer-events-none" />

        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex touch-pan-y items-center">
            {slides.map((slide, index) => {
              const offset = index - selectedIndex;
              const total = slides.length;
              let pos = (offset + total) % total;
              if (pos > Math.floor(total / 2)) pos -= total;

              const isCenter = pos === 0;
              const isAdjacent = Math.abs(pos) === 1;

              return (
                <div key={index} className="flex-[0_0_85%] md:flex-[0_0_40%] min-w-0 px-3 transition-all duration-500" 
                     style={{ 
                       opacity: isCenter ? 1 : isAdjacent ? 0.5 : 0, 
                       transform: `scale(${isCenter ? 1 : 0.85})`,
                       filter: isCenter ? 'blur(0px)' : 'blur(2px)'
                     }}>
                  <div className="h-[280px] mb-6">
                    {slide.mockup}
                  </div>
                  <div className="text-center px-4" style={{ opacity: isCenter ? 1 : 0 }}>
                    <h3 className="text-xl font-bold text-black mb-2 tracking-tight">{slide.title}</h3>
                    <p className="text-sm text-gray-500 font-medium leading-relaxed">{slide.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {!isMobile && (
          <>
            <button onClick={handlePrev} className="absolute left-2 md:left-8 top-[140px] -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-black hover:bg-gray-50 transition-colors z-20">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={handleNext} className="absolute right-2 md:right-8 top-[140px] -translate-y-1/2 w-10 h-10 rounded-full bg-white border border-gray-200 shadow-sm flex items-center justify-center text-black hover:bg-gray-50 transition-colors z-20">
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
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
      <header className="fixed top-0 left-0 right-0 px-6 py-4 flex items-center justify-between w-full z-50 bg-white/80 backdrop-blur-md border-b border-gray-200/50">
        <div className="w-full max-w-5xl mx-auto flex items-center justify-between">
          <div className="font-bold text-xl tracking-tighter text-black">do it!</div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <button className="text-sm font-semibold text-gray-500 hover:text-black transition-colors hidden md:block">
                Entrar
              </button>
            </Link>
            {!isMobile && (
              <Link href="/signup">
                <button className="bg-black text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-gray-800 transition-transform active:scale-95 shadow-sm">
                  Empezar
                </button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center w-full pt-28">

        {/* HERO SECTION */}
        <section className="w-full max-w-3xl mx-auto px-6 pt-8 pb-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: "easeOut" }}>
            <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-black mb-6 leading-[1.05]">
              Ponlo y hazlo.
            </h1>
            <p className="text-lg md:text-xl text-gray-500 mb-10 max-w-xl mx-auto font-medium leading-relaxed">
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
                <button className="bg-black text-white border-2 border-black rounded-full px-8 py-3.5 text-base font-semibold hover:bg-white hover:text-black transition-colors active:scale-[0.98] shadow-lg flex items-center justify-center gap-2 mx-auto">
                  Empezar gratis <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            )}
          </motion.div>
        </section>

        {/* CARRUSEL REALISTA */}
        <motion.section initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.2 }} className="w-full">
          <ShowcaseCarousel />
        </motion.section>

        {/* NUESTRA HISTORIA */}
        <section className="w-full max-w-3xl mx-auto px-6 py-20">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6 }}>
            <div className="bg-white rounded-[2rem] p-10 md:p-14 border border-gray-200 shadow-sm text-left">
              <h2 className="text-3xl font-bold tracking-tighter text-black mb-6">Por qué creé do it!</h2>
              <div className="space-y-4 text-lg text-gray-600 font-medium leading-relaxed">
                <p>Buscaba una herramienta que trabajara para mí, no al revés.</p>
                <p>Las apps del mercado estaban llenas de colores estridentes, gráficos innecesarios y formularios complejos que me hacían perder el tiempo. Quería algo donde pudiera entrar, soltar lo que tenía en la cabeza (por voz o texto) y salir en 3 segundos, sabiendo que una IA lo organizaría todo por mí.</p>
                <p>Como no existía, la construí. Minimalismo extremo por fuera, tecnología punta por dentro.</p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* PRICING SECTION */}
        <section className="w-full max-w-4xl mx-auto px-6 py-16 border-t border-gray-200/50">
          <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6 }}>
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tighter text-black mb-3">Planes simples.</h2>
              <p className="text-lg text-gray-500 font-medium">Empieza gratis, mejora cuando lo necesites.</p>

              <div className="flex items-center justify-center bg-white p-1.5 rounded-full mt-10 w-fit mx-auto border border-gray-200 shadow-sm">
                <button onClick={() => setIsAnnual(false)} className={`px-6 py-3 rounded-full text-sm font-bold transition-all ${!isAnnual ? 'bg-gray-100 text-black' : 'text-gray-400 hover:text-black'}`}>Mensual</button>
                <button onClick={() => setIsAnnual(true)} className={`px-6 py-3 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${isAnnual ? 'bg-gray-100 text-black' : 'text-gray-400 hover:text-black'}`}>
                  Anual <span className="bg-black text-white text-[10px] px-2 py-0.5 rounded-full">-40%</span>
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 md:gap-6 mt-8">
              {/* Free Plan */}
              <div className="bg-white rounded-[2rem] p-8 border border-gray-200 shadow-sm flex flex-col hover:shadow-md transition-shadow mt-4 md:mt-0">
                <h3 className="text-2xl font-bold text-black mb-1 tracking-tight">Free</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-black tracking-tighter">0€</span>
                  <span className="text-gray-500 font-medium text-sm">/para siempre</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-gray-600 font-medium text-sm"><Check className="w-4 h-4 text-black shrink-0" /> Tareas ilimitadas</li>
                  <li className="flex items-center gap-3 text-gray-600 font-medium text-sm"><Check className="w-4 h-4 text-black shrink-0" /> Notificaciones Push</li>
                  <li className="flex items-center gap-3 text-gray-600 font-medium text-sm"><Minus className="w-4 h-4 text-gray-300 shrink-0" /> 3 usos de IA al mes</li>
                  <li className="flex items-center gap-3 text-gray-600 font-medium text-sm"><Minus className="w-4 h-4 text-gray-300 shrink-0" /> 5 hábitos activos</li>
                  <li className="flex items-center gap-3 text-gray-400 font-medium text-sm"><X className="w-4 h-4 text-gray-200 shrink-0" /> Google Calendar</li>
                  <li className="flex items-center gap-3 text-gray-400 font-medium text-sm"><X className="w-4 h-4 text-gray-200 shrink-0" /> Estadísticas avanzadas</li>
                </ul>
                <Link href="/signup">
                  <button className="w-full bg-black text-white border-2 border-black rounded-xl py-3.5 font-bold hover:bg-white hover:text-black transition-colors text-sm">
                    Crear cuenta gratis
                  </button>
                </Link>
              </div>

              {/* Premium Plan */}
              <div className="relative bg-black rounded-[2rem] p-8 border border-black shadow-xl flex flex-col mt-8 md:mt-0">
                <h3 className="text-2xl font-bold text-white mb-1 tracking-tight mt-2">Premium</h3>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-bold text-white tracking-tighter">{isAnnual ? '49.99€' : '6.99€'}</span>
                  <span className="text-gray-400 font-medium text-sm">/{isAnnual ? 'año' : 'mes'}</span>
                </div>
                <ul className="space-y-4 mb-8 flex-1">
                  <li className="flex items-center gap-3 text-gray-300 font-medium text-sm"><Check className="w-4 h-4 text-white shrink-0" /> Tareas ilimitadas</li>
                  <li className="flex items-center gap-3 text-gray-300 font-medium text-sm"><Check className="w-4 h-4 text-white shrink-0" /> Notificaciones Push</li>
                  <li className="flex items-center gap-3 text-gray-300 font-medium text-sm"><Check className="w-4 h-4 text-white shrink-0" /> IA Ilimitada</li>
                  <li className="flex items-center gap-3 text-gray-300 font-medium text-sm"><Check className="w-4 h-4 text-white shrink-0" /> Hábitos ilimitados</li>
                  <li className="flex items-center gap-3 text-gray-300 font-medium text-sm"><Check className="w-4 h-4 text-white shrink-0" /> Google Calendar</li>
                  <li className="flex items-center gap-3 text-gray-300 font-medium text-sm"><Check className="w-4 h-4 text-white shrink-0" /> Estadísticas avanzadas</li>
                </ul>
                <Link href="/signup">
                  <button className="w-full bg-white text-black border-2 border-white rounded-xl py-3.5 font-bold hover:bg-black hover:text-white transition-colors text-sm">
                    Empezar 7 días gratis
                  </button>
                </Link>
              </div>
            </div>
          </motion.div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-gray-200 bg-white py-8 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="font-bold text-xl tracking-tighter text-black">do it!</div>
          <div className="flex items-center gap-6 text-xs font-semibold text-gray-500">
            <a href="#" className="hover:text-black transition-colors">Términos</a>
            <a href="#" className="hover:text-black transition-colors">Privacidad</a>
            <a href="mailto:soporte.doit.app@gmail.com" className="hover:text-black transition-colors">Contacto</a>
          </div>
          <div className="text-xs font-medium text-gray-400">
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