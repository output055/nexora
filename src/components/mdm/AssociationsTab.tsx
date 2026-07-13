'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  ShieldCheck,
  Smartphone,
  Plus,
  Loader2,
  ChevronRight,
  ChevronDown,
  Link2,
  FolderOpen,
  Search,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import {
  getGroupsAction,
  getGroupDetailsAction,
  addDevicesToGroupAction,
  getProfilesAction,
  associateProfileToDeviceAction,
  associateProfileToGroupAction,
} from '@/app/actions/devices';
import { toast } from 'sonner';

interface AssociationsTabProps {
  devices: any[];
}

type SubTab = 'groups' | 'assign-device' | 'profiles';

export function AssociationsTab({ devices }: AssociationsTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>('groups');

  const subTabs: { id: SubTab; label: string; icon: any }[] = [
    { id: 'groups', label: 'Groups Overview', icon: FolderOpen },
    { id: 'assign-device', label: 'Assign to Group', icon: Plus },
    { id: 'profiles', label: 'Profile Management', icon: ShieldCheck },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col h-[calc(100vh-200px)] bg-white dark:bg-[#111827] rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-xl"
    >
      {/* Sub-tab navigation */}
      <div className="flex px-5 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0D1526] shrink-0">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveSubTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors ${
              activeSubTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-white/10'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        <AnimatePresence mode="wait">
          {activeSubTab === 'groups' && (
            <motion.div key="groups" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <GroupsOverview />
            </motion.div>
          )}
          {activeSubTab === 'assign-device' && (
            <motion.div key="assign" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AssignToGroup devices={devices} />
            </motion.div>
          )}
          {activeSubTab === 'profiles' && (
            <motion.div key="profiles" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ProfileManagement devices={devices} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ── Groups Overview ───────────────────────────────────────────────────────────

function GroupsOverview() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);
  const [groupMembers, setGroupMembers] = useState<Record<number, any[]>>({});
  const [loadingMembers, setLoadingMembers] = useState<number | null>(null);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoading(true);
    setError(null);
    const res = await getGroupsAction();
    if (res.success && res.data) {
      const grps = Array.isArray(res.data.groups) ? res.data.groups : Array.isArray(res.data) ? res.data : [];
      setGroups(grps);
    } else {
      setError(res.error || 'Failed to load groups');
    }
    setLoading(false);
  };

  const toggleGroup = async (groupId: number) => {
    if (expandedGroup === groupId) {
      setExpandedGroup(null);
      return;
    }
    setExpandedGroup(groupId);

    if (!groupMembers[groupId]) {
      setLoadingMembers(groupId);
      const res = await getGroupDetailsAction(groupId);
      if (res.success && res.data) {
        const members = res.data.members || res.data.devices || [];
        setGroupMembers((prev) => ({ ...prev, [groupId]: members }));
      }
      setLoadingMembers(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="text-sm">Loading groups…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertCircle className="text-red-400" size={24} />
        </div>
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={loadGroups}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-slate-300 rounded-xl transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
        <FolderOpen size={32} className="opacity-50" />
        <p className="text-sm">No device groups found in ManageEngine.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-slate-800 dark:text-white">Device Groups</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {groups.length} group{groups.length !== 1 ? 's' : ''} configured in ManageEngine
          </p>
        </div>
        <button
          onClick={loadGroups}
          className="p-2 text-slate-400 hover:text-blue-400 bg-slate-100 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
          title="Refresh groups"
        >
          <Loader2 size={16} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {groups.map((group: any) => {
        const gId = group.group_id ?? group.id;
        const isExpanded = expandedGroup === gId;
        const members = groupMembers[gId] || [];

        return (
          <div
            key={gId}
            className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl overflow-hidden transition-colors"
          >
            <button
              onClick={() => toggleGroup(gId)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center shrink-0">
                  <Users className="text-blue-500 dark:text-blue-400" size={18} />
                </div>
                <div className="text-left">
                  <div className="font-medium text-sm text-slate-800 dark:text-slate-200">
                    {group.name || 'Unnamed Group'}
                  </div>
                  {group.description && (
                    <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">{group.description}</div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {group.member_count != null && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                    <Smartphone size={12} />
                    {group.member_count}
                  </span>
                )}
                <ChevronDown
                  size={16}
                  className={`text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                />
              </div>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 border-t border-slate-100 dark:border-white/5">
                    {loadingMembers === gId ? (
                      <div className="flex items-center gap-2 py-4 text-slate-500 text-sm">
                        <Loader2 size={14} className="animate-spin" />
                        Loading members…
                      </div>
                    ) : members.length > 0 ? (
                      <div className="mt-3 space-y-1.5">
                        {members.map((member: any, idx: number) => (
                          <div
                            key={member.device_id || idx}
                            className="flex items-center gap-3 px-3 py-2 bg-white dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-lg"
                          >
                            <Smartphone size={14} className="text-slate-400 shrink-0" />
                            <span className="text-sm text-slate-700 dark:text-slate-300 truncate">
                              {member.device_name || member.name || `Device ${member.device_id || idx + 1}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="py-4 text-slate-500 text-sm">No devices in this group.</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ── Assign to Group ───────────────────────────────────────────────────────────

function AssignToGroup({ devices }: { devices: any[] }) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadGroups();
  }, []);

  const loadGroups = async () => {
    setLoadingGroups(true);
    const res = await getGroupsAction();
    if (res.success && res.data) {
      const grps = Array.isArray(res.data.groups) ? res.data.groups : Array.isArray(res.data) ? res.data : [];
      setGroups(grps);
    }
    setLoadingGroups(false);
  };

  const toggleDevice = (deviceId: string) => {
    setSelectedDevices((prev) => {
      const next = new Set(prev);
      if (next.has(deviceId)) {
        next.delete(deviceId);
      } else {
        next.add(deviceId);
      }
      return next;
    });
  };

  const filteredDevices = devices.filter(
    (d) =>
      d.device_name?.toLowerCase().includes(search.toLowerCase()) ||
      d.serial_number?.toLowerCase().includes(search.toLowerCase()) ||
      d.model?.toLowerCase().includes(search.toLowerCase())
  );

  const selectAll = () => {
    if (selectedDevices.size === filteredDevices.length) {
      setSelectedDevices(new Set());
    } else {
      setSelectedDevices(new Set(filteredDevices.map((d) => String(d.device_id))));
    }
  };

  const handleAssign = async () => {
    if (!selectedGroup || selectedDevices.size === 0) return;
    setSubmitting(true);
    const res = await addDevicesToGroupAction(selectedGroup, Array.from(selectedDevices));
    if (res.success) {
      toast.success(`${selectedDevices.size} device(s) added to group successfully.`);
      setSelectedDevices(new Set());
    } else {
      toast.error('Failed to add devices: ' + (res.error || 'Unknown error'));
    }
    setSubmitting(false);
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-slate-800 dark:text-white">Assign Devices to Group</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Select a target group and choose which devices to add.
        </p>
      </div>

      {/* Group selector */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Target Group
        </label>
        {loadingGroups ? (
          <div className="flex items-center gap-2 py-2 text-slate-500 text-sm">
            <Loader2 size={14} className="animate-spin" />
            Loading groups…
          </div>
        ) : (
          <select
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
          >
            <option value="">Select a group…</option>
            {groups.map((g: any) => (
              <option key={g.group_id ?? g.id} value={String(g.group_id ?? g.id)}>
                {g.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Device search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
        <input
          type="text"
          placeholder="Search devices…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
        />
      </div>

      {/* Select all / count */}
      <div className="flex items-center justify-between">
        <button
          onClick={selectAll}
          className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
        >
          {selectedDevices.size === filteredDevices.length && filteredDevices.length > 0 ? 'Deselect All' : 'Select All'}
        </button>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {selectedDevices.size} of {filteredDevices.length} selected
        </span>
      </div>

      {/* Device list */}
      <div className="space-y-1.5 max-h-[320px] overflow-y-auto pr-1">
        {filteredDevices.map((device: any) => {
          const devId = String(device.device_id);
          const isSelected = selectedDevices.has(devId);
          return (
            <button
              key={devId}
              onClick={() => toggleDevice(devId)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left ${
                isSelected
                  ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30'
                  : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                  isSelected
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-slate-300 dark:border-slate-600'
                }`}
              >
                {isSelected && <Check size={12} className="text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                  {device.device_name || 'Unnamed Device'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                  {device.model || 'Unknown'} • {device.serial_number || 'N/A'}
                </div>
              </div>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                  device.platform_type?.toLowerCase() === 'ios'
                    ? 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400'
                    : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                }`}
              >
                {device.platform_type || '?'}
              </span>
            </button>
          );
        })}
        {filteredDevices.length === 0 && (
          <div className="text-center py-8 text-slate-500 text-sm">No devices match your search.</div>
        )}
      </div>

      {/* Submit */}
      <button
        onClick={handleAssign}
        disabled={!selectedGroup || selectedDevices.size === 0 || submitting}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-white/10 disabled:text-slate-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:shadow-none"
      >
        {submitting ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Adding…
          </>
        ) : (
          <>
            <Plus size={16} />
            Add {selectedDevices.size} Device{selectedDevices.size !== 1 ? 's' : ''} to Group
          </>
        )}
      </button>
    </div>
  );
}

// ── Profile Management ────────────────────────────────────────────────────────

function ProfileManagement({ devices }: { devices: any[] }) {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Associate profile to device state
  const [selectedProfile, setSelectedProfile] = useState<string>('');
  const [associateTarget, setAssociateTarget] = useState<'device' | 'group'>('device');
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    const [profilesRes, groupsRes] = await Promise.all([getProfilesAction(), getGroupsAction()]);

    if (profilesRes.success && profilesRes.data) {
      const profs = Array.isArray(profilesRes.data.profiles)
        ? profilesRes.data.profiles
        : Array.isArray(profilesRes.data)
        ? profilesRes.data
        : [];
      setProfiles(profs);
    } else {
      setError(profilesRes.error || 'Failed to load profiles');
    }

    if (groupsRes.success && groupsRes.data) {
      const grps = Array.isArray(groupsRes.data.groups) ? groupsRes.data.groups : Array.isArray(groupsRes.data) ? groupsRes.data : [];
      setGroups(grps);
    }

    setLoading(false);
  };

  const handleAssociate = async () => {
    if (!selectedProfile) return;

    setSubmitting(true);
    let res;

    if (associateTarget === 'device' && selectedDeviceId) {
      res = await associateProfileToDeviceAction(selectedDeviceId, [selectedProfile]);
    } else if (associateTarget === 'group' && selectedGroupId) {
      res = await associateProfileToGroupAction(selectedGroupId, [selectedProfile]);
    } else {
      toast.error('Please select a target device or group.');
      setSubmitting(false);
      return;
    }

    if (res?.success) {
      toast.success(
        `Profile associated to ${associateTarget === 'device' ? 'device' : 'group'} successfully.`
      );
      setSelectedProfile('');
      setSelectedDeviceId('');
      setSelectedGroupId('');
    } else {
      toast.error('Association failed: ' + (res?.error || 'Unknown error'));
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-500 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
        <span className="text-sm">Loading profiles…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <AlertCircle className="text-red-400" size={24} />
        </div>
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={loadData}
          className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 text-sm text-slate-300 rounded-xl transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profiles list */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-white">Available Profiles</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {profiles.length} profile{profiles.length !== 1 ? 's' : ''} found in ManageEngine
            </p>
          </div>
          <button
            onClick={loadData}
            className="p-2 text-slate-400 hover:text-blue-400 bg-slate-100 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
            title="Refresh profiles"
          >
            <Loader2 size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {profiles.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {profiles.map((profile: any) => {
              const pId = profile.profile_id ?? profile.id;
              return (
                <div
                  key={pId}
                  className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl"
                >
                  <div className="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-500/10 border border-violet-100 dark:border-violet-500/20 flex items-center justify-center shrink-0">
                    <ShieldCheck className="text-violet-500 dark:text-violet-400" size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                      {profile.profile_name || profile.name || 'Unnamed Profile'}
                    </div>
                    {(profile.profile_description || profile.platform_type) && (
                      <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5 truncate">
                        {profile.platform_type && (
                          <span className="mr-2 uppercase">{profile.platform_type}</span>
                        )}
                        {profile.profile_description}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl text-slate-500 text-sm">
            No profiles found.
          </div>
        )}
      </div>

      {/* Association form */}
      <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Link2 size={18} className="text-blue-500 dark:text-blue-400" />
          <h4 className="text-sm font-semibold text-slate-800 dark:text-white">Associate Profile</h4>
        </div>

        {/* Profile selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Profile
          </label>
          <select
            value={selectedProfile}
            onChange={(e) => setSelectedProfile(e.target.value)}
            className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
          >
            <option value="">Select a profile…</option>
            {profiles.map((p: any) => (
              <option key={p.profile_id ?? p.id} value={String(p.profile_id ?? p.id)}>
                {p.profile_name || p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Target type toggle */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Associate To
          </label>
          <div className="flex gap-2">
            <button
              onClick={() => setAssociateTarget('device')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                associateTarget === 'device'
                  ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400'
                  : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
              }`}
            >
              <Smartphone size={16} />
              Device
            </button>
            <button
              onClick={() => setAssociateTarget('group')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                associateTarget === 'group'
                  ? 'bg-blue-50 dark:bg-blue-500/10 border-blue-200 dark:border-blue-500/30 text-blue-700 dark:text-blue-400'
                  : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/[0.04]'
              }`}
            >
              <Users size={16} />
              Group
            </button>
          </div>
        </div>

        {/* Target selector */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {associateTarget === 'device' ? 'Target Device' : 'Target Group'}
          </label>
          {associateTarget === 'device' ? (
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
            >
              <option value="">Select a device…</option>
              {devices.map((d: any) => (
                <option key={d.device_id} value={String(d.device_id)}>
                  {d.device_name || d.model || 'Device'} ({d.serial_number || d.device_id})
                </option>
              ))}
            </select>
          ) : (
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all appearance-none"
            >
              <option value="">Select a group…</option>
              {groups.map((g: any) => (
                <option key={g.group_id ?? g.id} value={String(g.group_id ?? g.id)}>
                  {g.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Submit */}
        <button
          onClick={handleAssociate}
          disabled={
            !selectedProfile ||
            (associateTarget === 'device' && !selectedDeviceId) ||
            (associateTarget === 'group' && !selectedGroupId) ||
            submitting
          }
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 dark:disabled:bg-white/10 disabled:text-slate-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20 disabled:shadow-none"
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Associating…
            </>
          ) : (
            <>
              <Link2 size={16} />
              Associate Profile
            </>
          )}
        </button>
      </div>
    </div>
  );
}
