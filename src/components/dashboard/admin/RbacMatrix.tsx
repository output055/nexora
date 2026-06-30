'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2, Check, Trash2, Edit3 } from 'lucide-react';
import { toast } from 'sonner';
import type { RoleWithPermissions, Permission } from '@/types';
import { cn } from '@/lib/utils';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

interface RbacMatrixProps {
  roles: RoleWithPermissions[];
  permissions: Permission[];
  onUpdate: (roles: RoleWithPermissions[]) => void;
}

export function RbacMatrix({ roles, permissions, onUpdate }: RbacMatrixProps) {
  const [saving, setSaving] = useState<string | null>(null); // "roleId:permId"
  const [newRoleName, setNewRoleName] = useState('');
  const [newRoleDesc, setNewRoleDesc] = useState('');
  const [addingRole, setAddingRole] = useState(false);
  const [creatingRole, setCreatingRole] = useState(false);

  const hasPermission = (role: RoleWithPermissions, perm: Permission) =>
    role.permissions.some((p) => p.id === perm.id);

  const togglePermission = async (role: RoleWithPermissions, perm: Permission) => {
    const key = `${role.id}:${perm.id}`;
    setSaving(key);

    const currentlyHas = hasPermission(role, perm);
    const newPermissions = currentlyHas
      ? role.permissions.filter((p) => p.id !== perm.id)
      : [...role.permissions, perm];

    // Optimistic update
    const updatedRoles = roles.map((r) =>
      r.id === role.id ? { ...r, permissions: newPermissions } : r
    );
    onUpdate(updatedRoles);

    try {
      const supabase = createBrowserSupabaseClient();
      
      if (currentlyHas) {
        const { error } = await supabase
          .from('role_permissions')
          .delete()
          .match({ role_id: role.id, permission_id: perm.id });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('role_permissions')
          .insert({ role_id: role.id, permission_id: perm.id });
        if (error) throw error;
      }
      
      toast.success(
        currentlyHas
          ? `Removed "${perm.name}" from "${role.name}"`
          : `Added "${perm.name}" to "${role.name}"`
      );
    } catch {
      // Revert on failure
      onUpdate(roles);
      toast.error('Failed to update permission. Please retry.');
    } finally {
      setSaving(null);
    }
  };

  const createRole = async () => {
    if (!newRoleName.trim()) return;
    setCreatingRole(true);
    try {
      const supabase = createBrowserSupabaseClient();
      const slug = newRoleName.toLowerCase().replace(/\s+/g, '_');
      
      const { data, error } = await supabase
        .from('roles')
        .insert({
          name: slug,
          description: newRoleDesc,
        })
        .select()
        .single();
        
      if (error) throw error;
      
      const newRole: RoleWithPermissions = {
        ...data,
        permissions: [],
      };
      
      onUpdate([...roles, newRole]);
      toast.success(`Role "${newRole.name}" created.`);
      setNewRoleName('');
      setNewRoleDesc('');
      setAddingRole(false);
    } catch (e: any) {
      toast.error(`Failed to create role: ${e.message}`);
    } finally {
      setCreatingRole(false);
    }
  };

  const deleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`Delete role "${roleName}"? This cannot be undone.`)) return;
    
    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.from('roles').delete().eq('id', roleId);
    
    if (error) {
      toast.error('Failed to delete role.');
    } else {
      onUpdate(roles.filter((r) => r.id !== roleId));
      toast.success(`Role "${roleName}" deleted.`);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-white">Permission Matrix</h2>
          <p className="text-xs text-slate-500 mt-0.5">Check boxes to assign permissions to roles. Changes apply instantly.</p>
        </div>
        <button
          id="add-role-btn"
          onClick={() => setAddingRole(!addingRole)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors shadow-[0_4px_12px_rgba(59,130,246,0.3)]"
        >
          <Plus size={15} />
          New Role
        </button>
      </div>

      {/* New role form */}
      <AnimatePresence>
        {addingRole && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Edit3 size={14} className="text-blue-400" />
                Create New Role
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="new-role-name" className="block text-xs font-medium text-slate-400 mb-1.5">
                    Role name (slug)
                  </label>
                  <input
                    id="new-role-name"
                    type="text"
                    placeholder="e.g. shop_manager"
                    value={newRoleName}
                    onChange={(e) => setNewRoleName(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
                <div>
                  <label htmlFor="new-role-desc" className="block text-xs font-medium text-slate-400 mb-1.5">
                    Description
                  </label>
                  <input
                    id="new-role-desc"
                    type="text"
                    placeholder="Brief description of this role"
                    value={newRoleDesc}
                    onChange={(e) => setNewRoleDesc(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  id="create-role-submit"
                  onClick={createRole}
                  disabled={creatingRole || !newRoleName.trim()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  {creatingRole ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Create Role
                </button>
                <button
                  onClick={() => { setAddingRole(false); setNewRoleName(''); setNewRoleDesc(''); }}
                  className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 hover:text-white text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Matrix grid */}
      <div className="bg-[#111827] border border-white/5 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-xs font-semibold text-slate-500 px-5 py-3.5 w-[200px] sticky left-0 bg-[#111827]">
                  Permission
                </th>
                {roles.map((role) => (
                  <th key={role.id} className="text-center px-4 py-3.5 min-w-[130px]">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-semibold text-white capitalize">
                        {role.name.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-600 hidden sm:block">{role.description.slice(0, 30)}…</span>
                      {!['superadmin', 'admin'].includes(role.name) && (
                        <button
                          onClick={() => deleteRole(role.id, role.name)}
                          className="text-red-500/50 hover:text-red-400 transition-colors mt-0.5"
                          title={`Delete ${role.name}`}
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((perm, idx) => (
                <tr key={perm.id} className={cn('border-b border-white/5 last:border-0', idx % 2 === 0 ? '' : 'bg-white/[0.01]')}>
                  <td className="px-5 py-3.5 sticky left-0 bg-inherit">
                    <p className="text-sm font-mono text-blue-400 text-xs">{perm.name}</p>
                    <p className="text-xs text-slate-600 mt-0.5">{perm.description}</p>
                  </td>
                  {roles.map((role) => {
                    const key = `${role.id}:${perm.id}`;
                    const checked = hasPermission(role, perm);
                    const isLoading = saving === key;

                    return (
                      <td key={role.id} className="text-center px-4 py-3.5">
                        <div className="flex items-center justify-center">
                          {isLoading ? (
                            <Loader2 size={16} className="animate-spin text-blue-400" />
                          ) : (
                            <button
                              id={`perm-${role.id}-${perm.id}`}
                              onClick={() => togglePermission(role, perm)}
                              className={cn(
                                'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150',
                                checked
                                  ? 'bg-blue-600 border-blue-600 shadow-[0_0_8px_rgba(59,130,246,0.4)]'
                                  : 'border-white/15 bg-transparent hover:border-blue-500/50'
                              )}
                            >
                              {checked && <Check size={11} className="text-white" />}
                            </button>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
