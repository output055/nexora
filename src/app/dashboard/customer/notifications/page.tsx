'use client';

import { useState, useEffect } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { useAuth } from '@/contexts/auth-context';
import { markNotificationRead, markAllNotificationsRead } from '@/app/actions/communications';
import { Check, Bell, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';

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

export default function CustomerNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order('created_at', { ascending: false });
      
      if (data) setNotifications(data);
      setIsLoading(false);
    };

    fetchNotifications();
  }, [user]);

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const handleNotificationClick = async (notif: Notification) => {
    if (!notif.is_read) {
      await markNotificationRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
    }
    if (notif.link) {
      router.push(notif.link);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">My Notifications</h1>
          <p className="text-slate-400">Your personal alerts, payment updates, and messages.</p>
        </div>
        {unreadCount > 0 && (
          <button 
            onClick={handleMarkAllRead}
            className="text-sm text-blue-400 hover:text-blue-300 font-medium flex items-center gap-2 transition-colors bg-blue-500/10 px-4 py-2 rounded-xl"
          >
            <Check size={16} />
            Mark all as read ({unreadCount})
          </button>
        )}
      </div>

      <div className="bg-[#1E293B] border border-white/10 rounded-2xl overflow-hidden">
        {notifications.length === 0 ? (
          <div className="p-16 text-center text-slate-500">
            <Bell size={48} className="mx-auto mb-4 opacity-20" />
            <h3 className="text-lg font-medium text-white mb-2">You're all caught up!</h3>
            <p className="text-sm max-w-md mx-auto">You don't have any notifications at the moment. Important updates will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {notifications.map((notif) => (
              <div 
                key={notif.id}
                onClick={() => handleNotificationClick(notif)}
                className={`p-6 hover:bg-white/5 transition-colors cursor-pointer ${notif.is_read ? 'opacity-70' : 'bg-blue-500/5'}`}
              >
                <div className="flex gap-4 items-start">
                  <div className={`mt-1 shrink-0 w-2.5 h-2.5 rounded-full ${!notif.is_read ? 'bg-blue-500' : 'bg-transparent'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <p className={`text-base font-semibold ${!notif.is_read ? 'text-white' : 'text-slate-300'}`}>
                        {notif.title}
                      </p>
                      <span className="text-xs text-slate-500 whitespace-nowrap shrink-0 font-medium">
                        {format(new Date(notif.created_at), 'MMM d, yyyy • HH:mm')}
                      </span>
                    </div>
                    <p className="text-sm text-slate-400 leading-relaxed max-w-3xl">
                      {notif.message}
                    </p>
                    
                    {notif.link && (
                      <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-blue-400 group-hover:text-blue-300">
                        View details <ExternalLink size={12} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
