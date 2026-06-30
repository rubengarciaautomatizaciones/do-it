import React, { useState, useMemo, useEffect } from 'react';
import { useGetHabits, useCreateHabit, useUpdateHabit, useDeleteHabit, useLogHabit, useUnlogHabit, getGetHabitsQueryKey } from '@workspace/api-client-react';
import { BottomTabBar } from '../components/BottomTabBar';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { format, subDays, addDays, isToday, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { es, enUS } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Loader2, Settings, Trash2, Calendar as CalendarIcon, Target, Clock, Activity, Zap } from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Checkbox } from '../components/TaskItem';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from '../hooks/use-toast';
import { useTranslation } from '../contexts/I18nContext';

function NumericHabitControl({ value, target, onChange }: { value: number, target: number, onChange: (val: number) => void }) {
  const [localVal, setLocalVal] = useState(value.toString());
  useEffect(() => { setLocalVal(value.toString()); }, [value]);
  const handleBlur = () => { let num = parseInt(localVal); if (isNaN(num) || num < 0) num = 0; setLocalVal(num.toString()); if (num !== value) onChange(num); };
  const adjust = (amount: number) => { let num = parseInt(localVal); if (isNaN(num)) num = 0; const newVal = Math.max(0, num + amount); setLocalVal(newVal.toString()); onChange(newVal); };
  return (
    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
      <button onClick={() => adjust(-1)} className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 text-gray-500 hover:text-black rounded-md transition-colors font-medium text-lg shadow-sm">-</button>
      <div className="flex items-center justify-center bg-white border border-gray-200 rounded-md h-7 px-2 shadow-sm min-w-[3.5rem]">
        <input type="text" inputMode="numeric" pattern="[0-9]*" value={localVal} onChange={(e) => setLocalVal(e.target.value)} onBlur={handleBlur} className="w-5 text-center bg-transparent border-none p-0 text-sm font-semibold focus:ring-0" />
        <span className="text-sm font-semibold text-gray-400">/{target}</span>
      </div>
      <button onClick={() => adjust(1)} className="w-7 h-7 flex items-center justify-center bg-white border border-gray-200 text-gray-500 hover:text-black rounded-md transition-colors font-medium text-lg shadow-sm">+</button>
    </div>
  );
}

