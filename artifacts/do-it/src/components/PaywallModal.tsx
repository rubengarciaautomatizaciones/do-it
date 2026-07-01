import React, { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, Check, Loader2 } from 'lucide-react';
import { useCreateCheckout } from '@workspace/api-client-react';
import { useAuth } from '../contexts/AuthContext';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PaywallModal({ isOpen, onClose }: PaywallModalProps) {
  const { user } = useAuth();
  const [isAnnual, setIsAnnual] = useState(true);
  const createCheckout = useCreateCheckout();

  const handleSubscribe = () => {
    if (!user) return;
    const priceId = isAnnual ? import.meta.env.VITE_STRIPE_PRICE_ANNUAL : import.meta.env.VITE_STRIPE_PRICE_MONTHLY;

    createCheckout.mutate({ data: { priceId, userId: user.id } }, {
      onSuccess: (res) => {
        if (res.url) window.location.href = res.url;
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-white rounded-3xl p-0 overflow-hidden border-0 shadow-2xl">
        <div className="bg-gradient-to-br from-gray-50 to-white p-8 text-center border-b border-gray-100">
          <div className="w-16 h-16 bg-black rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <DialogTitle className="text-2xl font-semibold text-gray-900 mb-2">
            Desbloquea el poder de la IA
          </DialogTitle>
          <DialogDescription className="text-gray-500 text-base">
            Pásate a Premium para seguir creando tareas con tu voz y organizar tu vida sin fricción.
          </DialogDescription>
        </div>

        <div className="p-8 bg-white">
          {/* Toggle Mensual/Anual */}
          <div className="flex items-center justify-center bg-gray-50 p-1 rounded-full mb-8 w-fit mx-auto border border-gray-100">
            <button onClick={() => setIsAnnual(false)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${!isAnnual ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}>
              Mensual
            </button>
            <button onClick={() => setIsAnnual(true)} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${isAnnual ? 'bg-white shadow-sm text-black' : 'text-gray-500'}`}>
              Anual <span className="bg-black text-white text-[10px] px-2 py-0.5 rounded-full">-40%</span>
            </button>
          </div>

          <ul className="space-y-4 mb-8">
            {['IA por voz ilimitada', 'Extracción inteligente de fechas', 'Hábitos ilimitados', 'Sincronización con Google Calendar'].map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-gray-700 font-medium">
                <div className="w-5 h-5 rounded-full bg-black/5 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-black" />
                </div>
                {feature}
              </li>
            ))}
          </ul>

          <button 
            onClick={handleSubscribe}
            disabled={createCheckout.isPending}
            className="w-full bg-black text-white rounded-xl py-4 font-semibold text-lg hover:bg-gray-800 transition-colors shadow-md flex justify-center items-center gap-2"
          >
            {createCheckout.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Empezar 7 días gratis'}
          </button>
          <p className="text-center text-xs text-gray-400 mt-4">
            Luego {isAnnual ? '49,99€/año' : '6,99€/mes'}. Cancela cuando quieras.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}