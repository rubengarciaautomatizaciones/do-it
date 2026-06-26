import React from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, Check } from 'lucide-react';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PaywallModal({ isOpen, onClose }: PaywallModalProps) {
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
            Has alcanzado el límite de 3 usos gratuitos. Pásate a Premium para seguir creando tareas con tu voz.
          </DialogDescription>
        </div>

        <div className="p-8 bg-white">
          <ul className="space-y-4 mb-8">
            {['Creación de tareas por voz ilimitada', 'Extracción inteligente de fechas', 'Hábitos ilimitados', 'Estadísticas avanzadas'].map((feature, i) => (
              <li key={i} className="flex items-center gap-3 text-gray-700 font-medium">
                <div className="w-5 h-5 rounded-full bg-black/5 flex items-center justify-center flex-shrink-0">
                  <Check className="w-3 h-3 text-black" />
                </div>
                {feature}
              </li>
            ))}
          </ul>

          <button 
            onClick={() => alert("Próximamente: Integración con Stripe")}
            className="w-full bg-black text-white rounded-xl py-4 font-semibold text-lg hover:bg-gray-800 transition-colors shadow-md"
          >
            Empezar 7 días gratis
          </button>
          <p className="text-center text-xs text-gray-400 mt-4">
            Luego 4,99€/mes. Cancela cuando quieras.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}