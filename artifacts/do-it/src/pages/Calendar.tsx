import React, { useState, useMemo } from 'react';
import { useGetTasks, useGetPreferences, useCreateTask, getGetTasksQueryKey, Task } from '@workspace/api-client-react';
import { BottomTabBar } from '../components/BottomTabBar';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile';
import { useQueryClient } from '@tanstack/react-query';
import { TaskModal } from '../components/TaskModal';

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

  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const handleGoogleConnect = async () => {
    if (!user) return;
    if (prefs?.googleRefreshToken) return;
    const res = await fetch(`/api/calendar/connect?userId=${user.id}`).then(r => r.json());
    if (res.url) window.location.href = res.url;
  };

  // Mapear tareas a eventos de FullCalendar
  const events = useMemo(() => {
    if (!tasks) return [];
    return tasks.map(t => {
      let start = t.fechaVencimiento;
      let end = t.fechaVencimiento;
      let allDay = true;

      if (t.horaInicio) {
        start = `${t.fechaVencimiento}T${t.horaInicio}:00`;
        allDay = false;
      } else if (t.horaVencimiento) {
        start = `${t.fechaVencimiento}T${t.horaVencimiento}:00`;
        allDay = false;
      }

      if (t.horaVencimiento) {
        end = `${t.fechaVencimiento}T${t.horaVencimiento}:00`;
      }

      return {
        id: t.id,
        title: t.titulo,
        start,
        end,
        allDay,
        backgroundColor: t.completada ? '#F5F5F5' : '#111111',
        borderColor: t.completada ? '#E5E7EB' : '#111111',
        textColor: t.completada ? '#A3A3A3' : '#FFFFFF',
        extendedProps: { task: t }
      };
    });
  }, [tasks]);

  // Crear tarea al hacer clic/arrastrar en el calendario
  const handleDateSelect = (selectInfo: any) => {
    if (!user) return;
    const isAllDay = selectInfo.allDay;
    const fechaVencimiento = format(selectInfo.start, 'yyyy-MM-dd');
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
        horaInicio,
        horaVencimiento
      }
    }, {
      onSuccess: (newTask) => {
        queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        setSelectedTask(newTask);
      }
    });
  };

  // Abrir modal al hacer clic en un evento
  const handleEventClick = (clickInfo: any) => {
    setSelectedTask(clickInfo.event.extendedProps.task);
  };

  return (
    <div className="min-h-[100dvh] bg-white pb-32 flex flex-col">
      <div className="px-6 pt-12 pb-4 flex items-center justify-between">
        <h1 className="text-3xl font-semibold tracking-tight text-[#111111]">Calendario</h1>

        {!prefs?.googleRefreshToken && (
          <button onClick={handleGoogleConnect} className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-black transition-colors bg-gray-50 px-3 py-1.5 rounded-full">
            <CalendarIcon className="w-4 h-4" /> Conectar Google
          </button>
        )}
      </div>

      <div className="flex-1 px-4 md:px-6 w-full max-w-[1600px] mx-auto">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : (
          <div className="bg-white h-[calc(100vh-180px)]">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={isMobile ? 'timeGridDay' : 'timeGridWeek'}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: isMobile ? 'timeGridDay,dayGridMonth' : 'timeGridWeek,dayGridMonth'
              }}
              locale={es}
              firstDay={prefs?.inicioSemana === 'domingo' ? 0 : 1}
              events={events}
              selectable={true}
              selectMirror={true}
              dayMaxEvents={true}
              nowIndicator={true}
              slotMinTime="06:00:00"
              slotMaxTime="24:00:00"
              allDayText="Todo el día"
              buttonText={{
                today: 'Hoy',
                month: 'Mes',
                week: 'Semana',
                day: 'Día'
              }}
              select={handleDateSelect}
              eventClick={handleEventClick}
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