import React, { useState, useMemo, useRef } from 'react';
import { useGetTasks, useGetPreferences, useCreateTask, getGetTasksQueryKey, Task } from '@workspace/api-client-react';
import { BottomTabBar } from '../components/BottomTabBar';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Loader2, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import { useQueryClient } from '@tanstack/react-query';
import { TaskModal } from '../components/TaskModal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as DayPickerCalendar } from "@/components/ui/calendar";

// FullCalendar Imports
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

export default function Calendar() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const { data: tasks, isLoading } = useGetTasks();
  const { data: prefs } = useGetPreferences();
  const createTask = useCreateTask();

  const calendarRef = useRef<FullCalendar>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentView, setCurrentView] = useState(isMobile ? 'timeGridDay' : 'timeGridWeek');

  const handleGoogleConnect = async () => {
    if (!user) return;
    if (prefs?.googleRefreshToken) return;
    const res = await fetch(`/api/calendar/connect?userId=${user.id}`).then(r => r.json());
    if (res.url) window.location.href = res.url;
  };

  const events = useMemo(() => {
    if (!tasks) return [];
    return tasks.map(t => {
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
        classNames: t.completada ? ['completed-event'] : [],
        extendedProps: { task: t }
      };
    });
  }, [tasks]);

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

    createTask.mutate({
      data: {
        titulo: "Nueva tarea",
        userId: user.id,
        fechaVencimiento,
        fechaFin,
        horaInicio,
        horaVencimiento
      } as any
    }, {
      onSuccess: (newTask) => {
        queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        setSelectedTask(newTask);
      }
    });
  };

  const handleCreateTask = () => {
    if (!user) return;
    createTask.mutate({
      data: {
        titulo: "Nueva tarea",
        userId: user.id,
        fechaVencimiento: format(currentDate, 'yyyy-MM-dd')
      }
    }, {
      onSuccess: (newTask) => {
        queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        setSelectedTask(newTask);
      }
    });
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
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
                <button onClick={() => calendarRef.current?.getApi().prev()} className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors"><ChevronLeft className="w-4 h-4"/></button>
                <button onClick={() => calendarRef.current?.getApi().today()} className="px-3 py-1.5 text-sm font-medium hover:bg-gray-50 rounded-lg transition-colors">Hoy</button>
                <button onClick={() => calendarRef.current?.getApi().next()} className="p-1.5 hover:bg-gray-50 rounded-lg transition-colors"><ChevronRight className="w-4 h-4"/></button>
              </div>
              <span className="text-lg font-semibold ml-4 capitalize text-gray-900">{format(currentDate, 'MMMM yyyy', { locale: es })}</span>
            </div>
            <div className="flex items-center gap-3">
              <Select value={currentView} onValueChange={(v) => { setCurrentView(v); calendarRef.current?.getApi().changeView(v); }}>
                <SelectTrigger className="bg-white border border-gray-200 rounded-xl h-[38px] px-4 text-sm font-medium shadow-sm w-auto"><SelectValue/></SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="dayGridMonth">Mes</SelectItem>
                  <SelectItem value="timeGridWeek">Semana</SelectItem>
                </SelectContent>
              </Select>
              <button onClick={handleCreateTask} className="bg-black text-white px-4 py-2 rounded-xl text-sm font-medium shadow-sm flex items-center gap-2 hover:bg-gray-800 transition-colors"><Plus className="w-4 h-4"/> Nueva tarea</button>
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
          <div className="flex items-center justify-between">
            <Popover>
              <PopoverTrigger className="bg-white border border-gray-200 rounded-xl h-[38px] px-3 text-sm font-medium shadow-sm flex items-center gap-2 text-gray-900">
                <CalendarIcon className="w-4 h-4 text-gray-500"/> {format(currentDate, 'MMM yyyy', { locale: es })}
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 rounded-2xl shadow-xl border-gray-100">
                <DayPickerCalendar mode="single" selected={currentDate} onSelect={(d) => { if(d) calendarRef.current?.getApi().gotoDate(d); }} />
              </PopoverContent>
            </Popover>
            <div className="flex items-center bg-white border border-gray-200 rounded-xl p-1 shadow-sm">
              <button onClick={() => calendarRef.current?.getApi().prev()} className="p-1.5 hover:bg-gray-50 rounded-lg"><ChevronLeft className="w-4 h-4"/></button>
              <button onClick={() => calendarRef.current?.getApi().today()} className="px-3 py-1.5 text-sm font-medium hover:bg-gray-50 rounded-lg">Hoy</button>
              <button onClick={() => calendarRef.current?.getApi().next()} className="p-1.5 hover:bg-gray-50 rounded-lg"><ChevronRight className="w-4 h-4"/></button>
            </div>
            <button onClick={handleCreateTask} className="bg-black text-white w-[38px] h-[38px] flex items-center justify-center rounded-xl shadow-sm hover:bg-gray-800 transition-colors"><Plus className="w-5 h-5"/></button>
          </div>
        </div>

      </div>

      {/* CUERPO DEL CALENDARIO (SCROLLABLE) */}
      <div className="flex-1 w-full max-w-[1600px] mx-auto px-2 md:px-6 min-h-0 pb-24">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : (
          <div className="bg-white h-full w-full">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={currentView}
              headerToolbar={false} // Desactivamos la cabecera nativa
              locale={es}
              firstDay={prefs?.inicioSemana === 'domingo' ? 0 : 1}
              events={events}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={false} // Permite que la fila de "todo el día" crezca sin scroll
              nowIndicator={true}
              slotMinTime="06:00:00"
              slotMaxTime="24:00:00"
              allDayText="" // Quitamos el texto
              select={handleDateSelect}
              eventClick={(info) => setSelectedTask(info.event.extendedProps.task)}
              datesSet={(arg) => setCurrentDate(arg.view.currentStart)}
              height="100%"
            />
          </div>
        )}
      </div>

      <TaskModal task={selectedTask} isOpen={!!selectedTask} onClose={() => setSelectedTask(null)} />
      <BottomTabBar />
    </div>
  );
}