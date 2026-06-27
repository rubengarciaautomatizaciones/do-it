import React, { useState, useMemo, useEffect } from 'react';
import { useGetHabits, useCreateHabit, useUpdateHabit, useDeleteHabit, useLogHabit, useUnlogHabit, getGetHabitsQueryKey } from '@workspace/api-client-react';
import { BottomTabBar } from '../components/BottomTabBar';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { format, subDays, addDays, isToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Loader2, Archive, Settings, Trash2, Calendar as CalendarIcon, Target, Clock, Activity } from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Checkbox } from '../components/TaskItem';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '../hooks/use-toast';

// --- COMPONENTE CONTROL NUMÉRICO (Evita lag al escribir) ---
function NumericHabitControl({ value, target, unit, onChange }: { value: number, target: number, unit?: string, onChange: (val: number) => void }) {
  const [localVal, setLocalVal] = useState(value.toString());

  useEffect(() => { setLocalVal(value.toString()); }, [value]);

  const handleBlur = () => {
    let num = parseInt(localVal);
    if (isNaN(num) || num < 0) num = 0;
    setLocalVal(num.toString());
    if (num !== value) onChange(num);
  };

  const adjust = (amount: number) => {
    let num = parseInt(localVal);
    if (isNaN(num)) num = 0;
    const newVal = Math.max(0, num + amount);
    setLocalVal(newVal.toString());
    onChange(newVal);
  };

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1" onClick={e => e.stopPropagation()}>
      <button onClick={() => adjust(-1)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-black hover:bg-white rounded-md transition-colors font-medium text-lg">-</button>
      <div className="flex items-center px-1">
        <input 
          type="text" 
          inputMode="numeric" 
          pattern="[0-9]*"
          value={localVal} 
          onChange={(e) => setLocalVal(e.target.value)} 
          onBlur={handleBlur}
          className="w-8 text-center bg-transparent border-none p-0 text-sm font-semibold focus:ring-0" 
        />
        {unit && <span className="text-xs text-gray-400 pr-1">{unit}</span>}
      </div>
      <button onClick={() => adjust(1)} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-black hover:bg-white rounded-md transition-colors font-medium text-lg">+</button>
    </div>
  );
}

