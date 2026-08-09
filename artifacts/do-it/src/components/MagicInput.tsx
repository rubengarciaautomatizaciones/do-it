import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, Loader2, X, Square, ArrowUp } from 'lucide-react';
import { useCreateMagicTextTask, useTranscribeAudio, useAddTaskAttachment, getGetTasksQueryKey, getGetTaskStatsQueryKey } from '@workspace/api-client-react';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../hooks/use-toast';
import { supabase } from '../lib/supabase';
import { PaywallModal } from './PaywallModal';

interface WaveBar {
  id: number;
  height: number;
  isVoice: boolean;
}

const getSupportedAudioMimeType = () => {
  if (typeof MediaRecorder === 'undefined') return undefined;
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/aac',
    'audio/ogg'
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return undefined;
};

// Determina el número exacto de barritas para que nacen JUSTO en el borde visible del móvil sin retrasos
const getResponsiveBarCount = () => {
  if (typeof window === 'undefined') return 24;
  const width = window.innerWidth;
  if (width < 400) return 20;      // Pantallas pequeñas de móvil (iPhone SE / Android pequeño)
  if (width < 640) return 24;      // Móviles normales (iPhone 13/14/15, Galaxy S)
  if (width < 768) return 36;      // Tablets
  return 48;                       // Ordenador
};

