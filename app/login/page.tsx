'use client';

export const runtime = 'edge';

import { useState } from 'react';
import { Cloud, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { api } from '@/lib/api';
import { saveAuth } from '@/lib/auth';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { token, user } = await api.auth.login(email, password);
      saveAuth(token, user);
      // Full navigation so the middleware re-evaluates the new cookie
      // and the AuthProvider hydrates the saved user from sessionStorage.
      window.location.href = '/';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-indigo-600 mb-4">
            <Cloud className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white tracking-tight">LocalCloud</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 shadow-xl space-y-5"
        >
          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="
                  w-full pl-10 pr-4 py-2.5 rounded-lg
                  bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700
                  text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 text-sm
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  transition
                "
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="
                  w-full pl-10 pr-10 py-2.5 rounded-lg
                  bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700
                  text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 text-sm
                  focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                  transition
                "
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="
              w-full flex items-center justify-center gap-2
              py-2.5 rounded-lg font-medium text-sm
              bg-indigo-600 hover:bg-indigo-500 text-white
              disabled:opacity-60 disabled:cursor-not-allowed
              transition-colors mt-2
            "
          >
            {loading ? <LoadingSpinner size="sm" /> : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
