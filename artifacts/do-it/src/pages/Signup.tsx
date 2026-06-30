import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, Link } from 'wouter';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';

export default function Signup() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => { if (user) setLocation('/tasks'); }, [user, setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } }
    });

    if (authError) setError(authError.message);
    else setLocation('/tasks'); // Si no requiere confirmación de email, entra directo

    setLoading(false);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center px-6 py-12 bg-white">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="w-full max-w-sm mx-auto">
        <h1 className="text-3xl font-semibold tracking-tight text-gray-900 mb-8">Crear cuenta</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Tu nombre" className="w-full bg-gray-50 border-0 rounded-xl px-4 py-4 text-base focus:ring-1 focus:ring-black placeholder:text-gray-400 transition-shadow" />
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full bg-gray-50 border-0 rounded-xl px-4 py-4 text-base focus:ring-1 focus:ring-black placeholder:text-gray-400 transition-shadow" />
          <input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña (mín. 6 caracteres)" className="w-full bg-gray-50 border-0 rounded-xl px-4 py-4 text-base focus:ring-1 focus:ring-black placeholder:text-gray-400 transition-shadow" />

          {error && <p className="text-sm text-black font-medium">{error}</p>}

          <button type="submit" disabled={loading} className="w-full bg-black text-white rounded-xl py-4 font-medium mt-4 disabled:opacity-50 transition-opacity hover:bg-gray-800 active:scale-[0.98]">
            {loading ? 'Creando...' : 'Registrarse'}
          </button>

          <div className="text-center mt-6">
            <Link href="/login">
              <button type="button" className="text-sm text-gray-500 hover:text-black transition-colors font-medium">¿Ya tienes cuenta? Entra aquí</button>
            </Link>
          </div>
        </form>
      </motion.div>
    </div>
  );
}