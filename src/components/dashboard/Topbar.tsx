'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { LogOut, User, ChevronDown, Bell } from 'lucide-react';
import { getInitials } from '@/lib/utils';
import { NotificationBell } from './NotificationBell';

const PAGE_META: Record<string, { title: string; subtitle: string }> = {
  '/dashboard/admin': { title: 'Overview', subtitle: 'High-level portfolio tracking and analytics.' },
  '/dashboard/admin/devices': { title: 'Device Management', subtitle: 'Active list of enrolled devices and lock statuses.' },
  '/dashboard/admin/devices/onboard': { title: 'Device Onboarding', subtitle: 'Register financed hardware and assign customer ownership.' },
  '/dashboard/admin/customers': { title: 'Customer Directory', subtitle: 'Master list of all financing profiles and payment schedules.' },
  '/dashboard/admin/logs': { title: 'Ledger & Logs', subtitle: 'Immutable security audit trail streaming.' },
  '/dashboard/admin/users': { title: 'System Users', subtitle: 'Manage platform access and assign RBAC roles.' },
  '/dashboard/admin/settings': { title: 'Roles & Permissions', subtitle: 'Manage RBAC roles and assign permissions dynamically.' },
  '/dashboard/retailer': { title: 'Field Collections', subtitle: 'Search accounts and log cash collections.' },
};

export function Topbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isPaystackReviewer = user?.roles?.some(r => r.name === 'paystack_reviewer');

  let meta = PAGE_META[pathname] ?? {
    title: pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') ?? 'Dashboard',
    subtitle: '',
  };

  if (isPaystackReviewer && pathname === '/dashboard/admin/customers') {
    meta = {
      title: 'Managed Agents',
      subtitle: 'Master list of all active agent profiles and device subscriptions.',
    };
  }

  const handleLogout = async () => {
    setDropdownOpen(false);
    await logout();
  };

  return (
    <header className="h-16 bg-[#111827] border-b border-white/5 flex items-center justify-between px-4 lg:px-6 z-30 sticky top-0 shrink-0">
      <div className="ml-12 lg:ml-0 flex flex-col">
        <h1 className="text-lg font-bold text-white leading-tight capitalize">{meta.title}</h1>
        {meta.subtitle && <p className="text-xs text-slate-500 mt-0.5">{meta.subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <NotificationBell />

        {/* User menu */}
        {user && (
          <div className="relative">
            <button
              id="topbar-user-menu"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10"
            >
              <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-[13px] font-bold text-blue-400">
                {getInitials(user.full_name || user.email)}
              </div>
              <div className="hidden md:flex flex-col items-start">
                <span className="text-sm font-semibold text-white leading-none">
                  {user.full_name || user.email.split('@')[0]}
                </span>
                <span className="text-xs text-slate-500 leading-none mt-0.5 capitalize">
                  {user.roles[0]?.name?.replace(/_/g, ' ') ?? 'User'}
                </span>
              </div>
              <ChevronDown size={14} className={`text-slate-500 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setDropdownOpen(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-[#1E293B] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                  <div className="px-4 py-3 border-b border-white/5">
                    <p className="text-sm font-semibold text-white">{user.full_name || user.email}</p>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{user.email}</p>
                  </div>
                  <div className="p-1">
                    <button 
                      onClick={() => {
                        setDropdownOpen(false);
                        const isCustomer = user?.roles?.some(r => r.name === 'customer');
                        router.push(isCustomer ? '/dashboard/customer/profile' : '/dashboard/admin/profile');
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
                    >
                      <User size={15} />
                      Profile
                    </button>
                    <button
                      id="topbar-logout"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors mt-1"
                    >
                      <LogOut size={15} />
                      Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
