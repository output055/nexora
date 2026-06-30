'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Plus, Info } from 'lucide-react';
import { RbacMatrix } from '@/components/dashboard/admin/RbacMatrix';
import type { RoleWithPermissions, Permission } from '@/types';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

export default function AdminSettingsPage() {
  const [roles, setRoles] = useState<RoleWithPermissions[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [newPermName, setNewPermName] = useState('');
  const [newPermDesc, setNewPermDesc] = useState('');
  const [addingPerm, setAddingPerm] = useState(false);

  useEffect(() => {
    const fetchRBAC = async () => {
      const supabase = createBrowserSupabaseClient();
      
      const [permsRes, rolesRes] = await Promise.all([
        supabase.from('permissions').select('*').order('name'),
        supabase.from('roles').select(`
          id, name, description, created_at,
          role_permissions (
            permission:permissions (id, name, description, created_at)
          )
        `).order('name')
      ]);

      if (permsRes.data) setPermissions(permsRes.data);
      if (rolesRes.data) {
        const mappedRoles = rolesRes.data.map(r => ({
          id: r.id,
          name: r.name,
          description: r.description,
          created_at: r.created_at,
          permissions: r.role_permissions.map((rp: any) => rp.permission).filter(Boolean)
        }));
        setRoles(mappedRoles);
      }
    };
    fetchRBAC();
  }, []);

  const handleAddPermission = () => {
    if (!newPermName.trim()) return;
    const slug = newPermName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const supabase = createBrowserSupabaseClient();
    
    // Insert into Supabase
    supabase.from('permissions').insert({
      name: slug,
      description: newPermDesc,
    }).select().single().then(({ data }) => {
      if (data) {
        setPermissions((prev) => [...prev, data as Permission]);
        setNewPermName('');
        setNewPermDesc('');
        setAddingPerm(false);
      }
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="flex flex-col gap-6 max-w-[1200px] mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-[#111827] border border-white/5 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck size={18} className="text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">Dynamic RBAC Management</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Assign permissions to roles in real-time. Changes propagate instantly — no code redeployments required.
            </p>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            id="add-permission-btn"
            onClick={() => setAddingPerm(!addingPerm)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 text-slate-300 hover:bg-white/8 hover:text-white text-xs font-semibold transition-colors border border-white/8"
          >
            <Plus size={13} />
            New Permission
          </button>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total Roles', value: roles.length, color: 'text-blue-400' },
          { label: 'Total Permissions', value: permissions.length, color: 'text-emerald-400' },
          { label: 'Assignments', value: roles.reduce((a, r) => a + r.permissions.length, 0), color: 'text-amber-400' },
          { label: 'Unassigned Perms', value: permissions.filter(p => !roles.some(r => r.permissions.some(rp => rp.id === p.id))).length, color: 'text-slate-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-[#111827] border border-white/5 rounded-xl p-4">
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Add permission inline form */}
      {addingPerm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 overflow-hidden"
        >
          <h3 className="text-sm font-semibold text-white mb-4">New Permission</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="perm-name" className="block text-xs text-slate-400 mb-1.5">Slug (e.g. view_reports)</label>
              <input
                id="perm-name"
                type="text"
                placeholder="permission_slug"
                value={newPermName}
                onChange={(e) => setNewPermName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <div>
              <label htmlFor="perm-desc" className="block text-xs text-slate-400 mb-1.5">Description</label>
              <input
                id="perm-desc"
                type="text"
                placeholder="What this permission allows"
                value={newPermDesc}
                onChange={(e) => setNewPermDesc(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              id="save-permission"
              onClick={handleAddPermission}
              disabled={!newPermName.trim()}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
            >
              Save Permission
            </button>
            <button onClick={() => setAddingPerm(false)} className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 hover:text-white text-sm">
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {/* Info banner */}
      <div className="flex items-start gap-2.5 px-4 py-3 bg-blue-500/5 border border-blue-500/15 rounded-xl text-xs text-slate-400">
        <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
        <span>
          Changes to role permissions take effect immediately. Users will reflect updated permissions on their next request. 
          <span className="text-blue-400 font-medium"> Superadmin</span> cannot have permissions removed via this UI.
        </span>
      </div>

      {/* RBAC Matrix */}
      <RbacMatrix roles={roles} permissions={permissions} onUpdate={setRoles} />
    </motion.div>
  );
}
