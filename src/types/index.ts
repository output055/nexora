// ─── Domain Enums ──────────────────────────────────────────────────────────────
export type OsPlatform = 'iOS' | 'Android';
export type PaymentStatus = 'current' | 'overdue';
export type ResidentialStatus = 'owner' | 'renting' | 'family_house' | 'other';
export type PaymentCycle = 'daily' | 'weekly' | 'bi_weekly';

// ─── RBAC ──────────────────────────────────────────────────────────────────────
export interface Permission {
  id: string;
  name: string; // unique slug e.g. "force_lock_device"
  description: string;
  created_at: string;
}

export interface Role {
  id: string;
  name: string; // unique slug e.g. "field_agent"
  description: string;
  created_at: string;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

export interface UserRole {
  user_id: string;
  role_id: string;
  role?: Role;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  roles: Role[];
  permissions: string[]; // flat list of permission slugs
}

// ─── Core Domain ──────────────────────────────────────────────────────────────
export interface Customer {
  id: string;
  full_name: string;
  phone_number: string;
  ghana_card_id?: string;
  ghana_card_scan_path?: string;
  alternative_phone_number?: string;
  whatsapp_number?: string;
  digital_address?: string;
  location_landmarks?: string;
  residential_status?: ResidentialStatus;
  landlord_contact?: string;
  occupation?: string;
  place_of_work?: string;
  payment_cycle?: PaymentCycle;
  os_platform: OsPlatform;
  device_model: string;
  mdm_device_id: string;
  total_owed: number;
  remaining_balance: number;
  payment_status: PaymentStatus;
  created_at: string;
  updated_at: string;
}

export interface Payment {
  id: string;
  customer_id: string;
  collector_id: string; // auth.users UUID
  amount_paid: number;
  collection_date: string;
  created_at: string;
  customer?: Customer;
  collector_name?: string;
}

export interface AuditLog {
  id: string;
  actor_name: string;
  action_description: string;
  timestamp: string;
}

// ─── API Models ───────────────────────────────────────────────────────────────
export interface MdmDeviceLockPayload {
  NotificationText: string;
  PhoneNumber: string;
  FootnoteText: string;
}

export interface MdmResponse {
  success: boolean;
  statusCode: number;
  message?: string;
}

export interface ApiResponse<T = null> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardStats {
  totalCapitalDeployed: number;
  activeAccounts: number;
  overdueAccounts: number;
  collectionsThisMonth: number;
  overdueRate: number; // percentage
  totalOutstanding: number;
}

// ─── Auth Context ─────────────────────────────────────────────────────────────
export interface AuthContextValue {
  user: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}
