'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Smartphone, ShieldCheck, Cpu, Hash, Clock, ChevronRight, User } from 'lucide-react';
import { getHumanReadableDeviceName } from '@/lib/deviceMapping';

interface EnrolledDevicesTableProps {
  devices: any[];
  onDeviceSelect: (device: any) => void;
}

export function EnrolledDevicesTable({ devices, onDeviceSelect }: EnrolledDevicesTableProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredDevices = devices.filter(d => {
    const mappedModelName = getHumanReadableDeviceName(d.product_name) || 
                            getHumanReadableDeviceName(d.model_name) || 
                            getHumanReadableDeviceName(d.model) || 
                            '';
    
    return d.device_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
           d.serial_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           d.model?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           d.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           mappedModelName.toLowerCase().includes(searchTerm.toLowerCase());
  });
  console.log("DEVICE DATA SAMPLE:", devices[0]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex flex-col h-[calc(100vh-140px)] bg-white dark:bg-[#111827] rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-xl"
    >
      {/* Header and Controls */}
      <div className="p-6 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0D1526] shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Enrolled Devices</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Manage and monitor all devices enrolled in the MDM system.
            </p>
          </div>
          
          <div className="relative w-full sm:w-80 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search by name, serial, or model..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-[#111827] border border-slate-200 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto custom-scrollbar">
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-slate-100/80 dark:bg-[#0D1526]/90 backdrop-blur-sm z-10">
            <tr>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-white/10 whitespace-nowrap">
                Device Name
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-white/10 whitespace-nowrap hidden sm:table-cell">
                Platform
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-white/10 whitespace-nowrap hidden md:table-cell">
                Assigned User
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-white/10 whitespace-nowrap hidden lg:table-cell">
                OS Version
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-white/10 whitespace-nowrap hidden xl:table-cell">
                Serial Number
              </th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-white/10 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {filteredDevices.map((device, index) => {
              const mappedModelName = getHumanReadableDeviceName(device.product_name) || 
                                      getHumanReadableDeviceName(device.model_name) || 
                                      getHumanReadableDeviceName(device.model) || 
                                      device.product_name || 
                                      device.model_name || 
                                      device.model;
                                      
              const displayName = mappedModelName || device.device_name || 'Unnamed Device';
              
              return (
              <tr 
                key={device.device_id || index}
                onClick={() => onDeviceSelect(device)}
                className="group hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
              >
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex items-center justify-center shrink-0">
                      <Smartphone className="text-blue-500 dark:text-blue-400" size={20} />
                    </div>
                    <div>
                      <div className="font-medium text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {displayName}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-500 mt-0.5 sm:hidden">
                        {device.platform_type} • {mappedModelName}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 hidden sm:table-cell">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <ShieldCheck size={16} className="text-slate-400" />
                    {device.platform_type || 'Unknown'}
                  </div>
                </td>
                <td className="px-6 py-4 hidden md:table-cell">
                  <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <User size={16} className="text-slate-400" />
                    <span className="truncate max-w-[120px] lg:max-w-[160px]" title={device.user?.user_name || device.user?.user_email || 'Unassigned'}>
                      {device.user?.user_name || device.user?.user_email || 'Unassigned'}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 hidden lg:table-cell">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 dark:bg-white/5 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                    v{device.os_version || 'N/A'}
                  </span>
                </td>
                <td className="px-6 py-4 hidden xl:table-cell">
                  <div className="flex items-center gap-2 text-sm font-mono text-slate-500 dark:text-slate-400">
                    <Hash size={14} />
                    {device.serial_number || 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeviceSelect(device);
                    }}
                    className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-slate-50 dark:bg-white/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors inline-flex"
                  >
                    <ChevronRight size={18} />
                  </button>
                </td>
              </tr>
              );
            })}
            {filteredDevices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-transparent">
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <Search size={32} className="opacity-50" />
                    <p>No devices found matching your criteria.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
