'use client';

import { useState, useEffect } from 'react';
import { Bell, Check, Trash2, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { markNotificationRead, markAllNotificationsRead } from '@/app/actions/communications';
import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';

type Notification = {
  id: string;
  user_id: string | null;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link: string | null;
  is_read: boolean;
  created_at: string;
};

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    const supabase = createBrowserSupabaseClient();

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (data) setNotifications(data);
    };

    fetchNotifications();

    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`, // We can't easily do OR in realtime filter, so we might need two channels or client-side filtering
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=is.null`, // Global notifications
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await markNotificationRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      await markNotificationRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }
    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'success': return 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20';
      case 'warning': return 'text-amber-400 bg-amber-400/10 border-amber-400/20';
      case 'error': return 'text-red-400 bg-red-400/10 border-red-400/20';
      default: return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 rounded-xl transition-colors ${isOpen ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-slate-400 hover:text-white'}`}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-500 border border-[#111827]"></span>
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#1E293B] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="px-4 py-3 border-b border-white/5 flex items-center justify-between shrink-0">
                <h3 className="font-semibold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <button 
                    onClick={handleMarkAllRead}
                    className="text-xs text-blue-400 hover:text-blue-300 font-medium flex items-center gap-1 transition-colors"
                  >
                    <Check size={14} />
                    Mark all read
                  </button>
                )}
              </div>

              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">
                    <Bell size={24} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No notifications yet.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-white/5">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-4 hover:bg-white/5 transition-colors cursor-pointer ${notif.is_read ? 'opacity-60' : 'bg-blue-500/5'}`}
                      >
                        <div className="flex gap-3 items-start">
                          <div className={`mt-0.5 shrink-0 w-2 h-2 rounded-full ${!notif.is_read ? 'bg-blue-500' : 'bg-transparent'}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <p className={`text-sm font-medium truncate ${!notif.is_read ? 'text-white' : 'text-slate-300'}`}>
                                {notif.title}
                              </p>
                              <span className="text-[10px] text-slate-500 whitespace-nowrap shrink-0">
                                {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                              {notif.message}
                            </p>
                            
                            {notif.link && (
                              <div className="mt-2 flex items-center gap-1 text-[11px] font-medium text-blue-400">
                                View details <ExternalLink size={10} />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-2 border-t border-white/5 shrink-0">
                <button 
                  onClick={() => { 
                    setIsOpen(false); 
                    const isCustomer = user?.roles?.some(r => r.name === 'customer');
                    router.push(isCustomer ? '/dashboard/customer/notifications' : '/dashboard/admin/notifications'); 
                  }}
                  className="w-full py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                >
                  View all notifications
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
