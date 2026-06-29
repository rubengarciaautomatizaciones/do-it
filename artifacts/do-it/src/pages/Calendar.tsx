import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useGetTasks, useGetPreferences, getGetTasksQueryKey, Task } from '@workspace/api-client-react';
import { BottomTabBar } from '../components/BottomTabBar';
import { useAuth } from '../contexts/AuthContext';
import { format, addMonths, subMonths } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Loader2, ChevronLeft, ChevronRight, Plus, ChevronDown } from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { TaskModal } from '../components/TaskModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

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

  // Estado para el mini-calendario manual (Popover)
  const [miniCalDate, setMiniCalDate] = useState(new Date());
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

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

  // Lógica de Swipe para el calendario principal
  let touchStartX = 0;
  const handleTouchStart = (e: React.TouchEvent) => { touchStartX = e.touches[0].clientX; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    if (touchStartX - touchEndX > 50) calendarRef.current?.getApi().next();
    if (touchEndX - touchStartX > 50) calendarRef.current?.getApi().prev();
  };

  // Lógica de Swipe para el mini-calendario
  let miniTouchStartX = 0;
  const handleMiniTouchStart = (e: React.TouchEvent) => { miniTouchStartX = e.touches[0].clientX; };
  const handleMiniTouchEnd = (e: React.TouchEvent) => {
    const touchEndX = e.changedTouches[0].clientX;
    if (miniTouchStartX - touchEndX > 50) setMiniCalDate(addMonths(miniCalDate, 1));
    if (touchEndX - miniTouchStartX > 50) setMiniCalDate(subMonths(miniCalDate, 1));
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

    // Abrimos el modal en modo BORRADOR (sin guardar en BD)
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

  // Generador manual del mini-calendario para poder hacer swipe
  const renderMiniCalendar = () => {
    const start = new Date(miniCalDate.getFullYear(), miniCalDate.getMonth(), 1);
    const end = new Date(miniCalDate.getFullYear(), miniCalDate.getMonth() + 1, 0);
    const days = [];
    // Rellenar días vacíos al principio
    let firstDayIndex = start.getDay() - 1;
    if (firstDayIndex === -1) firstDayIndex = 6; // Domingo
    for (let i = 0; i < firstDayIndex; i++) days.push(null);
    // Días del mes
    for (let i = 1; i <= end.getDate(); i++) days.push(new Date(miniCalDate.getFullYear(), miniCalDate.getMonth(), i));

    return (
      <div className="w-full" onTouchStart={handleMiniTouchStart} onTouchEnd={handleMiniTouchEnd}>
        <div className="flex items-center justify-between mb-4 px-2">
          <span className="font-semibold text-gray-900 capitalize">{format(miniCalDate, 'MMMM yyyy', { locale: es })}</span>
          <div className="flex gap-2">
            <button onClick={() => setMiniCalDate(subMonths(miniCalDate, 1))} className="p-1 text-gray-400 hover:text-black"><ChevronLeft className="w-5 h-5"/></button>
            <button onClick={() => setMiniCalDate(addMonths(miniCalDate, 1))} className="p-1 text-gray-400 hover:text-black"><ChevronRight className="w-5 h-5"/></button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center mb-2">
          {['L','M','X','J','V','S','D'].map(d => <div key={d} className="text-xs font-medium text-gray-400">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d, i) => (
            <div key={i} className="aspect-square flex items-center justify-center">
              {d && (
                <button 
                  onClick={() => { calendarRef.current?.getApi().gotoDate(d); setIsPopoverOpen(false); }}
                  className={`w-8 h-8 rounded-full text-sm font-medium flex items-center justify-center transition-colors ${format(d, 'yyyy-MM-dd') === format(currentDate, 'yyyy-MM-dd') ? 'bg-black text-white' : 'text-gray-700 hover:bg-gray-100'}`}
                >
                  {d.getDate()}
                </button>
              )}
            </div>
          ))}
        </div>
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
            <div className="flex items-center gap-6">
              <span className="text-xl font-semibold capitalize text-gray-900">{format(currentDate, 'MMMM yyyy', { locale: es })}</span>
              <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                <button onClick={() => calendarRef.current?.getApi().prev()} className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors"><ChevronLeft className="w-4 h-4"/></button>
                <button onClick={() => calendarRef.current?.getApi().today()} className="px-3 py-1.5 text-sm font-medium hover:bg-gray-50 rounded-lg transition-colors">Hoy</button>
                <button onClick={() => calendarRef.current?.getApi().next()} className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors"><ChevronRight className="w-4 h-4"/></button>
              </div>
            </div>
            <div className="flex items-center gap-3">
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
              <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
                <PopoverTrigger className="bg-white border border-gray-200 rounded-xl h-[38px] px-3 text-sm font-medium shadow-sm flex items-center gap-2 text-gray-900">
                  {format(currentDate, 'MMM yyyy', { locale: es })} <ChevronDown className="w-4 h-4 text-gray-500"/>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[calc(100vw-2rem)] p-4 rounded-2xl shadow-xl border-gray-100 mt-2">
                  {renderMiniCalendar()}
                </PopoverContent>
              </Popover>
              <button onClick={() => calendarRef.current?.getApi().today()} className="bg-white border border-gray-200 rounded-xl h-[38px] px-4 text-sm font-medium shadow-sm hover:bg-gray-50 text-gray-900">Hoy</button>
            </div>
            <button onClick={handleCreateTask} className="bg-black text-white w-10 h-10 rounded-full flex items-center justify-center shadow-sm hover:bg-gray-800 transition-colors"><Plus className="w-5 h-5"/></button>
          </div>
        </div>

      </div>

      {/* CUERPO DEL CALENDARIO (SCROLLABLE) */}
      <div className="flex-1 w-full max-w-[1600px] mx-auto px-2 md:px-6 min-h-0 pb-24" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        {tasksLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : (
          <div className="bg-white h-full w-full rounded-t-2xl overflow-hidden border border-gray-100 border-b-0">
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
              snapDuration="00:15:00" // <-- 15 minutos
              selectLongPressDelay={1000} // <-- 1 segundo para crear/arrastrar en móvil
              allDayText=""
              select={handleDateSelect}
              eventClick={(info) => {
                if (info.event.extendedProps.isGoogleCalendar) return; // No editar eventos de Google
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
                return (
                  <div className="flex flex-col items-center justify-center py-2">
                    <span className="text-[10px] font-semibold tracking-wider opacity-60">{dayName}</span>
                    <span className="text-xl font-bold mt-0.5">{dayNumber}</span>
                  </div>
                );
              }}
            />
          </div>
        )}
      </div>

      <TaskModal task={selectedTask} isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} />
      <BottomTabBar />
    </div>
  );
}