'use client';

import { motion } from 'framer-motion';
import { Smartphone, ShieldCheck, Cpu, Hash, Clock, Battery, Wifi, Activity, Phone } from 'lucide-react';
import { getHumanReadableDeviceName } from '@/lib/deviceMapping';

interface SummaryTabProps {
  device: any;
}

export function SummaryTab({ device }: SummaryTabProps) {
  const summaryCards = [
    { label: 'Platform', value: device.platform_type || 'Unknown', icon: <ShieldCheck size={20} /> },
    { label: 'OS Version', value: `v${device.os_version}` || 'N/A', icon: <Activity size={20} /> },
    { label: 'Model', value: device.model || 'Unknown', icon: <Cpu size={20} /> },
    { label: 'Serial Number', value: device.serial_number || 'N/A', icon: <Hash size={20} /> },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, idx) => (
          <div key={idx} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col justify-between hover:bg-white/[0.07] transition-colors relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all" />
            <div className="text-blue-400 mb-4 bg-blue-500/10 w-max p-2.5 rounded-xl border border-blue-500/20">
              {card.icon}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-400 mb-1">{card.label}</p>
              <p className="text-lg font-semibold text-slate-100">{card.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="text-lg font-medium text-white mb-4">Device Status</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <span className="text-slate-400 flex items-center gap-2"><Smartphone size={16}/> Device Name</span>
              <span className="text-slate-200 font-medium">
                {getHumanReadableDeviceName(device.product_name) || getHumanReadableDeviceName(device.model_name) || getHumanReadableDeviceName(device.model) || device.product_name || device.model_name || device.model || device.device_name || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <span className="text-slate-400 flex items-center gap-2"><Clock size={16}/> Enrollment Status</span>
              <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Managed
              </span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <span className="text-slate-400 flex items-center gap-2"><Battery size={16}/> Battery Level</span>
              <span className="text-slate-200 font-medium">{device.battery_level ? `${device.battery_level}%` : 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <span className="text-slate-400 flex items-center gap-2"><Wifi size={16}/> Network</span>
              <span className="text-slate-200 font-medium">{device.cellular_technology || 'Wi-Fi'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-2"><Phone size={16}/> Phone Number</span>
              <span className="text-slate-200 font-medium">
                {device.phone_number || device.network_info?.phone_number || device.sims?.[0]?.phone_number || 'N/A'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
          <h3 className="text-lg font-medium text-white mb-4">Management Info</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <span className="text-slate-400">Device ID</span>
              <span className="text-slate-200 font-mono text-sm">{device.device_id}</span>
            </div>
            <div className="flex justify-between items-center pb-4 border-b border-white/5">
              <span className="text-slate-400">Added On</span>
              <span className="text-slate-200 text-sm">
                {(device.added_time || device.registered_time || device.enrolled_time || device.managed_status_time) 
                  ? new Date(Number(device.added_time || device.registered_time || device.enrolled_time || device.managed_status_time)).toLocaleDateString() 
                  : 'Unknown'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Ownership</span>
              <span className="text-slate-200 text-sm">{device.owned_by || 'Corporate'}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
