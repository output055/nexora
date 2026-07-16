'use client';

import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/auth-context';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster
        position="top-right"
        closeButton
        toastOptions={{
          classNames: {
            toast: 'group relative overflow-hidden bg-[#0D1526] border border-white/10 shadow-2xl rounded-2xl flex items-start p-4',
            title: 'text-sm font-semibold text-white ml-2',
            description: 'text-sm text-slate-400 ml-2 mt-1',
            actionButton: 'bg-white/10 hover:bg-white/20 text-white border-0 font-medium rounded-lg px-4 py-2 transition-colors',
            cancelButton: 'bg-transparent hover:bg-white/5 text-slate-300 font-medium rounded-lg px-4 py-2 transition-colors',
            closeButton: 'opacity-0 group-hover:opacity-100 transition-opacity bg-transparent hover:bg-white/10 border-0 text-slate-400 hover:text-white right-2 top-2',
            icon: 'w-5 h-5 flex items-center justify-center shrink-0 mt-0.5',
            success: 'text-emerald-400 before:absolute before:-left-10 before:top-1/2 before:-translate-y-1/2 before:w-24 before:h-[120%] before:bg-emerald-500/20 before:blur-2xl before:-z-10',
            error: 'text-rose-400 before:absolute before:-left-10 before:top-1/2 before:-translate-y-1/2 before:w-24 before:h-[120%] before:bg-rose-500/20 before:blur-2xl before:-z-10',
            warning: 'text-amber-400 before:absolute before:-left-10 before:top-1/2 before:-translate-y-1/2 before:w-24 before:h-[120%] before:bg-amber-500/20 before:blur-2xl before:-z-10',
            info: 'text-blue-400 before:absolute before:-left-10 before:top-1/2 before:-translate-y-1/2 before:w-24 before:h-[120%] before:bg-blue-500/20 before:blur-2xl before:-z-10',
          },
        }}
      />
    </AuthProvider>
  );
}
