'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import {
  LayoutDashboard,
  Users,
  Shield,
  Settings,
  ChevronLeft,
  ChevronDown,
  Menu,
  CreditCard,
  FileText,
  ShieldCheck,
  Smartphone,
  Map,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavSubItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
  permission?: string;
}

interface NavItem {
  label: string;
  href?: string;
  icon: React.ReactNode;
  permission?: string;
  subItems?: NavSubItem[];
}

const adminNavItems: NavItem[] = [
  {
    label: 'Overview',
    href: '/dashboard/admin',
    icon: <LayoutDashboard size={18} />,
    permission: 'view_analytics',
  },
  {
    label: 'Device Management',
    href: '/dashboard/admin/devices',
    icon: <Smartphone size={18} />,
    permission: 'manage_devices',
  },
 
  {
    label: 'Customer Directory',
    href: '/dashboard/admin/customers',
    icon: <Users size={18} />,
    permission: 'view_customers',
  },
  {
    label: 'Ledger & Logs',
    href: '/dashboard/admin/logs',
    icon: <FileText size={18} />,
    permission: 'view_audit_logs',
  },
  {
    label: 'Administration',
    icon: <Shield size={18} />,
    subItems: [
      {
        label: 'MDM',
        href: '/dashboard/admin/mdm',
        icon: <Map size={18} />,
        permission: 'manage_devices',
      },
      { label: 'System Users', href: '/dashboard/admin/users', icon: <Users size={16} />, permission: 'manage_users' },
      { label: 'Roles & Permissions', href: '/dashboard/admin/settings', icon: <ShieldCheck size={16} />, permission: 'manage_roles' },
      { label: 'System Settings', href: '/dashboard/admin/system-settings', icon: <Settings size={16} />, permission: 'view_settings' },
      { label: 'Billing & Subscription', href: '/dashboard/admin/billing', icon: <CreditCard size={16} />, permission: 'view_settings' },
    ],
  },
];

const retailerNavItems: NavItem[] = [
  {
    label: 'Field Collections',
    href: '/dashboard/retailer',
    icon: <CreditCard size={18} />,
    permission: 'log_payment',
  },
];

