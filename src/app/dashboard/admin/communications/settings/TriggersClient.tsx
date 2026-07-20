'use client';

import { useState } from 'react';
import { Switch } from '@headlessui/react';
import { Save, MessageSquare, Plus, Trash2, Calendar, Bolt } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createTrigger, updateTrigger, deleteTrigger } from '@/app/actions/triggers';

type Trigger = {
  id?: string;
  name: string;
  trigger_type: string;
  event_key?: string;
  trigger_date?: string;
  message_template: string;
  is_active: boolean;
};

export default function TriggersClient({ initialTriggers }: { initialTriggers: Trigger[] }) {
  const [triggers, setTriggers] = useState<Trigger[]>(initialTriggers);
  const [isSaving, setIsSaving] = useState(false);
  
  // State for new trigger modal
  const [showNewForm, setShowNewForm] = useState(false);
  const [newTrigger, setNewTrigger] = useState<Trigger>({
    name: '',
    trigger_type: 'date_based',
    message_template: '',
    is_active: true,
  });

  const handleUpdate = (index: number, field: keyof Trigger, value: any) => {
    const updated = [...triggers];
    updated[index] = { ...updated[index], [field]: value };
    setTriggers(updated);
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    let successCount = 0;
    
    for (const t of triggers) {
      if (t.id) {
        const res = await updateTrigger(t.id, t);
        if (res.success) successCount++;
      }
    }
    
    setIsSaving(false);
    toast.success(`Saved ${successCount} triggers successfully!`);
  };

  const handleCreateNew = async () => {
    if (!newTrigger.name || !newTrigger.message_template) {
      return toast.error('Please fill in name and message template');
    }
    
    setIsSaving(true);
    const res = await createTrigger(newTrigger);
    
    if (res.success) {
      toast.success('Trigger created!');
      setShowNewForm(false);
      // Optimistic update - a real app might reload to get the ID, but for now we'll just wait for the server action's revalidatePath to refresh the page naturally.
      // We can also just refresh the page.
      window.location.reload();
    } else {
      toast.error(res.error || 'Failed to create');
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this trigger?')) return;
    const res = await deleteTrigger(id);
    if (res.success) {
      toast.success('Deleted trigger');
      setTriggers(triggers.filter(t => t.id !== id));
    } else {
      toast.error(res.error || 'Failed to delete');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Automated Triggers</h1>
          <p className="text-slate-400">Manage automated SMS messages sent to customers during lifecycle events and holidays.</p>
        </div>
        <button
          onClick={() => setShowNewForm(true)}
          className="bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 px-4 py-2 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 border border-emerald-500/20"
        >
          <Plus size={16} />
          New Trigger
        </button>
      </div>

      {showNewForm && (
        <div className="bg-[#1E293B] border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative animate-in fade-in slide-in-from-top-4">
          <h2 className="text-lg font-semibold text-white mb-4">Create New Trigger</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Trigger Name</label>
                <input 
                  type="text" 
                  value={newTrigger.name}
                  onChange={(e) => setNewTrigger({ ...newTrigger, name: e.target.value })}
                  placeholder="e.g. Christmas Promo"
                  className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Trigger Type</label>
                <select 
                  value={newTrigger.trigger_type}
                  onChange={(e) => setNewTrigger({ ...newTrigger, trigger_type: e.target.value })}
                  className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 transition-colors"
                >
                  <option value="date_based">Date Based (e.g. Holidays)</option>
                  <option value="system_event">System Event</option>
                </select>
              </div>
            </div>

            {newTrigger.trigger_type === 'date_based' ? (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Trigger Date</label>
                <input 
                  type="date" 
                  value={newTrigger.trigger_date || ''}
                  onChange={(e) => setNewTrigger({ ...newTrigger, trigger_date: e.target.value })}
                  className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 transition-colors"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Event Key</label>
                <input 
                  type="text" 
                  value={newTrigger.event_key || ''}
                  onChange={(e) => setNewTrigger({ ...newTrigger, event_key: e.target.value })}
                  placeholder="e.g. custom_event"
                  className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-emerald-500 transition-colors"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Message Template</label>
              <textarea
                rows={3}
                value={newTrigger.message_template}
                onChange={(e) => setNewTrigger({ ...newTrigger, message_template: e.target.value })}
                placeholder="Type the automated SMS text here..."
                className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-emerald-500 transition-colors"
              />
            </div>
            
            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setShowNewForm(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateNew}
                disabled={isSaving}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-xl text-sm font-medium transition-colors"
              >
                {isSaving ? 'Creating...' : 'Create Trigger'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {triggers.length === 0 ? (
          <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-12 text-center text-slate-400">
            No automated triggers configured.
          </div>
        ) : (
          triggers.map((trigger, index) => (
            <div key={trigger.id || index} className="bg-[#1E293B] border border-white/10 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${trigger.trigger_type === 'date_based' ? 'bg-purple-500/10' : 'bg-blue-500/10'}`}>
                    {trigger.trigger_type === 'date_based' ? (
                      <Calendar size={20} className="text-purple-400" />
                    ) : (
                      <Bolt size={20} className="text-blue-400" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-medium flex items-center gap-2">
                      {trigger.name}
                      {trigger.trigger_type === 'date_based' && trigger.trigger_date && (
                         <span className="text-xs bg-white/10 px-2 py-0.5 rounded-md text-slate-300">
                           {trigger.trigger_date}
                         </span>
                      )}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1 uppercase tracking-wider text-[10px] font-bold">
                      {trigger.trigger_type === 'system_event' ? `Event: ${trigger.event_key}` : 'Scheduled Event'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {trigger.id && (
                    <button 
                      onClick={() => handleDelete(trigger.id!)}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                      title="Delete trigger"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                  <Switch
                    checked={trigger.is_active}
                    onChange={(v) => handleUpdate(index, 'is_active', v)}
                    className={`${
                      trigger.is_active ? 'bg-blue-500' : 'bg-slate-600'
                    } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
                  >
                    <span
                      className={`${
                        trigger.is_active ? 'translate-x-6' : 'translate-x-1'
                      } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                  </Switch>
                </div>
              </div>
              <div className="pl-13 mt-4">
                <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wider">SMS Template</label>
                <textarea
                  rows={3}
                  disabled={!trigger.is_active}
                  value={trigger.message_template}
                  onChange={(e) => handleUpdate(index, 'message_template', e.target.value)}
                  className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 transition-colors disabled:opacity-50"
                />
              </div>
            </div>
          ))
        )}
      </div>

      {triggers.length > 0 && (
        <div className="flex justify-end pt-4 sticky bottom-6 z-10">
          <div className="bg-[#1E293B] border border-white/10 p-4 rounded-2xl shadow-2xl flex items-center gap-4">
            <span className="text-sm text-slate-400">Unsaved changes will be lost</span>
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Save size={16} />
              {isSaving ? 'Saving...' : 'Save All Configurations'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
