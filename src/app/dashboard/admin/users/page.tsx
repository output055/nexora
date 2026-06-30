import { UserManagement } from '@/components/dashboard/admin/UserManagement';

export const metadata = {
  title: 'User Management | Nexora Admin',
  description: 'Manage users and roles',
};

export default function AdminUsersPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <UserManagement />
    </div>
  );
}