function DeleteConfirmButton({ onDelete, t }: { onDelete: (e: React.MouseEvent) => void, t: any }) {
  const [isConfirming, setIsConfirming] = useState(false);
  useEffect(() => { let timer: NodeJS.Timeout; if (isConfirming) timer = setTimeout(() => setIsConfirming(false), 2000); return () => clearTimeout(timer); }, [isConfirming]);
  return (
    <div className="relative flex items-center justify-end h-8 min-w-[70px]" onClick={e => e.stopPropagation()}>
      <AnimatePresence mode="wait">
        {!isConfirming ? (
          <motion.button key="trash" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); setIsConfirming(true); }} className="text-gray-400 hover:text-black p-2 rounded-lg transition-colors"><Trash2 className="w-5 h-5" /></motion.button>
        ) : (
          <motion.button key="confirm" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(e); setIsConfirming(false); }} className="bg-black text-white text-xs font-medium px-3 py-1.5 rounded-lg flex items-center shadow-sm">{t('profile.deleteAccount').split(' ')[0]}</motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Habits() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, lang } = useTranslation();
  const dateLocale = lang === 'es' ? es : enUS;
  const { data: allHabits, isLoading } = useGetHabits();
  const createHabit = useCreateHabit();
  const updateHabit = useUpdateHabit();
  const deleteHabit = useDeleteHabit();
  const logHabit = useLogHabit();
  const unlogHabit = useUnlogHabit();
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [chartHabitFilter, setChartHabitFilter] = useState<string>('all');
  const [chartTimeFilter, setChartTimeFilter] = useState<number>(7);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [fNombre, setFNombre] = useState('');
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
      setEditingId(habit.id); setFNombre(habit.nombre); setFTipoMeta(habit.tipoMeta); setFMetaNumero(habit.metaNumero); setFUnidad(habit.unidad || ''); setFFrecuenciaTipo(habit.frecuenciaTipo); setFFrecuenciaValor(habit.frecuenciaValor); setFRecordatorioHora(habit.recordatorioHora || ''); setFFechaInicio(habit.fechaInicio); setFFechaFin(habit.fechaFin || ''); setFEstado(habit.estado);
    } else {
      setEditingId(null); setFNombre(''); setFTipoMeta('boolean'); setFMetaNumero(1); setFUnidad(''); setFFrecuenciaTipo('diario'); setFFrecuenciaValor([0,1,2,3,4,5,6]); setFRecordatorioHora(''); setFFechaInicio(format(new Date(), 'yyyy-MM-dd')); setFFechaFin(''); setFEstado('activo');
    }
    setIsModalOpen(true);
  };

  const handleSaveHabit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fNombre.trim() || !user) return;
    const payload = { nombre: fNombre.trim(), tipoMeta: fTipoMeta, metaNumero: fMetaNumero, unidad: fUnidad.trim() || undefined, frecuenciaTipo: fFrecuenciaTipo, frecuenciaValor: fFrecuenciaValor, recordatorioHora: fRecordatorioHora || undefined, fechaInicio: fFechaInicio, fechaFin: fFechaFin || undefined, estado: editingId ? fEstado : 'activo' };
    if (editingId) {
      updateHabit.mutate({ id: editingId, data: payload }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() }); setIsModalOpen(false); } });
    } else {
      createHabit.mutate({ data: { ...payload, userId: user.id } as any }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() }); setIsModalOpen(false); }, onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }) });
    }
  };

  const handleDelete = () => {
    if (!editingId) return;
    deleteHabit.mutate({ id: editingId }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() }); setIsModalOpen(false); } });
  };

  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayOfWeek = selectedDate.getDay();

  const visibleHabits = useMemo(() => {
    if (!allHabits) return [];
    return allHabits.filter(h => {
      if (h.estado !== 'activo') return false;
      if (h.fechaInicio > dateStr) return false;
      if (h.fechaFin && h.fechaFin < dateStr) return false;
      if (h.frecuenciaTipo === 'dias_especificos' && !h.frecuenciaValor.includes(dayOfWeek)) return false;
      return true;
    });
  }, [allHabits, dateStr, dayOfWeek]);

  const groupedSettingsHabits = useMemo(() => {
    if (!allHabits) return { activos: [], pausados: [], archivados: [] };
    return { activos: allHabits.filter(h => h.estado === 'activo'), pausados: allHabits.filter(h => h.estado === 'pausado'), archivados: allHabits.filter(h => h.estado === 'archivado') };
  }, [allHabits]);

  const todayStats = useMemo(() => {
    if (!allHabits) return { completed: 0, total: 0, percent: 0 };
    let total = 0; let completed = 0; let totalPercentSum = 0;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayDay = new Date().getDay();
    allHabits.forEach(h => {
      if (h.estado !== 'activo' || h.fechaInicio > todayStr || (h.fechaFin && h.fechaFin < todayStr)) return;
      if (h.frecuenciaTipo === 'dias_especificos' && !h.frecuenciaValor.includes(todayDay)) return;
      total++;
      const log = h.logs?.find((l: any) => l.fecha === todayStr);
      const val = log ? log.valor : 0;
      if (val >= (h.tipoMeta === 'boolean' ? 1 : h.metaNumero)) completed++;
      if (h.tipoMeta === 'boolean') totalPercentSum += val > 0 ? 100 : 0;
      else totalPercentSum += Math.min(100, (val / h.metaNumero) * 100);
    });
    return { completed, total, percent: total === 0 ? 0 : Math.round(totalPercentSum / total) };
  }, [allHabits]);

  const lineChartData = useMemo(() => {
    if (!allHabits) return [];
    const data = [];
    for (let i = chartTimeFilter - 1; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dStr = format(d, 'yyyy-MM-dd');
      let val = 0;
      if (chartHabitFilter === 'all') {
        allHabits.forEach(h => {
          if (h.estado !== 'activo' || h.fechaInicio > dStr || (h.fechaFin && h.fechaFin < dStr)) return;
          if (h.frecuenciaTipo === 'dias_especificos' && !h.frecuenciaValor.includes(d.getDay())) return;
          const log = h.logs?.find((l: any) => l.fecha === dStr);
          if (log && log.valor >= (h.tipoMeta === 'boolean' ? 1 : h.metaNumero)) val++;
        });
      } else {
        const h = allHabits.find(h => h.id === chartHabitFilter);
        if (h) { const log = h.logs?.find((l: any) => l.fecha === dStr); val = log ? log.valor : 0; }
      }
      data.push({ name: format(d, chartTimeFilter > 7 ? 'd MMM' : 'EEEEEE', { locale: dateLocale }).toUpperCase(), valor: val, fullDate: format(d, "d 'de' MMMM", { locale: dateLocale }) });
    }
    return data;
  }, [allHabits, chartTimeFilter, chartHabitFilter, dateLocale]);

  const handleUpdateValue = (habitId: string, newValue: number) => {
    if (newValue <= 0) unlogHabit.mutate({ id: habitId, date: dateStr } as any, { onSettled: () => queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() }) });
    else logHabit.mutate({ id: habitId, date: dateStr, data: { valor: newValue } } as any, { onSettled: () => queryClient.invalidateQueries({ queryKey: getGetHabitsQueryKey() }) });
  };

  return (
    <div className="h-[100dvh] flex flex-col bg-white overflow-hidden">
      <div className="flex-shrink-0 px-6 pt-12 pb-4 max-w-2xl mx-auto w-full bg-white z-20">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-[#111111]">{t('habits.title')}</h1>
          <div className="flex items-center gap-2">
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-gray-50 text-gray-900 rounded-full hover:bg-gray-100 transition-colors"><Settings className="w-5 h-5" /></button>
            <button onClick={() => openModal()} className="p-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors shadow-sm"><Plus className="w-5 h-5" /></button>
          </div>
        </div>

        {!isLoading && allHabits && allHabits.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-2xl p-6 flex items-center justify-between border border-gray-100">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">{t('habits.today')}</p>
                <p className="text-3xl font-semibold text-gray-900">{todayStats.completed}<span className="text-lg text-gray-400">/{todayStats.total}</span></p>
              </div>
              <div className="w-24 h-24 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={[{ value: todayStats.percent, color: '#111111' }, { value: 100 - todayStats.percent, color: '#E5E7EB' }]} cx="50%" cy="50%" innerRadius={30} outerRadius={40} dataKey="value" stroke="none" startAngle={90} endAngle={-270}>{[{ color: '#111111' }, { color: '#E5E7EB' }].map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}</Pie></PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex items-center justify-center"><span className="text-sm font-semibold text-gray-900">{todayStats.percent}%</span></div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 h-[144px] flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <Select value={chartHabitFilter} onValueChange={setChartHabitFilter}>
                  <SelectTrigger className="h-6 text-xs bg-transparent border-0 p-0 shadow-none focus:ring-0 font-medium text-gray-600 w-auto"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="all">{t('habits.all')}</SelectItem>
                    {allHabits.map(h => <SelectItem key={h.id} value={h.id}>{h.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={chartTimeFilter.toString()} onValueChange={(v) => setChartTimeFilter(parseInt(v))}>
                  <SelectTrigger className="h-6 text-xs bg-transparent border-0 p-0 shadow-none focus:ring-0 font-medium text-gray-400 w-auto"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="7">{t('habits.days.7')}</SelectItem>
                    <SelectItem value="30">{t('habits.days.30')}</SelectItem>
                    <SelectItem value="90">{t('habits.days.90')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData}>
                    <RechartsTooltip cursor={{ stroke: '#E5E7EB', strokeWidth: 1, strokeDasharray: '4 4' }} content={({ active, payload }) => { if (active && payload && payload.length) { const data = payload[0].payload; return <div className="bg-black text-white text-xs py-1 px-2 rounded-lg shadow-xl">{data.fullDate}: {data.valor}</div>; } return null; }} />
                    <Line type="monotone" dataKey="valor" stroke="#111111" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#111111', stroke: '#fff', strokeWidth: 2 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between bg-white border border-gray-100 rounded-full p-1 shadow-sm">
          <button onClick={() => setSelectedDate(subDays(selectedDate, 1))} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><ChevronLeft className="w-5 h-5 text-gray-500" /></button>
          <span className="text-sm font-semibold text-gray-900">{isToday(selectedDate) ? t('habits.today') : format(selectedDate, "d 'de' MMMM", { locale: dateLocale })}</span>
          <button onClick={() => setSelectedDate(addDays(selectedDate, 1))} disabled={isToday(selectedDate)} className={`p-2 rounded-full transition-colors ${isToday(selectedDate) ? 'opacity-30' : 'hover:bg-gray-50'}`}><ChevronRight className="w-5 h-5 text-gray-500" /></button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar px-6 pb-32 max-w-2xl mx-auto w-full">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
        ) : visibleHabits.length === 0 ? (
          <div className="py-12 text-center"><p className="text-[#A3A3A3]">{t('habits.empty')}</p></div>
        ) : (
          <div className="space-y-2 pt-2">
            {visibleHabits.map((habit) => {
              const todayLog = habit.logs?.find((l: any) => l.fecha === dateStr);
              const isCompleted = todayLog ? todayLog.valor >= (habit.tipoMeta === 'boolean' ? 1 : habit.metaNumero) : false;
              return (
                <motion.div layout key={habit.id} className={`flex items-center gap-3 py-3 px-4 rounded-2xl transition-colors border ${habit.estado === 'pausado' ? 'bg-gray-50 border-transparent opacity-60' : 'bg-white border-gray-100 shadow-sm hover:shadow-md'}`}>
                  {habit.tipoMeta === 'boolean' ? <Checkbox completada={isCompleted} onToggle={() => handleUpdateValue(habit.id, isCompleted ? 0 : 1)} /> : <NumericHabitControl value={todayLog?.valor || 0} target={habit.metaNumero} onChange={(val) => handleUpdateValue(habit.id, val)} />}
                  <div className="flex-1 min-w-0 cursor-pointer flex items-center gap-2 pl-1" onClick={() => openModal(habit)}>
                    {habit.tipoMeta === 'numeric' && habit.unidad && <span className={`text-[15px] ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-500'}`}>{habit.unidad}</span>}
                    <p className={`text-[15px] leading-tight truncate ${isCompleted ? 'text-gray-400 line-through' : 'text-gray-900 font-medium'}`}>{habit.nombre}</p>
                    {habit.currentStreak > 2 && <span className="text-xs bg-gray-100 text-black px-1.5 py-0.5 rounded-md font-bold flex items-center gap-0.5"><Zap className="w-3 h-3 fill-current" /> {habit.currentStreak}</span>}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl p-0 w-full h-[90vh] sm:h-[80vh] sm:max-w-md border-0 shadow-2xl overflow-hidden flex flex-col mt-auto sm:mt-0 [&>button]:hidden">
          <div className="p-6 border-b border-gray-100/50 flex justify-between items-center sticky top-0 z-10">
            <DialogTitle className="text-xl font-semibold">{t('habits.settings')}</DialogTitle>
            <button onClick={() => setIsSettingsOpen(false)} className="text-sm font-medium text-gray-500 hover:text-black">{t('habits.close')}</button>
          </div>
          <div className="p-6 overflow-y-auto no-scrollbar space-y-8">
            {groupedSettingsHabits.activos.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">{t('habits.active')}</h3>
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  {groupedSettingsHabits.activos.map(h => <div key={h.id} onClick={() => openModal(h)} className="p-4 border-b border-gray-50 last:border-0 flex justify-between items-center cursor-pointer hover:bg-gray-50"><span className="text-sm font-medium text-gray-900">{h.nombre}</span><ChevronRight className="w-4 h-4 text-gray-300" /></div>)}
                </div>
              </div>
            )}
            {groupedSettingsHabits.pausados.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">{t('habits.paused')}</h3>
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  {groupedSettingsHabits.pausados.map(h => <div key={h.id} onClick={() => openModal(h)} className="p-4 border-b border-gray-50 last:border-0 flex justify-between items-center cursor-pointer hover:bg-gray-50"><span className="text-sm font-medium text-gray-600">{h.nombre}</span><ChevronRight className="w-4 h-4 text-gray-300" /></div>)}
                </div>
              </div>
            )}
            {groupedSettingsHabits.archivados.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 px-2">{t('habits.archived')}</h3>
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                  {groupedSettingsHabits.archivados.map(h => <div key={h.id} onClick={() => openModal(h)} className="p-4 border-b border-gray-50 last:border-0 flex justify-between items-center cursor-pointer hover:bg-gray-50"><span className="text-sm font-medium text-gray-400 line-through">{h.nombre}</span><ChevronRight className="w-4 h-4 text-gray-300" /></div>)}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white rounded-3xl p-0 sm:max-w-lg border-0 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col [&>button]:hidden">
          <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center sticky top-0 z-10">
            <button onClick={() => setIsModalOpen(false)} className="text-sm font-medium text-gray-500 hover:text-black">{t('habits.cancel')}</button>
            <DialogTitle className="text-xl font-semibold">{editingId ? t('habits.edit') : t('habits.new')}</DialogTitle>
            {editingId ? <DeleteConfirmButton onDelete={handleDelete} t={t} /> : <div className="w-10" />}
          </div>
          <div className="p-6 overflow-y-auto no-scrollbar space-y-6">
            <form id="habit-form" onSubmit={handleSaveHabit} className="space-y-6">
              <div><input type="text" required value={fNombre} onChange={e => setFNombre(e.target.value)} placeholder={t('habits.name')} className="w-full text-lg font-medium bg-transparent border-0 border-b-2 border-gray-100 px-0 py-2 focus:ring-0 focus:border-gray-300 transition-colors placeholder:text-gray-300" /></div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2"><Target className="w-4 h-4 text-gray-400"/> {t('habits.goal')}</div>
                <div className="flex bg-gray-200/50 p-1 rounded-xl">
                  <button type="button" onClick={() => setFTipoMeta('boolean')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${fTipoMeta === 'boolean' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}>{t('habits.bool')}</button>
                  <button type="button" onClick={() => setFTipoMeta('numeric')} className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${fTipoMeta === 'numeric' ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}>{t('habits.num')}</button>
                </div>
                {fTipoMeta === 'numeric' && (
                  <div className="flex gap-2 pt-2">
                    <input type="number" min="1" required value={fMetaNumero} onChange={e => setFMetaNumero(parseInt(e.target.value))} placeholder={t('habits.qty')} className="w-24 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-black" />
                    <input type="text" value={fUnidad} onChange={e => setFUnidad(e.target.value)} placeholder={t('habits.unit')} className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-1 focus:ring-black" />
                  </div>
                )}
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-2"><Activity className="w-4 h-4 text-gray-400"/> {t('habits.freq')}</div>
                <Select value={fFrecuenciaTipo} onValueChange={setFFrecuenciaTipo}>
                  <SelectTrigger className="w-full bg-white border border-gray-200 rounded-xl h-11 text-sm focus:ring-1 focus:ring-black"><SelectValue /></SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="diario">{t('habits.everyday')}</SelectItem>
                    <SelectItem value="dias_especificos">{t('habits.specific')}</SelectItem>
                    <SelectItem value="semanal">{t('habits.weekly')}</SelectItem>
                    <SelectItem value="mensual">{t('habits.monthly')}</SelectItem>
                  </SelectContent>
                </Select>
                {fFrecuenciaTipo === 'dias_especificos' && (
                  <div className="flex justify-between gap-1 pt-2">
                    {['L','M','X','J','V','S','D'].map((day, i) => {
                      const dayIndex = i === 6 ? 0 : i + 1;
                      const isSelected = fFrecuenciaValor.includes(dayIndex);
                      return <button key={day} type="button" onClick={() => { if (isSelected) setFFrecuenciaValor(fFrecuenciaValor.filter(d => d !== dayIndex)); else setFFrecuenciaValor([...fFrecuenciaValor, dayIndex]); }} className={`w-10 h-10 rounded-full text-xs font-semibold transition-colors ${isSelected ? 'bg-black text-white' : 'bg-white border border-gray-200 text-gray-400'}`}>{day}</button>;
                    })}
                  </div>
                )}
                {(fFrecuenciaTipo === 'semanal' || fFrecuenciaTipo === 'mensual') && (
                  <div className="flex items-center gap-3 pt-2">
                    <span className="text-sm text-gray-600">{t('habits.target')}</span>
                    <input type="number" min="1" max={fFrecuenciaTipo === 'semanal' ? 7 : 31} value={fFrecuenciaValor[0] || 1} onChange={e => setFFrecuenciaValor([parseInt(e.target.value)])} className="w-20 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-center focus:ring-1 focus:ring-black" />
                    <span className="text-sm text-gray-600">{t('habits.times')}</span>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3"><CalendarIcon className="w-4 h-4 text-gray-400"/> {t('habits.start')}</div>
                  <input type="date" required value={fFechaInicio} onChange={e => setFFechaInicio(e.target.value)} className="w-full bg-transparent border-0 p-0 text-sm text-gray-600 focus:ring-0" />
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-900 mb-3"><Clock className="w-4 h-4 text-gray-400"/> {t('habits.alert')}</div>
                  <input type="time" value={fRecordatorioHora} onChange={e => setFRecordatorioHora(e.target.value)} className="w-full bg-transparent border-0 p-0 text-sm text-gray-600 focus:ring-0" />
                </div>
              </div>
              {editingId && (
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">{t('habits.status')}</span>
                  <Select value={fEstado} onValueChange={setFEstado}>
                    <SelectTrigger className="w-32 bg-white border border-gray-200 rounded-xl h-9 text-sm focus:ring-1 focus:ring-black"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="activo">{t('habits.active')}</SelectItem>
                      <SelectItem value="pausado">{t('habits.paused')}</SelectItem>
                      <SelectItem value="archivado">{t('habits.archived')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </form>
          </div>
          <div className="p-6 border-t border-gray-100 bg-white sticky bottom-0 z-10">
            <button type="submit" form="habit-form" className="w-full bg-black text-white rounded-xl py-4 font-semibold text-lg hover:bg-gray-800 transition-colors shadow-md">{t('habits.save')}</button>
          </div>
        </DialogContent>
      </Dialog>
      <BottomTabBar />
    </div>
  );
}