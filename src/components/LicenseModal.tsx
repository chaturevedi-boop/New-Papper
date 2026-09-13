import React, { useState } from 'react';
import { ShieldCheck, X, KeyRound, MessageSquarePlus, Mail } from 'lucide-react';
import type { ParsedLicense } from '../utils/licenseKey';
import type { UnlockError } from '../hooks/useTrialLicense';

const CONTACT_WHATSAPP_NUMBER = '917417170811';
const CONTACT_EMAIL = 'chaturevedi@gmail.com';

const DURATION_LABEL: Record<ParsedLicense['duration'], string> = {
  '1Y': '1-Year Plan',
  '5Y': '5-Year Plan',
  LT: 'Lifetime Plan'
};

const ERROR_MESSAGE: Record<UnlockError, string> = {
  malformed: "That doesn't look like a valid license key. Double-check it and try again.",
  signature: "That code isn't valid. Try again or request one below.",
  expired: 'This license key has expired. Request a new one below.'
};

interface LicenseModalProps {
  isExpired: boolean;
  daysRemaining: number;
  license: ParsedLicense | null;
  onUnlock: (code: string) => { success: boolean; error?: UnlockError };
  onClose: () => void;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({ isExpired, daysRemaining, license, onUnlock, onClose }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<UnlockError | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = onUnlock(code);
    if (result.success) {
      onClose();
    } else {
      setError(result.error ?? 'signature');
      setTimeout(() => setError(null), 3000);
    }
  };

  const requestMessage = `Hi, my PaperTrack free trial ${isExpired ? 'has ended' : `has ${daysRemaining} day(s) left`} and I'd like a license key (1 year / 5 years / lifetime).`;
  const whatsAppUrl = `https://wa.me/${CONTACT_WHATSAPP_NUMBER}?text=${encodeURIComponent(requestMessage)}`;
  const mailtoUrl = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent('PaperTrack - License Key Request')}&body=${encodeURIComponent(requestMessage)}`;

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800 animate-fade-in">
        <div className="bg-slate-50 dark:bg-slate-850 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-emerald-500" size={16} />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              {license ? 'License' : isExpired ? 'Trial Ended' : 'Free Trial'}
            </span>
          </div>
          {(!isExpired || license) && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 p-2.5 rounded-xl transition-colors active:scale-[0.94] cursor-pointer"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="p-6 space-y-4">
          {license ? (
            <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/60 rounded-2xl p-4">
              <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Licensed To</p>
              <p className="text-sm font-black text-slate-800 dark:text-slate-100 mt-1">{license.customerName}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {DURATION_LABEL[license.duration]}
                {license.expiry && ` — valid until ${license.expiry.toISOString().slice(0, 10)}`}
              </p>
            </div>
          ) : (
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {isExpired
                ? 'Your 15-day free trial has ended. Adding, editing, or deleting data is now paused - viewing, invoices, and backups still work. Enter a license key to continue, or request one below.'
                : `You have ${daysRemaining} day${daysRemaining === 1 ? '' : 's'} left in your free trial. Enter a license key any time to remove the trial limit early.`}
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label htmlFor="unlock-code" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                {license ? 'Replace License Key' : 'License Key'}
              </label>
              <input
                id="unlock-code"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. DNS-1Y-20260913-YOUR_NAME-XXXXXXXX"
                className={`w-full text-sm px-4 py-3 border rounded-xl focus:outline-none focus:ring-1 dark:text-slate-100 ${
                  error
                    ? 'border-rose-300 bg-rose-50 dark:bg-rose-950/20 focus:ring-rose-500'
                    : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 focus:ring-emerald-500'
                }`}
              />
              {error && <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold mt-1.5">{ERROR_MESSAGE[error]}</p>}
            </div>
            <button
              type="submit"
              disabled={!code.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors active:scale-[0.97] cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <KeyRound size={16} />
              <span>Unlock</span>
            </button>
          </form>
        </div>

        <div className="bg-slate-50 dark:bg-slate-850 px-6 py-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
          <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Need a key?</p>
          <div className="flex flex-wrap gap-2">
            <a
              href={mailtoUrl}
              className="flex-1 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-bold rounded-xl px-4 py-3 flex items-center justify-center gap-1.5 transition-colors active:scale-[0.96] cursor-pointer border border-slate-700"
            >
              <Mail size={16} />
              <span>Email</span>
            </a>
            <a
              href={whatsAppUrl}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl px-4 py-3 flex items-center justify-center gap-1.5 shadow-sm transition-colors active:scale-[0.96] cursor-pointer"
            >
              <MessageSquarePlus size={16} />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