export function MagicInput() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const [barCount, setBarCount] = useState<number>(getResponsiveBarCount);
  
  // Tira adaptada al tamaño exacto de la pantalla
  const [audioBars, setAudioBars] = useState<WaveBar[]>(() => 
    Array.from({ length: getResponsiveBarCount() }, (_, i) => ({ id: i, height: 4, isVoice: false }))
  );
  const [scrollOffset, setScrollOffset] = useState<number>(0);
  const nextIdRef = useRef<number>(100);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const queryClient = useQueryClient();
  const createMagicTask = useCreateMagicTextTask(); 
  const transcribeAudio = useTranscribeAudio();
  const addAttachment = useAddTaskAttachment();

  // Actualizar barCount si se redimensiona la ventana
  useEffect(() => {
    const handleResize = () => {
      const count = getResponsiveBarCount();
      setBarCount(count);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;
    toast({ title: "Pensando...", description: "Estructurando tarea con IA." });
    createMagicTask.mutate({ data: { text: text.trim(), userId: user.id } }, {
      onSuccess: () => {
        setText('');
        queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTaskStatsQueryKey() });
      },
      onError: (err: any) => {
        if (err.status === 403 || err.message?.includes("LIMIT_REACHED")) {
          setShowPaywall(true);
        } else {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        }
      }
    });
  };

  const startRecording = async () => {
    if (isRecording || transcribeAudio.isPending) return;
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setStream(audioStream);

      const mimeType = getSupportedAudioMimeType();
      const options = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(audioStream, options);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      toast({ title: "Sin micrófono", description: "Otorga permisos para usar la voz.", variant: "destructive" });
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.onstop = null; 
      mediaRecorderRef.current.stop();
    }
    stream?.getTracks().forEach(track => track.stop());
    setIsRecording(false);
    setStream(null);
  };

  const acceptRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;
    mediaRecorderRef.current.onstop = async () => {
      const mimeType = getSupportedAudioMimeType() || 'audio/webm';
      const audioBlob = new Blob(chunksRef.current, { type: mimeType });
      stream?.getTracks().forEach(track => track.stop());
      if (!user) return;

      toast({ title: "Procesando audio...", description: "Extrayendo tarea con IA en <1s." });

      try {
        const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('aac') ? 'aac' : 'webm';
        const fileName = `voz-${Date.now()}.${ext}`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('attachments').upload(`${user.id}/${fileName}`, audioBlob);

        let publicUrl = "";
        if (!uploadError && uploadData) {
          publicUrl = supabase.storage.from('attachments').getPublicUrl(uploadData.path).data.publicUrl;
        }

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(',')[1];
          transcribeAudio.mutate({ data: { userId: user.id, audioBase64: base64data, mimeType } }, {
            onSuccess: (newTask) => {
              if (publicUrl) addAttachment.mutate({ id: newTask.id, data: { fileName: 'Nota de voz', fileUrl: publicUrl, fileType: mimeType } });
              queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
            },
            onError: (err: any) => {
              if (err.status === 403 || err.message?.includes("LIMIT_REACHED")) {
                setShowPaywall(true);
              } else {
                toast({ title: "Error", description: err.message, variant: "destructive" });
              }
            }
          });
        };
      } catch (error) {
        toast({ title: "Error", description: "Fallo al procesar el audio", variant: "destructive" });
      }
    };
    mediaRecorderRef.current.stop();
    setIsRecording(false);
    setStream(null);
  };

  // ANIMACIÓN RESPONSIVA EN TIEMPO REAL AL INSTANTE EN MÓVIL Y DESKTOP
  useEffect(() => {
    if (!isRecording || !stream) return;

    let audioCtx: AudioContext;
    let animationId: number;

    try {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }

      const analyser = audioCtx.createAnalyser();
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.6;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const stepWidth = 8;
      let currentOffset = 0;
      let lastTime = performance.now();

      const count = getResponsiveBarCount();
      setAudioBars(Array.from({ length: count }, (_, i) => ({ id: i, height: 4, isVoice: false })));
      setScrollOffset(0);

      const updateLoop = () => {
        animationId = requestAnimationFrame(updateLoop);
        const now = performance.now();
        const dt = (now - lastTime) / 1000;
        lastTime = now;

        currentOffset += 28 * dt;

        if (currentOffset >= stepWidth) {
          currentOffset %= stepWidth;

          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for (let i = 0; i < 8; i++) {
            sum += dataArray[i] || 0;
          }
          const avg = sum / 8;

          const NOISE_FLOOR = 10;
          let calculatedHeight = 4;
          let isVoice = false;

          if (avg > NOISE_FLOOR) {
            const normalized = Math.min(1, (avg - NOISE_FLOOR) / 45);
            calculatedHeight = 4 + (normalized * 24);
            isVoice = true;
          }

          const newBar: WaveBar = {
            id: nextIdRef.current++,
            height: Math.round(calculatedHeight),
            isVoice
          };

          setAudioBars((prev) => {
            const next = [...prev.slice(1)];
            next.push(newBar);
            return next;
          });
        }

        setScrollOffset(currentOffset);
      };

      updateLoop();
    } catch (err) {
      console.error("Audio analyzer error:", err);
    }

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      if (audioCtx) audioCtx.close();
    };
  }, [isRecording, stream]);

  const isWorking = createMagicTask.isPending || transcribeAudio.isPending;

  return (
    <div id="tour-magic-input" className="fixed bottom-24 left-4 right-4 z-40 max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {isRecording ? (
          <motion.div 
            key="recording"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="flex items-center justify-between shadow-xl rounded-full bg-white border border-gray-200/90 px-3 py-2 overflow-hidden h-14"
          >
            {/* Botón Cancelar (X) estilo ChatGPT */}
            <button 
              type="button" 
              onClick={cancelRecording} 
              className="w-9 h-9 rounded-full bg-gray-100/90 flex items-center justify-center text-gray-700 hover:bg-gray-200 transition-colors flex-shrink-0 z-20"
              title="Cancelar"
            >
              <X className="w-4 h-4" />
            </button>

            {/* CONTENEDOR CON DESPLAZAMIENTO LÍQUIDO CONTINUO A 60 FPS Y CAPAS DE DEGRADADO */}
            <div className="flex-1 px-1 flex items-center justify-center h-8 overflow-hidden relative">
              {/* Capa desvanecimiento izquierda */}
              <div className="absolute left-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-r from-white via-white/80 to-transparent z-10 pointer-events-none" />

              {/* Tira adaptada al ancho exacto del dispositivo para respuesta instantánea */}
              <div 
                className="flex items-center justify-center gap-[4px] h-8 will-change-transform"
                style={{ transform: `translate3d(-${scrollOffset}px, 0, 0)` }}
              >
                {audioBars.map((bar) => (
                  <div
                    key={bar.id}
                    style={{ height: `${bar.height}px` }}
                    className={`w-[4px] rounded-full flex-shrink-0 ${
                      bar.isVoice ? 'bg-gray-700' : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              {/* Capa desvanecimiento derecha */}
              <div className="absolute right-0 top-0 bottom-0 w-8 sm:w-12 bg-gradient-to-l from-white via-white/80 to-transparent z-10 pointer-events-none" />
            </div>

            {/* Botonera de Acción estilo ChatGPT */}
            <div className="flex items-center gap-2 flex-shrink-0 z-20">
              {/* Botón Detener (Cuadrado) */}
              <button 
                type="button" 
                onClick={cancelRecording}
                className="w-9 h-9 rounded-full border border-gray-200/90 bg-white flex items-center justify-center text-black hover:bg-gray-100 transition-colors shadow-2xs"
                title="Detener"
              >
                <Square className="w-3.5 h-3.5 fill-current text-black" />
              </button>
              {/* Botón Enviar (Flecha Arriba) */}
              <button 
                type="button" 
                onClick={acceptRecording}
                className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800 transition-transform active:scale-95 shadow-md"
                title="Enviar"
              >
                <ArrowUp className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.form 
            key="input"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onSubmit={handleTextSubmit} 
            className="relative flex items-center shadow-xl rounded-full bg-white border border-gray-100 h-14"
          >
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isWorking}
              placeholder="Escribe o graba una tarea..."
              className="w-full bg-transparent border-0 rounded-full py-0 h-full pl-6 pr-14 text-[15px] focus:outline-none focus:ring-0 placeholder:text-gray-400"
            />
            {isWorking ? (
              <div className="absolute right-4 text-gray-400">
                <Loader2 className="w-5 h-5 animate-spin" />
              </div>
            ) : text ? (
              <button type="submit" className="absolute right-2 p-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors shadow-sm">
                <Send className="w-5 h-5" />
              </button>
            ) : (
              <button type="button" onClick={startRecording} className="absolute right-2 p-2 rounded-full text-gray-400 hover:text-black hover:bg-gray-50 transition-colors">
                <Mic strokeWidth={2} className="w-5 h-5" />
              </button>
            )}
          </motion.form>
        )}
      </AnimatePresence>

      <PaywallModal isOpen={showPaywall} onClose={() => setShowPaywall(false)} />
    </div>
  );
}