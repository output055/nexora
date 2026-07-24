'use client';

import { useState, useEffect } from 'react';
import { Send, Users, AlertTriangle, Smartphone, User } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { sendBroadcastSMS, getCustomersForSelect } from '@/app/actions/broadcasts';

type Customer = {
  id: string;
  full_name: string;
  phone: string;
};

const MESSAGE_TEMPLATES = [
  { label: 'Friendly Check-in', content: 'Hi {customer_name}, hope you are enjoying your new device from Credifon! Let us know if you need any help.' },
  { label: 'Payment Reminder', content: 'Hello {customer_name}, this is a gentle reminder that your payment of GHS {amount_due} is coming up soon. Thank you!' },
  { label: 'Overdue Warning', content: 'URGENT: {customer_name}, your account is overdue. Please pay GHS {amount_due} immediately to avoid device lock.' },
  { label: 'Device Locked', content: 'Notice: {customer_name}, your device has been locked due to non-payment. Kindly settle your balance to regain access.' },
  { label: 'Payment Thanks', content: 'Thank you {customer_name} for your recent payment. We appreciate your promptness!' },
];

export default function BroadcastsPage() {
  const [message, setMessage] = useState('');
  const [targetGroup, setTargetGroup] = useState('all');
  const [isSending, setIsSending] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  const charCount = message.length;
  const numPages = Math.ceil(charCount / 160) || 1;

  useEffect(() => {
    // Fetch customers for the dropdown
    const fetchCustomers = async () => {
      const { data, success } = await getCustomersForSelect();
      if (success && data) {
        setCustomers(data);
        if (data.length > 0) {
          setSelectedCustomerId(data[0].id);
        }
      }
    };
    fetchCustomers();
  }, []);

  const handleSend = async () => {
    if (!message) return toast.error('Please enter a message');
    if (targetGroup === 'individual' && !selectedCustomerId) return toast.error('Please select a customer');
    
    setIsSending(true);
    
    const result = await sendBroadcastSMS(targetGroup, message, targetGroup === 'individual' ? selectedCustomerId : undefined);
    
    if (result.success) {
      toast.success(`Message sent to ${result.count} out of ${result.total} customers!`);
      setMessage('');
    } else {
      toast.error(result.error || 'Failed to send broadcast');
    }
    
    setIsSending(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">SMS Broadcast Hub</h1>
        <p className="text-slate-400">Compose and send messages to specific customer segments or individuals.</p>
      </div>

      <div className="bg-[#1E293B] border border-white/10 rounded-2xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Compose Message</h2>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Target Audience</label>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <label className={`flex flex-col p-4 border rounded-xl cursor-pointer transition-colors ${targetGroup === 'all' ? 'bg-blue-500/10 border-blue-500/50' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
                <input type="radio" name="target" value="all" className="sr-only" checked={targetGroup === 'all'} onChange={(e) => setTargetGroup(e.target.value)} />
                <Users size={20} className={`mb-2 ${targetGroup === 'all' ? 'text-blue-400' : 'text-slate-400'}`} />
                <span className={`text-sm font-medium ${targetGroup === 'all' ? 'text-white' : 'text-slate-300'}`}>All Customers</span>
              </label>

              <label className={`flex flex-col p-4 border rounded-xl cursor-pointer transition-colors ${targetGroup === 'overdue' ? 'bg-red-500/10 border-red-500/50' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
                <input type="radio" name="target" value="overdue" className="sr-only" checked={targetGroup === 'overdue'} onChange={(e) => setTargetGroup(e.target.value)} />
                <AlertTriangle size={20} className={`mb-2 ${targetGroup === 'overdue' ? 'text-red-400' : 'text-slate-400'}`} />
                <span className={`text-sm font-medium ${targetGroup === 'overdue' ? 'text-white' : 'text-slate-300'}`}>Overdue Balances</span>
              </label>

              <label className={`flex flex-col p-4 border rounded-xl cursor-pointer transition-colors ${targetGroup === 'locked' ? 'bg-amber-500/10 border-amber-500/50' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
                <input type="radio" name="target" value="locked" className="sr-only" checked={targetGroup === 'locked'} onChange={(e) => setTargetGroup(e.target.value)} />
                <Smartphone size={20} className={`mb-2 ${targetGroup === 'locked' ? 'text-amber-400' : 'text-slate-400'}`} />
                <span className={`text-sm font-medium ${targetGroup === 'locked' ? 'text-white' : 'text-slate-300'}`}>Locked Devices</span>
              </label>

              <label className={`flex flex-col p-4 border rounded-xl cursor-pointer transition-colors ${targetGroup === 'individual' ? 'bg-emerald-500/10 border-emerald-500/50' : 'bg-white/5 border-white/10 hover:border-white/20'}`}>
                <input type="radio" name="target" value="individual" className="sr-only" checked={targetGroup === 'individual'} onChange={(e) => setTargetGroup(e.target.value)} />
                <User size={20} className={`mb-2 ${targetGroup === 'individual' ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span className={`text-sm font-medium ${targetGroup === 'individual' ? 'text-white' : 'text-slate-300'}`}>Individual</span>
              </label>
            </div>
          </div>

          {targetGroup === 'individual' && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-200">
              <label className="block text-sm font-medium text-slate-300 mb-1">Select Customer</label>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-all"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.full_name} ({c.phone})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <div className="flex justify-between items-end mb-3">
              <label className="block text-sm font-medium text-slate-300">Message Content</label>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-3">
              {MESSAGE_TEMPLATES.map((template, idx) => (
                <button
                  key={idx}
                  onClick={() => setMessage(template.content)}
                  className="px-3 py-1.5 bg-white/5 hover:bg-blue-500/20 border border-white/10 hover:border-blue-500/50 rounded-full text-xs font-medium text-slate-300 hover:text-blue-300 transition-colors"
                >
                  {template.label}
                </button>
              ))}
            </div>

            <textarea
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message here..."
              className="w-full bg-[#0B1120] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all resize-none"
            />
            <div className="flex justify-between items-center mt-2 text-xs text-slate-400">
              <span>Variables: {`{customer_name}`}, {`{amount_due}`}</span>
              <span className={charCount > 160 ? 'text-amber-400' : ''}>
                {charCount} chars | {numPages} SMS
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
          <button
            onClick={handleSend}
            disabled={isSending || !message}
            className="bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl text-sm font-medium transition-colors flex items-center gap-2"
          >
            {isSending ? (
              <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <Send size={16} />
            )}
            {isSending ? 'Sending Broadcast...' : 'Send Broadcast'}
          </button>
        </div>
      </div>
    </div>
  );
}
