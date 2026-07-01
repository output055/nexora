'use client';

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Shield, Trash2, Edit2, X, AlertCircle, RefreshCw, Search } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { fetchUsers, createUser, updateUserRole, deleteUser, updateUser } from '@/app/actions/users';
import { usePagination } from '@/lib/hooks/usePagination';
import { PaginationBar } from './PaginationBar';

type Role = { id: string; name: string };
type UserWithRole = { id: string; email: string; created_at: string; role: Role | null };

export function UserManagement() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all'); // 'all' or role id

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [roleId, setRoleId] = useState('');

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const supabase = createBrowserSupabaseClient();
      const { data: rolesData } = await supabase.from('roles').select('id, name');
      if (rolesData) setRoles(rolesData);

      const res = await fetchUsers();
      if (res.success && res.users) {
        setUsers(res.users as UserWithRole[]);
      } else {
        setError(res.error || 'Failed to fetch users');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filtered = useMemo(() =>
    users.filter((u) => {
      const q = search.toLowerCase();
      const matchSearch = !q || u.email.toLowerCase().includes(q);
      const matchRole =
        roleFilter === 'all' ||
        (roleFilter === '__no_role__' && !u.role) ||
        u.role?.id === roleFilter;
      return matchSearch && matchRole;
    }),
    [users, search, roleFilter]
  );

  const pagination = usePagination(filtered, 10);
  const hasActiveFilters = search || roleFilter !== 'all';

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    if (!roleId && roles.length > 0) {
      setError('Please select a role');
      setSubmitting(false);
      return;
    }
    const res = await createUser(email, password, roleId);
    if (res.success) {
      setIsModalOpen(false);
      setEmail('');
      setPassword('');
      setRoleId('');
      loadData();
    } else {
      setError(res.error || 'Failed to create user');
    }
    setSubmitting(false);
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editPassword) return;
    setSubmitting(true);
    setError('');
    const res = await updateUser(editingUser.id, { password: editPassword });
    if (res.success) {
      setIsEditModalOpen(false);
      setEditingUser(null);
      setEditPassword('');
    } else {
      setError(res.error || 'Failed to update user');
    }
    setSubmitting(false);
  };

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    const res = await updateUserRole(userId, newRoleId);
    if (res.success) loadData();
    else alert(res.error || 'Failed to update role');
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user completely?')) return;
    const res = await deleteUser(userId);
    if (res.success) loadData();
    else alert(res.error || 'Failed to delete user');
  };

  const formatRoleName = (name: string) =>
    name.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">System Users</h2>
          <p className="text-sm text-slate-400 mt-1">Manage platform access and assign RBAC roles.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        >
          <UserPlus size={16} />
          Create User
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3">
          <AlertCircle size={18} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      <div className="bg-[#111827] border border-white/5 rounded-2xl overflow-hidden">
        {/* Filter toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-white/5">
          {/* Email search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-4 h-4" />
            <input
              id="user-search"
              type="text"
              placeholder="Search by email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/8 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all"
            />
          </div>

          {/* Role filter */}
          <div className="flex gap-2 flex-wrap items-center">
            <span className="text-xs text-slate-600 font-medium">Role:</span>
            <button
              onClick={() => setRoleFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                roleFilter === 'all'
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'bg-white/5 text-slate-500 border border-white/5 hover:bg-white/8 hover:text-slate-300'
              }`}
            >
              All
            </button>
            {roles.map((r) => (
              <button
                key={r.id}
                onClick={() => setRoleFilter(r.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                  roleFilter === r.id
                    ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30'
                    : 'bg-white/5 text-slate-500 border border-white/5 hover:bg-white/8 hover:text-slate-300'
                }`}
              >
                {formatRoleName(r.name)}
              </button>
            ))}
            <button
              onClick={() => setRoleFilter('__no_role__')}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                roleFilter === '__no_role__'
                  ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                  : 'bg-white/5 text-slate-500 border border-white/5 hover:bg-white/8 hover:text-slate-300'
              }`}
            >
              No Role
            </button>
            {hasActiveFilters && (
              <button
                onClick={() => { setSearch(''); setRoleFilter('all'); }}
                className="flex items-center gap-1 px-2 py-2 rounded-xl text-xs text-slate-500 hover:text-white bg-white/5 border border-white/5 transition-all"
              >
                <X size={12} /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-white/5 text-slate-300 font-semibold border-b border-white/5">
              <tr>
                <th className="px-6 py-4">User Email</th>
                <th className="px-6 py-4">Role Assignment</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center">
                    <RefreshCw className="animate-spin text-blue-500 mx-auto mb-2" size={24} />
                    <span className="text-slate-500">Loading users...</span>
                  </td>
                </tr>
              ) : pagination.paginated.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    {users.length === 0 ? 'No users found.' : 'No users match your filters.'}
                    {hasActiveFilters && (
                      <button
                        onClick={() => { setSearch(''); setRoleFilter('all'); }}
                        className="block mx-auto mt-1 text-xs text-blue-400 hover:underline"
                      >
                        Clear filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                pagination.paginated.map((user) => (
                  <tr key={user.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="px-6 py-4 text-white font-medium">{user.email}</td>
                    <td className="px-6 py-4">
                      <select
                        value={user.role?.id || ''}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="bg-[#1E293B] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-300 focus:outline-none focus:border-blue-500"
                      >
                        <option value="">-- No Role --</option>
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>{formatRoleName(r.name)}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4">
                      {new Date(user.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setEditPassword('');
                          setIsEditModalOpen(true);
                        }}
                        className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-lg transition-colors inline-flex"
                        title="Edit User"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors inline-flex"
                        title="Delete User"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!loading && (
          <PaginationBar
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            startIndex={pagination.startIndex}
            endIndex={pagination.endIndex}
            pageSize={pagination.pageSize}
            pageSizeOptions={[10, 25]}
            onPageChange={pagination.setPage}
            onPageSizeChange={pagination.setPageSize}
            itemLabel="users"
          />
        )}
      </div>

      {/* Create User Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setIsModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#1E293B] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <UserPlus size={18} className="text-blue-500" />
                  Create New User
                </h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  disabled={submitting}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#0A0F1E] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="agent@nexora.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Temporary Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#0A0F1E] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Min 6 characters"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Assign Initial Role</label>
                  <select
                    required
                    value={roleId}
                    onChange={(e) => setRoleId(e.target.value)}
                    className="w-full bg-[#0A0F1E] border border-white/10 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  >
                    <option value="" disabled>Select a role...</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>{formatRoleName(r.name)}</option>
                    ))}
                  </select>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {submitting ? <RefreshCw className="animate-spin" size={18} /> : 'Create User'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {isEditModalOpen && editingUser && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !submitting && setIsEditModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-[#1E293B] border border-white/10 rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Edit2 size={18} className="text-blue-500" />
                  Edit User Password
                </h3>
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={submitting}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">User Email</label>
                  <input
                    type="text"
                    disabled
                    value={editingUser.email}
                    className="w-full bg-[#0A0F1E]/50 border border-white/5 rounded-xl px-4 py-2.5 text-slate-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">New Password</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full bg-[#0A0F1E] border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                    placeholder="Enter new password (min 6 chars)"
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {submitting ? <RefreshCw className="animate-spin" size={18} /> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
