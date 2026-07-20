'use client';

import { LifeBuoy, Phone, Mail, FileText, ChevronRight } from 'lucide-react';

export default function CustomerSupport() {
  const faqs = [
    {
      question: 'How do I make a payment?',
      answer: 'You can make a payment directly from your dashboard using Paystack (Mobile Money or Card), or by visiting one of our field agents and paying in cash.',
    },
    {
      question: 'What happens if I miss a payment?',
      answer: 'If you miss a scheduled installment, your device will be automatically locked. Making your required payment will unlock the device over the air within a few minutes.',
    },
    {
      question: 'Can I pay off my device early?',
      answer: 'Yes! You can choose to pay the full remaining balance at any time to permanently unlock your device and conclude your contract.',
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2 flex items-center gap-3">
          <LifeBuoy className="text-blue-400" size={28} />
          Help & Support
        </h1>
        <p className="text-slate-400">
          Need assistance? Our team is here to help you with your device and account.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[#111827] border border-white/5 rounded-3xl p-6 flex items-start gap-4 hover:border-blue-500/30 transition-all cursor-pointer">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 shrink-0">
            <Phone size={24} />
          </div>
          <div>
            <h3 className="font-bold text-white mb-1">Call Support</h3>
            <p className="text-sm text-slate-400 mb-3">Speak directly with a customer service representative.</p>
            <p className="font-mono font-medium text-blue-400">+233 54 000 0000</p>
          </div>
        </div>

        <div className="bg-[#111827] border border-white/5 rounded-3xl p-6 flex items-start gap-4 hover:border-blue-500/30 transition-all cursor-pointer">
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 shrink-0">
            <Mail size={24} />
          </div>
          <div>
            <h3 className="font-bold text-white mb-1">Email Us</h3>
            <p className="text-sm text-slate-400 mb-3">Send us an email and we'll respond within 24 hours.</p>
            <p className="font-medium text-blue-400">support@credifon.app</p>
          </div>
        </div>
      </div>

      <div className="bg-[#111827] border border-white/5 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center gap-2 bg-white/[0.02]">
          <FileText size={18} className="text-slate-400" />
          <h3 className="font-bold text-white">Frequently Asked Questions</h3>
        </div>
        <div className="divide-y divide-white/5">
          {faqs.map((faq, index) => (
            <div key={index} className="p-6">
              <h4 className="font-bold text-white mb-2 text-sm">{faq.question}</h4>
              <p className="text-sm text-slate-400 leading-relaxed">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
