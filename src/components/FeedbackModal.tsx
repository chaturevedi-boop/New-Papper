import React, { useState } from 'react';
import { MessageSquarePlus, X, Bug, Lightbulb, Send, Mail } from 'lucide-react';

// Where feature requests / bug reports get sent. The WhatsApp link reuses the exact same
// plain wa.me pattern (no target="_blank") already proven to work reliably inside the
// Android WebView, covered by the app's existing <queries> manifest declaration. The
// mailto: link needs no such workaround - it's handled by Android's default out-of-scope
// URL handling the same way.
const FEEDBACK_WHATSAPP_NUMBER = '917417170811';
const FEEDBACK_EMAIL = 'chaturevedi@gmail.com';

interface FeedbackModalProps {
  onClose: () => void;
}

type FeedbackType = 'BUG' | 'FEATURE';

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ onClose }) => {
  const [type, setType] = useState<FeedbackType>('FEATURE');
  const [description, setDescription] = useState('');

  const label = type === 'BUG' ? 'Bug Report' : 'Feature Request';

  const buildWhatsAppUrl = () => {
    const emojiLabel = type === 'BUG' ? '🐞 Bug Report' : '💡 Feature Request';
    const message = `${emojiLabel} — PaperTrack App\n\n${description.trim()}`;
    return `https://wa.me/${FEEDBACK_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  };

  const buildMailtoUrl = () => {
    const subject = `${label} — PaperTrack App`;
    return `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(description.trim())}`;
  };

  const canSubmit = description.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-xl w-full max-w-md overflow-hidden border border-slate-100 dark:border-slate-800 animate-fade-in">
        <div className="bg-slate-50 dark:bg-slate-850 px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquarePlus className="text-emerald-500" size={16} />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">Suggest a Feature / Report a Bug</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 p-2.5 rounded-xl transition-colors active:scale-[0.94] cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Choose Email or WhatsApp below — it opens with your message pre-filled, just hit Send there and it reaches the developer directly.
          </p>

          <div>
            <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">Type</label>
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setType('FEATURE')}
                className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all active:scale-[0.97] flex items-center justify-center gap-1.5 ${
                  type === 'FEATURE' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Lightbulb size={15} /> Feature Request
              </button>
              <button
                type="button"
                onClick={() => setType('BUG')}
                className={`flex-1 py-3 rounded-lg text-xs font-bold transition-all active:scale-[0.97] flex items-center justify-center gap-1.5 ${
                  type === 'BUG' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Bug size={15} /> Bug Report
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="feedback-description" className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5">
              {type === 'BUG' ? 'What went wrong? Include what you tapped and what happened.' : 'What would you like added or changed?'}
            </label>
            <textarea
              id="feedback-description"
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === 'BUG' ? 'e.g. Tapping Invoice on Flat 204 shows the wrong amount...' : 'e.g. Add a way to export the agent route sheet as PDF...'}
              className="w-full text-xs px-3.5 py-2.5 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:text-slate-100 resize-none"
            />
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-850 px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-xl px-4 py-3 transition-colors active:scale-[0.96] cursor-pointer"
          >
            Cancel
          </button>
          {canSubmit ? (
            <>
              <a
                href={buildMailtoUrl()}
                onClick={onClose}
                className="bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-bold rounded-xl px-4 py-3 flex items-center gap-1.5 transition-colors active:scale-[0.96] cursor-pointer border border-slate-700"
              >
                <Mail size={16} />
                <span>Send via Email</span>
              </a>
              <a
                href={buildWhatsAppUrl()}
                onClick={onClose}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl px-4 py-3 flex items-center gap-1.5 shadow-sm transition-colors active:scale-[0.96] cursor-pointer"
              >
                <Send size={16} />
                <span>Send via WhatsApp</span>
              </a>
            </>
          ) : (
            <>
              <span className="bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 text-xs font-bold rounded-xl px-4 py-3 flex items-center gap-1.5 cursor-not-allowed">
                <Mail size={16} />
                <span>Send via Email</span>
              </span>
              <span className="bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 text-xs font-bold rounded-xl px-4 py-3 flex items-center gap-1.5 cursor-not-allowed">
                <Send size={16} />
                <span>Send via WhatsApp</span>
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