const customerNavItems: NavItem[] = [
  {
    label: 'My Dashboard',
    href: '/dashboard/customer',
    icon: <LayoutDashboard size={18} />,
    permission: 'view_own_device',
  },
  {
    label: 'Payment History',
    href: '/dashboard/customer/history',
    icon: <FileText size={18} />,
    permission: 'view_own_payments',
  },
  {
    label: 'Help & Support',
    href: '/dashboard/customer/support',
    icon: <Shield size={18} />,
    permission: 'view_own_device',
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { user, loading, hasPermission } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(['Collections', 'Administration']);

  const isRetailer = user?.roles.some((r) => ['field_agent', 'shop_manager'].includes(r.name)) &&
    !user?.roles.some((r) => ['admin', 'superadmin'].includes(r.name));
  const isCustomer = user?.roles.some((r) => r.name === 'customer');

  const navItems = isCustomer ? customerNavItems : (isRetailer ? retailerNavItems : adminNavItems);

  useEffect(() => {
    navItems.forEach((item) => {
      if (item.subItems) {
        const hasActiveSub = item.subItems.some(
          (sub) => pathname === sub.href || pathname.startsWith(sub.href.split('#')[0] + '/')
        );
        if (hasActiveSub && !expandedGroups.includes(item.label)) {
          setExpandedGroups((prev) => [...prev, item.label]);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const toggleGroup = (label: string) => {
    if (collapsed) {
      setCollapsed(false);
      if (!expandedGroups.includes(label)) setExpandedGroups((prev) => [...prev, label]);
      return;
    }
    setExpandedGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  };

  const filterSubItems = (subItems: NavSubItem[]) =>
    subItems.filter((sub) => !sub.permission || hasPermission(sub.permission));

  const visibleItems = navItems.filter((item) => {
    if (item.permission && !hasPermission(item.permission)) return false;
    if (item.subItems) {
      const visible = filterSubItems(item.subItems);
      if (visible.length === 0) return false;
    }
    return true;
  });

  const renderNavSkeleton = () => (
    <div className="flex-1 p-3 space-y-1.5 animate-pulse">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-9 rounded-xl bg-white/5" />
      ))}
    </div>
  );

  const renderContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-16 border-b border-sidebar-border shrink-0">
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2.5"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                <Smartphone size={16} className="text-blue-400" />
              </div>
              <span className="font-bold text-white text-lg tracking-tight">Nexora</span>
            </motion.div>
          )}
        </AnimatePresence>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-white/5 transition-colors text-slate-400 hover:text-white"
          >
            <ChevronLeft
              size={18}
              className={`transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
            />
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="lg:hidden p-1.5 rounded-lg hover:bg-white/5 transition-colors text-slate-400"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {loading ? renderNavSkeleton() : null}
        {!loading && visibleItems.map((item) => {
          if (item.subItems) {
            const visible = filterSubItems(item.subItems);
            const isExpanded = expandedGroups.includes(item.label);
            const hasActiveSub = visible.some((sub) => pathname === sub.href.split('#')[0] || pathname.startsWith(sub.href.split('#')[0] + '/'));

            return (
              <div key={item.label} className="mb-1">
                <button
                  onClick={() => toggleGroup(item.label)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                    ${hasActiveSub && collapsed ? 'bg-blue-500/10 text-blue-400' : 'text-slate-400 hover:bg-white/5 hover:text-white'}
                    ${collapsed ? 'justify-center' : ''}
                  `}
                  title={collapsed ? item.label : undefined}
                >
                  <div className="flex items-center gap-3">
                    {item.icon}
                    {!collapsed && <span>{item.label}</span>}
                  </div>
                  {!collapsed && (
                    <ChevronDown
                      size={14}
                      className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''} text-slate-500`}
                    />
                  )}
                </button>

                <AnimatePresence>
                  {isExpanded && !collapsed && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden ml-4 pl-3 border-l border-white/5 mt-1 space-y-0.5"
                    >
                      {visible.map((sub) => {
                        const subPath = sub.href.split('#')[0];
                        const isActive = pathname === subPath || pathname.startsWith(subPath + '/');
                        return (
                          <Link
                            key={sub.href}
                            href={sub.href}
                            onClick={() => setMobileOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                              ${isActive ? 'bg-blue-500/10 text-blue-400' : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'}
                            `}
                          >
                            <span className={isActive ? 'text-blue-400' : 'text-slate-500'}>{sub.icon}</span>
                            <span>{sub.label}</span>
                          </Link>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          }

          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href ?? item.label}
              href={item.href ?? '#'}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200
                ${isActive
                  ? 'bg-blue-600 text-white shadow-[0_4px_12px_rgba(59,130,246,0.3)]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
              title={collapsed ? item.label : undefined}
            >
              {item.icon}
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    className="whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
        </nav>

      {/* Bottom settings link */}
      {loading ? (
        <div className="p-3 border-t border-sidebar-border shrink-0 animate-pulse">
          <div className="h-10 rounded-xl bg-white/5" />
        </div>
      ) : (!isRetailer && !isCustomer) && (
        <div className="p-3 border-t border-sidebar-border shrink-0">
          <Link
            href="/dashboard/admin/settings"
            suppressHydrationWarning
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors
              ${pathname === '/dashboard/admin/settings' ? 'bg-blue-500/10 text-blue-400' : 'text-slate-500 hover:bg-white/5 hover:text-slate-200'}
              ${collapsed ? 'justify-center' : ''}
            `}
            title={collapsed ? 'Settings' : undefined}
          >
            <Settings size={18} />
            {!collapsed && <span>Settings</span>}
          </Link>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 bg-[#111827] rounded-xl border border-white/10 shadow-lg text-slate-300"
      >
        <Menu size={18} />
      </button>

      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 left-0 h-full w-[260px] bg-[#0D1526] border-r border-sidebar-border z-50 lg:hidden"
          >
            {renderContent()}
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col h-screen sticky top-0 border-r border-sidebar-border bg-[#0D1526] transition-all duration-300 shrink-0 ${
          collapsed ? 'w-[68px]' : 'w-[260px]'
        }`}
      >
        {renderContent()}
      </aside>
    </>
  );
}
