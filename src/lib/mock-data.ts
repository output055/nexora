import type { Customer, AuditLog, Permission, RoleWithPermissions, DashboardStats } from '@/types';

// ─── Mock Permissions ──────────────────────────────────────────────────────────
export const mockPermissions: Permission[] = [
  { id: 'p1', name: 'view_analytics', description: 'View dashboard analytics and portfolio metrics', created_at: '2024-01-01T00:00:00Z' },
  { id: 'p2', name: 'log_payment', description: 'Submit payment entries for customer accounts', created_at: '2024-01-01T00:00:00Z' },
  { id: 'p3', name: 'force_lock_device', description: 'Manually trigger Miradore device lock command', created_at: '2024-01-01T00:00:00Z' },
  { id: 'p4', name: 'unlock_device', description: 'Manually trigger Miradore device unlock command', created_at: '2024-01-01T00:00:00Z' },
  { id: 'p5', name: 'manage_customers', description: 'Create, edit, and archive customer records', created_at: '2024-01-01T00:00:00Z' },
  { id: 'p6', name: 'manage_roles', description: 'Create and modify roles and permission assignments', created_at: '2024-01-01T00:00:00Z' },
  { id: 'p7', name: 'view_audit_logs', description: 'Access the system-wide audit log stream', created_at: '2024-01-01T00:00:00Z' },
  { id: 'p8', name: 'view_customers', description: 'View customer account records', created_at: '2024-01-01T00:00:00Z' },
  { id: 'p9', name: 'manage_devices', description: 'Register devices and manage onboarding workflows', created_at: '2024-01-01T00:00:00Z' },
];

// ─── Mock Roles ────────────────────────────────────────────────────────────────
export const mockRoles: RoleWithPermissions[] = [
  {
    id: 'r1',
    name: 'superadmin',
    description: 'Full platform access — all permissions',
    created_at: '2024-01-01T00:00:00Z',
    permissions: mockPermissions,
  },
  {
    id: 'r2',
    name: 'admin',
    description: 'Operational oversight — analytics, locks, and audit logs',
    created_at: '2024-01-01T00:00:00Z',
    permissions: mockPermissions.filter((p) =>
      ['view_analytics', 'force_lock_device', 'unlock_device', 'manage_customers', 'manage_devices', 'view_audit_logs', 'view_customers'].includes(p.name)
    ),
  },
  {
    id: 'r3',
    name: 'shop_manager',
    description: 'Manages a retail outlet — can log payments and view accounts',
    created_at: '2024-01-01T00:00:00Z',
    permissions: mockPermissions.filter((p) =>
      ['log_payment', 'view_customers', 'view_analytics'].includes(p.name)
    ),
  },
  {
    id: 'r4',
    name: 'field_agent',
    description: 'Field collection agent — payment entry only',
    created_at: '2024-01-01T00:00:00Z',
    permissions: mockPermissions.filter((p) =>
      ['log_payment', 'view_customers'].includes(p.name)
    ),
  },
];

