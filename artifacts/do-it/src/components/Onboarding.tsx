import React, { useEffect, useRef } from 'react';
import { driver } from 'driver.js';
import 'driver.js/dist/driver.css';
import { useGetPreferences, useUpdatePreferences, getGetPreferencesQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

export function Onboarding() {
  const { data: prefs, isLoading } = useGetPreferences();
  const updatePrefs = useUpdatePreferences();
  const queryClient = useQueryClient();
  const hasRun = useRef(false);

  useEffect(() => {
    if (isLoading || !prefs || hasRun.current) return;

    if (!prefs.hasSeenTutorial) {
      hasRun.current = true;

      const driverObj = driver({
        showProgress: true,
        allowClose: false,
        nextBtnText: 'Siguiente &rarr;',
        prevBtnText: '&larr; Atrás',
        doneBtnText: '¡Entendido!',
        popoverClass: 'driverjs-theme',
        onDestroyStarted: () => {
          // Guardar en BD que ya lo vio
          updatePrefs.mutate({ data: { hasSeenTutorial: true } }, {
            onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetPreferencesQueryKey() })
          });
          driverObj.destroy();
        },
        steps: [
          {
            element: '#tour-magic-input',
            popover: {
              title: 'Input Mágico ✨',
              description: 'Escribe o mantén pulsado el micrófono para crear tareas con IA. Extraeremos la fecha y la acción por ti.',
              side: 'top',
              align: 'center'
            }
          },
          {
            element: '#tour-task-list',
            popover: {
              title: 'Tus Tareas 📝',
              description: 'Toca el círculo para completar, arrastra para reordenar, o pulsa la tarea para abrirla, ver detalles y editarla.',
              side: 'bottom',
              align: 'center'
            }
          },
          {
            element: '#tour-bottom-bar',
            popover: {
              title: 'Navegación 🧭',
              description: 'Muévete entre tus tareas, hábitos, calendario y perfil desde aquí.',
              side: 'top',
              align: 'center'
            }
          }
        ]
      });

      // Pequeño delay para asegurar que el DOM está renderizado
      setTimeout(() => {
        driverObj.drive();
      }, 500);
    }
  }, [prefs, isLoading, updatePrefs, queryClient]);

  return null;
}