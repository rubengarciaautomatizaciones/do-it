import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

export default function Login() {
  const { signIn, user } = useAuth();
  const [, setLocation] = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [isResetMode, setIsResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Redirigir si ya está logueado
  React.useEffect(() => {
    if (user) {
      setLocation('/tasks');
    }
  }, [user, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isResetMode) {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/profile?recovery=true`,
      });
      if (error) {
        setError(error.message);
      } else {
        setResetSent(true);
      }
    } else {
      const { error: authError } = await signIn(email, password);
      if (authError) {
        setError("Credenciales incorrectas o acceso denegado.");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center px-6 py-12 bg-white">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm mx-auto"
      >
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 mb-8">
          {isResetMode ? 'Recuperar acceso' : 'Entrar'}
        </h1>

        {resetSent ? (
          <div className="bg-gray-50 p-6 rounded-2xl text-center border border-gray-100">
            <p className="text-gray-900 font-medium mb-2">Revisa tu correo</p>
            <p className="text-sm text-gray-500">
              Te hemos enviado un enlace mágico para cambiar tu contraseña.
            </p>
            <button 
              onClick={() => { setIsResetMode(false); setResetSent(false); }} 
              className="mt-6 text-sm font-medium text-black underline hover:text-gray-600 transition-colors"
            >
              Volver al login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full bg-gray-50 border-0 rounded-xl px-4 py-4 text-base focus:ring-1 focus:ring-black placeholder:text-gray-400 transition-shadow"
              />
            </div>

            {!isResetMode && (
              <div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  className="w-full bg-gray-50 border-0 rounded-xl px-4 py-4 text-base focus:ring-1 focus:ring-black placeholder:text-gray-400 transition-shadow"
                />
              </div>
            )}

            {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white rounded-xl py-4 font-medium mt-4 disabled:opacity-50 transition-opacity hover:bg-gray-800 active:scale-[0.98]"
            >
              {loading ? 'Cargando...' : (isResetMode ? 'Enviar enlace mágico' : 'Entrar')}
            </button>

            <div className="text-center mt-6">
              <button 
                type="button" 
                onClick={() => { setIsResetMode(!isResetMode); setError(null); }} 
                className="text-sm text-gray-500 hover:text-black transition-colors font-medium"
              >
                {isResetMode ? 'Volver a iniciar sesión' : '¿Olvidaste tu contraseña?'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}