export default function Habits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { data: allHabits, isLoading } = useGetHabits();
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const deleteHabit = useDeleteHabit();
  const logHabit = useLogHabit();
  const unlogHabit = useUnlogHabit();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'activos' | 'archivados'>('activos');

  // Estados del Modal de Edición/Creación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Formulario
  const [fNombre, setFNombre] = useState('');
  const [fDescripcion, setFDescripcion] = useState('');
  const [fTipoMeta, setFTipoMeta] = useState('boolean');
  const [fMetaNumero, setFMetaNumero] = useState(1);
  const [fUnidad, setFUnidad] = useState('');
  const [fFrecuenciaTipo, setFFrecuenciaTipo] = useState('diario');
  const [fFrecuenciaValor, setFFrecuenciaValor] = useState<number[]>([0,1,2,3,4,5,6]);
  const [fRecordatorioHora, setFRecordatorioHora] = useState('');
  const [fFechaInicio, setFFechaInicio] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [fFechaFin, setFFechaFin] = useState('');
  const [fEstado, setFEstado] = useState('activo');

  const openModal = (habit?: any) => {
    if (habit) {
      setEditingId(habit.id);
      setFNombre(habit.nombre);
      setFDescripcion(habit.descripcion || '');
      setFTipoMeta(habit.tipoMeta);
      setFMetaNumero(habit.metaNumero);
      setFUnidad(habit.unidad || '');
      setFFrecuenciaTipo(habit.frecuenciaTipo);
      setFFrecuenciaValor(habit.frecuenciaValor);
      setFRecordatorioHora(habit.recordatorioHora || '');
      setFFechaInicio(habit.fechaInicio);
      setFFechaFin(habit.fechaFin || '');
      setFEstado(habit.estado);
    } else {
      setEditingId(null);
      setFNombre('');
      setFDescripcion('');
      setFTipoMeta('boolean');
      setFMetaNumero(1);
      setFUnidad('');
      setFFrecuenciaTipo('diario');
      setFFrecuenciaValor([0,1,2,3,4,5,6]);
      setFRecordatorioHora('');
      setFFechaInicio(format(new Date(), 'yyyy-MM-dd'));
      setFFechaFin('');
      setFEstado('activo');
    }
    setIsModalOpen(true);
  };

  const handleSaveHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fNombre.trim() || !user) return;

    const payload = {
      nombre: fNombre.trim(),
      descripcion: fDescripcion.trim() || null,
      tipoMeta: fTipoMeta,
      metaNumero: fMetaNumero,
      unidad: fUnidad.trim() || null,
      frecuenciaTipo: fFrecuenciaTipo,
      frecuenciaValor: fFrecuenciaValor,
      recordatorioHora: fRecordatorioHora || null,
      fechaInicio: fFechaInicio,
      fechaFin: fFechaFin || null,
      estado: fEstado,
    };

    if (editingId) {
      updateHabit.mutate({ id: editingId, data: payload }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() }); setIsModalOpen(false); }
      });
    } else {
      createHabit.mutate({ data: { ...payload, userId: user.id } }, {
        onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() }); setIsModalOpen(false); },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
      });
    }
  };

  const handleDelete = () => {
    if (!editingId) return;
    deleteHabit.mutate({ id: editingId }, {
      onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() }); setIsModalOpen(false); }
    });
  };

  // --- LÓGICA DE DATOS ---
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayOfWeek = selectedDate.getDay();

  const visibleHabits = useMemo(() => {
    if (!allHabits) return [];
    if (viewMode === 'archivados') return allHabits.filter(h => h.estado === 'archivado');

    return allHabits.filter(h => {
      if (h.estado === 'archivado') return false;
      // Si tiene fecha de inicio futura, no lo mostramos hoy
      if (h.fechaInicio > dateStr) return false;
      // Si tiene fecha fin y ya pasó, no lo mostramos
      if (h.fechaFin && h.fechaFin < dateStr) return false;

      // Filtro de días específicos
      if (h.frecuenciaTipo === 'dias_especificos' && !h.frecuenciaValor.includes(dayOfWeek)) return false;

      return true;
    });
  }, [allHabits, viewMode, dateStr, dayOfWeek]);

  const stats = useMemo(() => {
    if (!visibleHabits || visibleHabits.length === 0) return { percent: 0, weeklyData: [] };

    // Calcular porcentaje del Donut (Progreso de Hoy)
    let totalPercent = 0;
    let applicableHabits = 0;

    visibleHabits.forEach(h => {
      if (h.estado === 'pausado') return;
      applicableHabits++;

      const todayLog = h.logs?.find((l: any) => l.fecha === dateStr);
      const val = todayLog ? todayLog.valor : 0;

      if (h.tipoMeta === 'boolean') {
        totalPercent += val > 0 ? 100 : 0;
      } else {
        totalPercent += Math.min(100, (val / h.metaNumero) * 100);
      }
    });

    const percent = applicableHabits === 0 ? 0 : Math.round(totalPercent / applicableHabits);

    // Datos para el Bar Chart (últimos 7 días)
    const weeklyData = Array.from({ length: 7 }).map((_, i) => {
      const d = subDays(new Date(), 6 - i);
      const dStr = format(d, 'yyyy-MM-dd');

      let dayTotal = 0;
      let dayCompleted = 0;

      allHabits?.forEach(h => {
        if (h.estado !== 'activo' || h.fechaInicio > dStr || (h.fechaFin && h.fechaFin < dStr)) return;
        if (h.frecuenciaTipo === 'dias_especificos' && !h.frecuenciaValor.includes(d.getDay())) return;

        dayTotal++;
        const log = h.logs?.find((l: any) => l.fecha === dStr);
        if (log && log.valor >= (h.tipoMeta === 'boolean' ? 1 : h.metaNumero)) {
          dayCompleted++;
        }
      });

      return {
        name: format(d, 'EEEEEE', { locale: es }).toUpperCase(),
        completados: dayCompleted,
        total: dayTotal,
        fullDate: format(d, "d 'de' MMMM", { locale: es })
      };
    });

    return { percent, weeklyData };
  }, [visibleHabits, allHabits, dateStr]);

  const handleUpdateValue = (habitId: string, newValue: number) => {
    if (newValue <= 0) {
      unlogHabit.mutate({ id: habitId, date: dateStr } as any, {
        onSettled: () => queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() })
      });
    } else {
      logHabit.mutate({ id: habitId, date: dateStr, data: { valor: newValue } } as any, {
        onSettled: () => queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() })
      });
    }
  };

  return (
    <div className="min-h-[100dvh] bg-white pb-32">
      <div className="px-6 pt-12 pb-6 max-w-2xl mx-auto">

        {/* HEADER */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[#111111]">
            {viewMode === 'activos' ? 'Hábitos' : 'Archivados'}
          </h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setViewMode(viewMode === 'activos' ? 'archivados' : 'activos')} 
              className={`p-2 rounded-full transition-colors ${viewMode === 'archivados' ? 'bg-black text-white' : 'bg-gray-50 text-gray-900 hover:bg-gray-100'}`}
            >
              <Archive className="w-5 h-5" />
            </button>
            {viewMode === 'activos' && (
              <button onClick={() => openModal()} className="p-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors shadow-sm">
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* GRÁFICAS (Solo en vista Activos) */}
        {viewMode === 'activos' && !isLoading && allHabits && allHabits.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-gray-50 rounded-2xl p-6 flex items-center justify-between border border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Éxito de hoy</p>
                <p className="text-3xl font-semibold text-gray-900">{stats.percent}%</p>
              </div>
              <div className="w-24 h-24 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[{ value: stats.percent, color: '#111111' }, { value: 100 - stats.percent, color: '#E5E7EB' }]}
                      cx="50%" cy="50%" innerRadius={30} outerRadius={40}
                      dataKey="value" stroke="none" startAngle={90} endAngle={-270}
                    >
                      {[{ color: '#111111' }, { color: '#E5E7EB' }].map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 h-[144px] flex flex-col">
              <p className="text-sm font-medium text-gray-500 mb-2">Últimos 7 días</p>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.weeklyData}>
                    <RechartsTooltip 
                      cursor={{ fill: 'transparent' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return <div className="bg-black text-white text-xs py-1 px-2 rounded-lg shadow-xl">{data.fullDate}: {data.completados}/{data.total}</div>;
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="completados" fill="#111111" radius={[4, 4, 4, 4]} maxBarSize={30} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#A3A3A3' }} dy={5} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* SELECTOR DE FECHA (Solo en vista Activos) */}
        {viewMode === 'activos' && (
          <div className="flex items-center justify-between bg-white border border-gray-100 rounded-full p-1 mb-6 shadow-sm">
            <button onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>
            <span className="text-sm font-semibold text-gray-900">
              {isToday(selectedDate) ? 'Hoy' : format(selectedDate, "d 'de' MMMM", { locale: es })}
            </span>
            <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} disabled={isToday(selectedDate)} className={`p-2 rounded-full transition-colors ${isToday(selectedDate) ? 'opacity-30' : 'hover:bg-gray-50'}`}>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        )}

        {/* LISTA DE HÁBITOS */}
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : visibleHabits.length === 0 ? (
          <div className="py-12 text-center"><p className="text-[#A3A3A3]">No hay hábitos aquí.</p></div>
        ) : (
          <div className="space-y-2">
            {visibleHabits.map((habit) => {
              const todayLog = habit.logs?.find((l: any) => l.fecha === dateStr);
              const isCompleted = todayLog ? todayLog.valor >= (habit.tipoMeta === 'boolean' ? 1 : habit.metaNumero) : false;

              // Progreso Semanal/Mensual
              let progressText = "";
              if (habit.frecuenciaTipo === 'semanal') {
                const start = format(startOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                const end = format(endOfWeek(selectedDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
                const logsThisWeek = habit.logs?.filter((l:any) => l.fecha >= start && l.fecha <= end).length || 0;
                progressText = `Llevas ${logsThisWeek} de ${habit.frecuenciaValor[0]} esta semana`;
              } else if (habit.frecuenciaTipo === 'mensual') {
                const start = format(startOfMonth(selectedDate), 'yyyy-MM-dd');
                const end = format(endOfMonth(selectedDate), 'yyyy-MM-dd');
                const logsThisMonth = habit.logs?.filter((l:any) => l.fecha >= start && l.fecha <= end).length || 0;
                progressText = `Llevas ${logsThisMonth} de ${habit.frecuenciaValor[0]} este mes`;
              }

              return (
                <motion.div layout key={habit.id} className={`flex items-center gap-3 py-3 px-3 rounded-2xl transition-colors border ${habit.estado === 'pausado' ? 'bg-gray-50 border-transparent opacity-60' : 'bg-white border-gray-100 hover:shadow-md'}`}>

                  {/* Control Izquierdo (Checkbox o Números) */}
                  {habit.tipoMeta === 'boolean' ? (
                    <Checkbox completada={isCompleted} onToggle={() => handleUpdateValue(habit.id, isCompleted ? 0 : 1)} />
                  ) : (
                    <NumericHabitControl value={todayLog?.valor || 0} target={habit.metaNumero} unit={habit.unidad} onChange={(val) => handleUpdateValue(habit.id, val)} />
                  )}

                  {/* Cuerpo (Abre Modal) */}
                  <div className="flex-1 min-w-0 cursor-pointer pl-2" onClick={() => openModal(habit)}>
                    <div className="flex items-center gap-2">
                      <p className={`text-[15px] leading-tight truncate ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-900 font-medium'}`}>
                        {habit.nombre}
                      </p>
                      {habit.currentStreak > 2 && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5">🔥 {habit.currentStreak}</span>}
                    </div>
                    {(habit.descripcion || progressText) && (
                      <p className="text-xs text-gray-400 mt-1 truncate">
                        {progressText || habit.descripcion}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL DE EDICIÓN AVANZADA */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white rounded-3xl p-0 sm:max-w-lg border-0 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center sticky top-0 z-10">
            <DialogTitle className="text-xl font-semibold">{editingId ? 'Editar Hábito' : 'Nuevo Hábito'}</DialogTitle>
            {editingId && (
              <button onClick={handleDelete} className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="p-6 overflow-y-auto no-scrollbar space-y-6">
            <form id="habit-form" onSubmit={handleSaveHabit} className="space-y-6">

              {/* Nombre y Descripción */}
              <div className="space-y-3">
                <input type="text" required value={fNombre} onChange={e => setFNombre(e.target.value)} placeholder="Nombre del hábito (ej. Leer, Beber agua)" className="w-full text-lg font-medium bg-transparent border-b border-gray-200 px-0 py-2 focus:ring-0 focus:border-black placeholder:text-gray-300" />
                <input type="text" value={fDescripcion} onChange={e => setFDescripcion(e.target.value)} placeholder="Descripción o motivación (opcional)" className="w-full text-sm bg-transparent border-b border-gray-200 px-0 py-2 focus:ring-0 focus:border-black placeholder:text-gray-300" />
              </div>

              {/* Tipo de Meta */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2"><Target className="w-4 h-4 text-gray-400"/> Meta diaria</div>
                <div className="flex bg-gray-200/50 p-1 rounded-xl">
                  <button type="button" onClick={() => setFTipoMeta('boolean')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${fTipoMeta === 'boolean' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}>Sí / No</button>
                  <button type="button" onClick={() => setFTipoMeta('numeric')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${fTipoMeta === 'numeric' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}>Numérica</button>
                </div>
                {fTipoMeta === 'numeric' && (
                  <div className="flex gap-2 pt-2">
                    <input type="number" min="1" required value={fMetaNumero} onChange={e => setFMetaNumero(parseInt(e.target.value))} placeholder="Cantidad" className="w-24 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-black" />
                    <input type="text" value={fUnidad} onChange={e => setFUnidad(e.target.value)} placeholder="Unidad (ej. vasos, min)" className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-black" />
                  </div>
                )}
              </div>

              {/* Frecuencia */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2"><Activity className="w-4 h-4 text-gray-400"/> Frecuencia</div>
                <Select value={fFrecuenciaTipo} onValueChange={setFFrecuenciaTipo}>
                  <SelectTrigger className="w-full bg-white border border-gray-200 rounded-xl h-11 text-sm focus:ring-1 focus:ring-black">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="diario">Todos los días</SelectItem>
                    <SelectItem value="dias_especificos">Días específicos</SelectItem>
                    <SelectItem value="semanal">Veces por semana</SelectItem>
                    <SelectItem value="mensual">Veces por mes</SelectItem>
                  </SelectContent>
                </Select>

                {fFrecuenciaTipo === 'dias_especificos' && (
                  <div className="flex justify-between gap-1 pt-2">
                    {['L','M','X','J','V','S','D'].map((day, i) => {
                      const dayIndex = i === 6 ? 0 : i + 1; // 0=Dom, 1=Lun
                      const isSelected = fFrecuenciaValor.includes(dayIndex);
                      return (
                        <button key={day} type="button" onClick={() => {
                          if (isSelected) setFFrecuenciaValor(fFrecuenciaValor.filter(d => d !== dayIndex));
                          else setFFrecuenciaValor([...fFrecuenciaValor, dayIndex]);
                        }} className={`w-10 h-10 rounded-full text-xs font-semibold transition-colors ${isSelected ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-400'}`}>
                          {day}
                        </button>
                      );
                    })}
                  </div>
                )}

                {(fFrecuenciaTipo === 'semanal' || fFrecuenciaTipo === 'mensual') && (
                  <div className="flex items-center gap-3 pt-2">
                    <span className="text-sm text-gray-600">Objetivo:</span>
                    <input type="number" min="1" max={fFrecuenciaTipo === 'semanal' ? 7 : 31} value={fFrecuenciaValor[0] || 1} onChange={e => setFFrecuenciaValor([parseInt(e.target.value)])} className="w-20 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:ring-1 focus:ring-black" />
                    <span className="text-sm text-gray-600">veces</span>
                  </div>
                )}
              </div>

              {/* Fechas y Recordatorio */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3"><CalendarIcon className="w-4 h-4 text-gray-400"/> Inicio</div>
                  <input type="date" required value={fFechaInicio} onChange={e => setFFechaInicio(e.target.value)} className="w-full bg-transparent border-0 p-0 text-sm text-gray-600 focus:ring-0" />
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3"><Clock className="w-4 h-4 text-gray-400"/> Aviso</div>
                  <input type="time" value={fRecordatorioHora} onChange={e => setFRecordatorioHora(e.target.value)} className="w-full bg-transparent border-0 p-0 text-sm text-gray-600 focus:ring-0" />
                </div>
              </div>

              {/* Estado (Solo si edita) */}
              {editingId && (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">Estado del hábito</span>
                  <Select value={fEstado} onValueChange={setFEstado}>
                    <SelectTrigger className="w-32 bg-white border border-gray-200 rounded-xl h-9 text-sm focus:ring-1 focus:ring-black">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="activo">Activo</SelectItem>
                      <SelectItem value="pausado">Pausado</SelectItem>
                      <SelectItem value="archivado">Archivado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

            </form>
          </div>

          <div className="p-6 border-t border-gray-100 bg-white sticky bottom-0 z-10">
            <button type="submit" form="habit-form" className="w-full bg-black text-white rounded-xl py-4 font-semibold text-lg hover:bg-gray-800 transition-colors shadow-md">
              Guardar hábito
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <BottomTabBar />
    </div>
  );
}