// ─── Mock Customers ────────────────────────────────────────────────────────────
export const mockCustomers: Customer[] = [
  {
    id: 'c1',
    full_name: 'Emeka Okafor',
    phone_number: '+234 803 456 7890',
    os_platform: 'Android',
    device_model: 'Samsung Galaxy A55',
    mdm_device_id: 'MDR-AND-001',
    total_owed: 180000,
    remaining_balance: 45000,
    payment_status: 'current',
    created_at: '2024-03-15T10:00:00Z',
    updated_at: '2024-06-01T14:22:00Z',
  },
  {
    id: 'c2',
    full_name: 'Amaka Nwosu',
    phone_number: '+234 701 234 5678',
    os_platform: 'iOS',
    device_model: 'iPhone 15',
    mdm_device_id: 'MDR-IOS-002',
    total_owed: 350000,
    remaining_balance: 280000,
    payment_status: 'overdue',
    created_at: '2024-02-10T09:00:00Z',
    updated_at: '2024-05-28T08:00:00Z',
  },
  {
    id: 'c3',
    full_name: 'Chukwudi Eze',
    phone_number: '+234 815 678 9012',
    os_platform: 'Android',
    device_model: 'Tecno Camon 30',
    mdm_device_id: 'MDR-AND-003',
    total_owed: 95000,
    remaining_balance: 0,
    payment_status: 'current',
    created_at: '2024-01-20T11:00:00Z',
    updated_at: '2024-06-20T16:30:00Z',
  },
  {
    id: 'c4',
    full_name: 'Fatima Al-Hassan',
    phone_number: '+234 706 345 6789',
    os_platform: 'iOS',
    device_model: 'iPhone 14 Pro',
    mdm_device_id: 'MDR-IOS-004',
    total_owed: 420000,
    remaining_balance: 210000,
    payment_status: 'overdue',
    created_at: '2024-04-05T13:00:00Z',
    updated_at: '2024-06-10T10:00:00Z',
  },
  {
    id: 'c5',
    full_name: 'Ngozi Adeyemi',
    phone_number: '+234 809 876 5432',
    os_platform: 'Android',
    device_model: 'Xiaomi Redmi Note 13',
    mdm_device_id: 'MDR-AND-005',
    total_owed: 125000,
    remaining_balance: 62500,
    payment_status: 'current',
    created_at: '2024-05-01T08:00:00Z',
    updated_at: '2024-06-25T12:00:00Z',
  },
  {
    id: 'c6',
    full_name: 'Babatunde Fashola',
    phone_number: '+234 802 111 2233',
    os_platform: 'iOS',
    device_model: 'iPhone 13',
    mdm_device_id: 'MDR-IOS-006',
    total_owed: 280000,
    remaining_balance: 140000,
    payment_status: 'overdue',
    created_at: '2024-03-22T15:00:00Z',
    updated_at: '2024-05-15T09:00:00Z',
  },
  {
    id: 'c7',
    full_name: 'Kelechi Umeh',
    phone_number: '+234 703 222 3344',
    os_platform: 'Android',
    device_model: 'OPPO A78',
    mdm_device_id: 'MDR-AND-007',
    total_owed: 75000,
    remaining_balance: 18750,
    payment_status: 'current',
    created_at: '2024-06-01T10:00:00Z',
    updated_at: '2024-06-28T14:00:00Z',
  },
  {
    id: 'c8',
    full_name: 'Aisha Mohammed',
    phone_number: '+234 811 333 4455',
    os_platform: 'iOS',
    device_model: 'iPhone 15 Pro Max',
    mdm_device_id: 'MDR-IOS-008',
    total_owed: 650000,
    remaining_balance: 520000,
    payment_status: 'overdue',
    created_at: '2024-01-15T08:00:00Z',
    updated_at: '2024-04-01T10:00:00Z',
  },
];

// ─── Mock Audit Logs ───────────────────────────────────────────────────────────
export const mockAuditLogs: AuditLog[] = [
  { id: 'a1', actor_name: 'Admin Tunde', action_description: 'Triggered LOCK on device MDR-IOS-002 (Amaka Nwosu) — iOS Lost Mode activated', timestamp: new Date(Date.now() - 4 * 60000).toISOString() },
  { id: 'a2', actor_name: 'Field Agent Emeka', action_description: 'Logged payment of GH₵45,000 for Chukwudi Eze — balance cleared', timestamp: new Date(Date.now() - 18 * 60000).toISOString() },
  { id: 'a3', actor_name: 'System (auto)', action_description: 'UNLOCK triggered for device MDR-AND-003 (Chukwudi Eze) — balance reached GH₵0', timestamp: new Date(Date.now() - 19 * 60000).toISOString() },
  { id: 'a4', actor_name: 'Admin Tunde', action_description: 'Assigned permission "force_lock_device" to role "shop_manager"', timestamp: new Date(Date.now() - 2 * 3600000).toISOString() },
  { id: 'a5', actor_name: 'Field Agent Bola', action_description: 'Logged payment of GH₵30,000 for Emeka Okafor', timestamp: new Date(Date.now() - 5 * 3600000).toISOString() },
  { id: 'a6', actor_name: 'Admin Tunde', action_description: 'Triggered LOCK on device MDR-IOS-004 (Fatima Al-Hassan) — iOS Lost Mode activated', timestamp: new Date(Date.now() - 24 * 3600000).toISOString() },
  { id: 'a7', actor_name: 'Superadmin', action_description: 'Created new role "shop_manager" with 3 permissions', timestamp: new Date(Date.now() - 48 * 3600000).toISOString() },
  { id: 'a8', actor_name: 'Field Agent Ngozi', action_description: 'Logged payment of GH₵62,500 for Ngozi Adeyemi — account now current', timestamp: new Date(Date.now() - 72 * 3600000).toISOString() },
];

// ─── Mock Stats ────────────────────────────────────────────────────────────────
export const mockDashboardStats: DashboardStats = {
  totalCapitalDeployed: 2175000,
  activeAccounts: 8,
  overdueAccounts: 4,
  collectionsThisMonth: 310000,
  overdueRate: 50,
  totalOutstanding: 1276250,
};

// ─── Collections Chart Data ────────────────────────────────────────────────────
export const collectionsChartData = [
  { month: 'Jan', collected: 185000, target: 220000 },
  { month: 'Feb', collected: 220000, target: 220000 },
  { month: 'Mar', collected: 195000, target: 240000 },
  { month: 'Apr', collected: 260000, target: 240000 },
  { month: 'May', collected: 290000, target: 280000 },
  { month: 'Jun', collected: 310000, target: 300000 },
];
