import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send, Loader2, X, Check } from 'lucide-react';
import { useCreateMagicTextTask, useTranscribeAudio, useAddTaskAttachment, getGetTasksQueryKey, getGetTaskStatsQueryKey } from '@workspace/api-client-react';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from '../hooks/use-toast';
import { supabase } from '../lib/supabase';
import { PaywallModal } from './PaywallModal';

export function MagicInput() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [showPaywall, setShowPaywall] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const queryClient = useQueryClient();
  const createMagicTask = useCreateMagicTextTask(); 
  const transcribeAudio = useTranscribeAudio();
  const addAttachment = useAddTaskAttachment();

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;
    toast({ title: "Pensando...", description: "Estructurando tarea con IA." });
    createMagicTask.mutate({ data: { text: text.trim(), userId: user.id } }, {
      onSuccess: (newTask) => {
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
      const mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm' });
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
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      stream?.getTracks().forEach(track => track.stop());
      if (!user) return;

      toast({ title: "Procesando audio...", description: "Extrayendo tarea con IA." });

      try {
        const fileName = `voz-${Date.now()}.webm`;
        const { data: uploadData, error: uploadError } = await supabase.storage.from('attachments').upload(`${user.id}/${fileName}`, audioBlob);

        let publicUrl = "";
        if (!uploadError && uploadData) {
          publicUrl = supabase.storage.from('attachments').getPublicUrl(uploadData.path).data.publicUrl;
        }

        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(',')[1];
          transcribeAudio.mutate({ data: { userId: user.id, audioBase64: base64data, mimeType: 'audio/webm' } }, {
            onSuccess: (newTask) => {
              if (publicUrl) addAttachment.mutate({ id: newTask.id, data: { fileName: 'Nota de voz', fileUrl: publicUrl, fileType: 'audio/webm' } });
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

  // ANIMACIÓN ESTILO CHATGPT
  useEffect(() => {
    if (!isRecording || !stream || !canvasRef.current) return;
    const audioCtx = new AudioContext();
    const analyser = audioCtx.createAnalyser();
    const source = audioCtx.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 64; 

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationId: number;

    const draw = () => {
      animationId = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      if(!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Tomamos 5 frecuencias bajas/medias (la voz humana)
      const values = [
        dataArray[1] || 0,
        dataArray[3] || 0,
        dataArray[5] || 0,
        dataArray[7] || 0,
        dataArray[9] || 0
      ];

      const barWidth = 6;
      const gap = 6;
      const totalWidth = (5 * barWidth) + (4 * gap);
      const startX = (canvas.width - totalWidth) / 2; // Centrado perfecto

      values.forEach((val, i) => {
        const percent = val / 255;
        const minHeight = 4;
        const height = minHeight + (percent * (canvas.height - minHeight));

        ctx.fillStyle = '#111111';
        ctx.beginPath();
        ctx.roundRect(startX + i * (barWidth + gap), (canvas.height - height) / 2, barWidth, height, 3);
        ctx.fill();
      });
    };
    draw();

    return () => {
      cancelAnimationFrame(animationId);
      audioCtx.close();
    };
  }, [isRecording, stream]);

  const isWorking = createMagicTask.isPending || transcribeAudio.isPending;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-40 max-w-2xl mx-auto">
      <AnimatePresence mode="wait">
        {isRecording ? (
          <motion.div 
            key="recording"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center shadow-xl rounded-full bg-white border border-gray-100 p-2 overflow-hidden h-14"
          >
            <canvas ref={canvasRef} width={200} height={32} className="flex-1 min-w-0 px-4" />
            <div className="flex items-center gap-1">
              <button type="button" onClick={cancelRecording} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-black transition-colors">
                <X className="w-5 h-5" />
              </button>
              <button type="button" onClick={acceptRecording} className="p-2 rounded-full bg-black text-white hover:bg-gray-800 transition-colors shadow-sm">
                <Check className="w-5 h-5" />
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