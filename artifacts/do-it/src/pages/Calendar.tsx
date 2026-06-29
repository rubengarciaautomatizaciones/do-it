import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useGetTasks, useGetPreferences, useCreateTask, getGetTasksQueryKey, Task } from '@workspace/api-client-react';
import { BottomTabBar } from '../components/BottomTabBar';
import { useAuth } from '../contexts/AuthContext';
import { format, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Loader2, ChevronLeft, ChevronRight, Plus, ChevronDown } from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { TaskModal } from '../components/TaskModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { motion } from 'framer-motion';

// FullCalendar Imports
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

export default function Calendar() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { data: tasks, isLoading: tasksLoading } = useGetTasks();
  const { data: prefs } = useGetPreferences();
  const createTask = useCreateTask();

  // Fetch Google Calendar Events
  const { data: gcEvents } = useQuery({
    queryKey: ['googleCalendarEvents', user?.id],
    queryFn: async () => {
      if (!user || !prefs?.googleRefreshToken) return [];
      const res = await fetch(`/api/calendar/events?userId=${user.id}`);
      return res.json();
    },
    enabled: !!user && !!prefs?.googleRefreshToken,
  });

  const calendarRef = useRef<FullCalendar>(null);
  const [selectedTask, setSelectedTask] = useState<Partial<Task> | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState('timeGridWeek');

  // Estados para animaciones de Swipe
  const [slideConfig, setSlideConfig] = useState({ x: 0, opacity: 1 });
  const [miniSlideConfig, setMiniSlideConfig] = useState({ x: 0, opacity: 1 });

  const [miniCalDate, setMiniCalDate] = useState(new Date());
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  useEffect(() => {
    if (calendarRef.current) {
      const api = calendarRef.current.getApi();
      const targetView = isMobile ? 'timeGridDay' : 'timeGridWeek';
      if (api.view.type !== targetView) {
        api.changeView(targetView);
        setCurrentView(targetView);
      }
    }
  }, [isMobile]);

  const handleGoogleConnect = async () => {
    if (!user) return;
    if (prefs?.googleRefreshToken) return;
    const res = await fetch(`/api/calendar/connect?userId=${user.id}`).then(r => r.json());
    if (res.url) window.location.href = res.url;
  };

  const events = useMemo(() => {
    const doItEvents = (tasks || []).map(t => {
      let start = t.fechaVencimiento;
      let end = (t as any).fechaFin || t.fechaVencimiento;
      let allDay = true;

      if (t.horaInicio) {
        start = `${t.fechaVencimiento}T${t.horaInicio}:00`;
        allDay = false;
      } else if (t.horaVencimiento) {
        start = `${t.fechaVencimiento}T${t.horaVencimiento}:00`;
        allDay = false;
      }
      if (t.horaVencimiento) {
        end = `${(t as any).fechaFin || t.fechaVencimiento}T${t.horaVencimiento}:00`;
      }

      return {
        id: t.id,
        title: t.titulo,
        start,
        end,
        allDay,
        classNames: t.completada ? ['completed-event'] : ['doit-event'],
        extendedProps: { task: t }
      };
    });

    const googleEvents = (gcEvents || []).map((ge: any) => ({
      id: ge.id,
      title: ge.title,
      start: ge.start,
      end: ge.end,
      allDay: ge.allDay,
      classNames: ['google-event'],
      extendedProps: { isGoogleCalendar: true }
    }));

    return [...doItEvents, ...googleEvents];
  }, [tasks, gcEvents]);

  // Lógica de Animación y Swipe (Calendario Principal)
  const slideCalendar = (direction: 1 | -1) => {
    setSlideConfig({ x: direction * -20, opacity: 0 });
    setTimeout(() => {
      if (direction === 1) calendarRef.current?.getApi().next();
      else calendarRef.current?.getApi().prev();
      setSlideConfig({ x: direction * 20, opacity: 0 });
      setTimeout(() => {
        setSlideConfig({ x: 0, opacity: 1 });
      }, 50);
    }, 150);
  };

  let touchStartX = 0;
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    if (touchStartX - touchEndX > 50) slideCalendar(1);
    if (touchEndX - touchStartX > 50) slideCalendar(-1);
  };

  // Lógica de Animación y Swipe (Mini Calendario)
  const slideMiniCalendar = (direction: 1 | -1) => {
    setMiniSlideConfig({ x: direction * -20, opacity: 0 });
    setTimeout(() => {
      setMiniCalDate(prev => direction === 1 ? addMonths(prev, 1) : subMonths(prev, 1));
      setMiniSlideConfig({ x: direction * 20, opacity: 0 });
      setTimeout(() => {
        setMiniSlideConfig({ x: 0, opacity: 1 });
      }, 50);
    }, 150);
  };

  let miniTouchStartX = 0;
  const handleMiniTouchStart = (e: React.TouchEvent) => { miniTouchStartX = e.touches[0].clientX; };
  const handleMiniTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    if (miniTouchStartX - touchEndX > 50) slideMiniCalendar(1);
    if (touchEndX - miniTouchStartX > 50) slideMiniCalendar(-1);
  };

  const handleDateSelect = (selectInfo: any) => {
    if (!user) return;
    const isAllDay = selectInfo.allDay;
    const fechaVencimiento = format(selectInfo.start, 'yyyy-MM-dd');
    const fechaFin = format(selectInfo.end, 'yyyy-MM-dd');
    let horaInicio = null;
    let horaVencimiento = null;

    if (!isAllDay) {
      horaInicio = format(selectInfo.start, 'HH:mm');
      horaVencimiento = format(selectInfo.end, 'HH:mm');
    }

    setSelectedTask({
      titulo: "Nueva tarea",
      fechaVencimiento,
      fechaFin,
      horaInicio,
      horaVencimiento
    } as any);
  };

  const handleCreateTask = () => {
    if (!user) return;
    setSelectedTask({
      titulo: "Nueva tarea",
      fechaVencimiento: format(currentDate, 'yyyy-MM-dd')
    });
  };

  const renderMiniCalendar = () => {
    const start = new Date(miniCalDate.getFullYear(), miniCalDate.getMonth(), 1);
    const end = new Date(miniCalDate.getFullYear(), miniCalDate.getMonth() + 1, 0);
    const days = [];
    let firstDayIndex = start.getDay() - 1;
    if (firstDayIndex === -1) firstDayIndex = 6; 
    for (let i = 0; i < firstDayIndex; i++) days.push(null);
    for (let i = 1; i <= end.getDate(); i++) days.push(new Date(miniCalDate.getFullYear(), miniCalDate.getMonth(), i));

    return (
      <div className="w-full" onTouchStart={handleMiniTouchStart} onTouchEnd={handleMiniTouchEnd}>
        <div className="flex items-center justify-center mb-6 px-2">
          <span className="font-semibold text-lg text-gray-900 capitalize">{format(miniCalDate, 'MMMM yyyy', { locale: es })}</span>
        </div>
        <motion.div animate={miniSlideConfig} transition={{ duration: 0.15 }}>
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['L','M','X','J','V','S','D'].map(d => <div key={d} className="text-xs font-medium text-gray-400">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((d, i) => (
              <div key={i} className="aspect-square flex items-center justify-center">
                {d && (
                  <button 
                    onClick={() => { calendarRef.current?.getApi().gotoDate(d); setIsSheetOpen(false); }}
                    className={`w-10 h-10 rounded-full text-base font-medium flex items-center justify-center transition-colors ${format(d, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd') ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                  >
                    {d.getDate()}
                  </button>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <div className="h-[100dvh] bg-white flex flex-col overflow-hidden">

      {/* CABECERA FIJA */}
      <div className="px-4 md:px-6 pt-12 pb-4 flex-shrink-0 w-full max-w-[1600px] mx-auto bg-white z-20">

        {/* CABECERA DESKTOP */}
        <div className="hidden md:flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-semibold tracking-tight text-[#111111]">Calendario</h1>
            {!prefs?.googleRefreshToken && (
              <button onClick={handleGoogleConnect} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black transition-colors bg-gray-50 px-3 py-1.5 rounded-full">
                <CalendarIcon className="w-4 h-4" /> Conectar Google
              </button>
            )}
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-xl font-semibold capitalize text-gray-900 w-40">{format(currentDate, 'MMMM yyyy', { locale: es })}</span>
              <button onClick={() => { calendarRef.current?.getApi().today(); setCurrentDate(new Date()); }} className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-200 shadow-sm hover:bg-gray-50 rounded-lg transition-colors">Hoy</button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                <button onClick={() => slideCalendar(-1)} className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors"><ChevronLeft className="w-4 h-4"/></button>
                <button onClick={() => slideCalendar(1)} className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors"><ChevronRight className="w-4 h-4"/></button>
              </div>
              <Select value={currentView} onValueChange={(v) => { setCurrentView(v); calendarRef.current?.getApi().changeView(v); }}>
                <SelectTrigger className="bg-white border border-gray-200 rounded-xl h-[38px] px-4 text-sm font-medium shadow-sm w-auto"><SelectValue/></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="dayGridMonth">Mes</SelectItem>
                  <SelectItem value="timeGridWeek">Semana</SelectItem>
                </SelectContent>
              </Select>
              <button onClick={handleCreateTask} className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center shadow-sm hover:bg-gray-800 transition-colors"><Plus className="w-5 h-5"/></button>
            </div>
          </div>
        </div>

        {/* CABECERA MOBILE */}
        <div className="flex md:hidden flex-col gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-semibold tracking-tight text-[#111111]">Calendario</h1>
            {!prefs?.googleRefreshToken && (
              <button onClick={handleGoogleConnect} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black transition-colors bg-gray-50 px-3 py-1.5 rounded-full">
                <CalendarIcon className="w-4 h-4" /> Conectar
              </button>
            )}
          </div>
          <div className="flex items-center justify-between relative">
            <div className="flex items-center gap-2">
              <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
                <SheetTrigger className="bg-white border border-gray-200 rounded-xl h-[38px] px-3 text-sm font-medium shadow-sm flex items-center gap-2 text-gray-900">
                  {format(currentDate, 'MMM yyyy', { locale: es })} <ChevronDown className="w-4 h-4 text-gray-500"/>
                </SheetTrigger>
                <SheetContent side="top" className="p-6 rounded-b-3xl h-auto max-h-[70vh] overflow-y-auto [&>button]:hidden">
                  {renderMiniCalendar()}
                </SheetContent>
              </Sheet>
              <button onClick={() => { calendarRef.current?.getApi().today(); setCurrentDate(new Date()); }} className="bg-white border border-gray-200 rounded-xl h-[38px] px-4 text-sm font-medium shadow-sm hover:bg-gray-50 text-gray-900">Hoy</button>
            </div>
            <button onClick={handleCreateTask} className="bg-black text-white w-10 h-10 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-800 transition-colors"><Plus className="w-5 h-5"/></button>
          </div>
        </div>

      </div>

      {/* CUERPO DEL CALENDARIO (SCROLLABLE & ANIMATED) */}
      <div className="flex-1 w-full max-w-[1600px] mx-auto px-2 md:px-6 min-h-0 pb-24" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {tasksLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : (
          <motion.div animate={slideConfig} transition={{ duration: 0.15 }} className="bg-white h-full w-full overflow-hidden border-t border-gray-100">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={currentView}
              headerToolbar={false}
              locale={es}
              firstDay={prefs?.inicioSemana === 'domingo' ? 0 : 1}
              events={events}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={false}
              nowIndicator={true}
              slotMinTime="00:00:00"
              slotMaxTime="24:00:00"
              slotDuration="01:00:00"
              slotLabelInterval="01:00:00"
              snapDuration="00:15:00"
              selectLongPressDelay={1000}
              fixedWeekCount={false} // <-- Evita mostrar 2 semanas del mes siguiente
              allDayText=""
              select={handleDateSelect}
              eventClick={(info) => {
                if (info.event.extendedProps.isGoogleCalendar) return;
                setSelectedTask(info.event.extendedProps.task);
              }}
              datesSet={(arg) => {
                setCurrentDate(arg.view.currentStart);
                setMiniCalDate(arg.view.currentStart);
              }}
              height="100%"
              dayHeaderContent={(args) => {
                const dayName = format(args.date, 'EEEE', { locale: es }).toUpperCase();
                const dayNumber = format(args.date, 'd');
                const isMonthView = args.view.type === 'dayGridMonth';

                return (
                  <div className={`flex flex-col items-center justify-center ${isMonthView ? 'py-3' : 'py-2'}`}>
                    <span className={`day-name text-[10px] font-semibold tracking-wider ${isMonthView ? 'opacity-100' : 'opacity-60'}`}>{dayName}</span>
                    {!isMonthView && <span className="text-xl font-bold mt-0.5">{dayNumber}</span>}
                  </div>
                );
              }}
            />
          </motion.div>
        )}
      </div>

      <TaskModal task={selectedTask} isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} />
      <BottomTabBar />
    </div>
  );
}