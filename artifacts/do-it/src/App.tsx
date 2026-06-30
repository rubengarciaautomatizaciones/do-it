      import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
      import { QueryClient } from "@tanstack/react-query";
      import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
      import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
      import { get, set, del } from 'idb-keyval';
      import { Toaster } from "@/components/ui/toaster";
      import { TooltipProvider } from "@/components/ui/tooltip";
      import { AuthProvider, useAuth } from "./contexts/AuthContext";
      import { I18nProvider } from "./contexts/I18nContext";
      import NotFound from "@/pages/not-found";
      import { useEffect } from "react";

      // Pages
      import Landing from "./pages/Landing";
      import Login from "./pages/Login";
      import Tasks from "./pages/Tasks";
      import Habits from "./pages/Habits";
      import Calendar from "./pages/Calendar";
      import Profile from "./pages/Profile";

      // Configuración de React Query para Modo Offline
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            gcTime: 1000 * 60 * 60 * 24 * 7, // Guarda la caché offline durante 7 días
            staleTime: 0, // <-- CAMBIO: 0 significa que siempre buscará cambios en 2º plano al abrir la app
            refetchOnWindowFocus: true, // <-- CAMBIO: Refresca los datos al cambiar de pestaña o abrir la app
          },
        },
      });

      const asyncStoragePersister = createAsyncStoragePersister({
        storage: {
          getItem: async (key) => await get(key),
          setItem: async (key, value) => await set(key, value),
          removeItem: async (key) => await del(key),
        },
      });

      function ProtectedRoute({ component: Component, ...rest }: { component: any, [key: string]: any }) {
        const { session, loading } = useAuth();
        const [, setLocation] = useLocation();

        useEffect(() => {
          if (!loading && !session) {
            setLocation("/login");
          }
        }, [session, loading, setLocation]);

        if (loading) return <div className="min-h-screen bg-white flex items-center justify-center" />;
        return session ? <Component {...rest} /> : null;
      }

      function Router() {
        return (
          <Switch>
            <Route path="/" component={Landing} />
            <Route path="/login" component={Login} />
            <Route path="/tasks">{() => <ProtectedRoute component={Tasks} />}</Route>
            <Route path="/habits">{() => <ProtectedRoute component={Habits} />}</Route>
            <Route path="/calendar">{() => <ProtectedRoute component={Calendar} />}</Route>
            <Route path="/profile">{() => <ProtectedRoute component={Profile} />}</Route>
            <Route component={NotFound} />
          </Switch>
        );
      }

      export default function App() {
        return (
          <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister }}>
            <TooltipProvider>
              <AuthProvider>
                <I18nProvider>
                  <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                    <Router />
                  </WouterRouter>
                </I18nProvider>
              </AuthProvider>
              <Toaster />
            </TooltipProvider>
          </PersistQueryClientProvider>
        );
      }