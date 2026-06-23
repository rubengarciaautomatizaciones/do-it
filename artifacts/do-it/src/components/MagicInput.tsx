import React, { useState, useRef } from 'react';
import { Mic, Send, Loader2 } from 'lucide-react';
import { useCreateMagicTextTask, useTranscribeAudio, getGetTasksQueryKey, getGetTaskStatsQueryKey } from '@workspace/api-client-react';
import { useAuth } from '../contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useToast } from '../hooks/use-toast';

export function MagicInput() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const queryClient = useQueryClient();
  const createTextTask = useCreateMagicTextTask();
  const transcribeAudio = useTranscribeAudio();

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !user) return;

    toast({ title: "Pensando...", description: "Generando tarea con IA" });

    createTextTask.mutate(
      { data: { text: text.trim(), userId: user.id } },
      {
        onSuccess: () => {
          setText('');
          queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetTaskStatsQueryKey() });
        },
        onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" })
      }
    );
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(',')[1];
          if (user) {
            toast({ title: "Procesando audio...", description: "Gemini está analizando tu nota de voz." });
            transcribeAudio.mutate(
              { data: { userId: user.id, audioBase64: base64data, mimeType: 'audio/webm' } },
              {
                onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() }),
                onError: (err: any) => toast({ title: "Error IA", description: err.message, variant: "destructive" })
              }
            );
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      toast({ title: "Sin micrófono", description: "Otorga permisos para usar la voz.", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const isWorking = createTextTask.isPending || transcribeAudio.isPending;

  return (
    <div className="fixed bottom-24 left-4 right-4 z-40 max-w-md mx-auto">
      <form onSubmit={handleTextSubmit} className="relative flex items-center shadow-lg rounded-full">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isWorking}
          placeholder="Escribe o usa tu voz..."
          className="w-full bg-white/90 backdrop-blur-md border border-gray-100 rounded-full py-4 pl-6 pr-14 text-base focus:ring-1 focus:ring-black placeholder:text-gray-400"
        />
        {isWorking ? (
          <div className="absolute right-4 text-gray-400">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : text ? (
          <button type="submit" className="absolute right-2 p-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors">
            <Send className="w-5 h-5" />
          </button>
        ) : (
          <button
            type="button"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
            className="absolute right-2 p-2 rounded-full focus:outline-none"
          >
            <motion.div
              animate={isRecording ? { scale: [1, 1.2, 1], backgroundColor: "#111111", color: "#FFFFFF" } : { scale: 1, backgroundColor: "transparent", color: "#A3A3A3" }}
              transition={isRecording ? { repeat: Infinity, duration: 1 } : {}}
              className="p-1 rounded-full"
            >
              <Mic strokeWidth={1.5} className="w-6 h-6" />
            </motion.div>
          </button>
        )}
      </form>
    </div>
  );
}