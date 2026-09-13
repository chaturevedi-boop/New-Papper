import React from 'react';
import { HelpCircle, Bug, Sparkles, Wrench, ClipboardCheck, Info, CheckCircle2 } from 'lucide-react';

interface SectionProps {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ icon: Icon, title, children }) => (
  <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm p-5 sm:p-6 space-y-4">
    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
      <Icon className="text-emerald-500 shrink-0" size={18} />
      {title}
    </h3>
    {children}
  </div>
);

const SubHeading: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{children}</h4>
);

const Item: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <li className="flex gap-2.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
    <span className="text-emerald-500 mt-0.5 shrink-0">●</span>
    <span>
      <strong className="text-slate-800 dark:text-slate-200">{label}</strong>
      {children}
    </span>
  </li>
);

export const HelpTab: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Title Card */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase mb-3">
            <HelpCircle size={12} /> Help & Project Summary
          </div>
          <h3 className="text-xl font-black tracking-tight">Daily News Service — Development & QA Summary</h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Newspaper Delivery &amp; Billing Suite for managing routes, subscriptions, and monthly billing across a
            four-tier location hierarchy (Area → Building → Wing → Flat). This tab is the in-app record of what was
            fixed, what was added, and how it was verified.
          </p>
        </div>
        <div className="absolute top-0 right-0 opacity-10 translate-x-12 -translate-y-12">
          <HelpCircle size={250} />
        </div>
      </div>

      {/* 1. Bugs Fixed */}
      <Section icon={Bug} title="1. Bugs Found and Fixed">
        <div className="space-y-4">
          <div className="space-y-2">
            <SubHeading>Core Application Logic</SubHeading>
            <ul className="space-y-2 pt-1">
              <Item label="Payment override silently did nothing: ">
                the payment-toggle override was written to a separate, discarded computation and never actually applied.
              </Item>
              <Item label="Runtime crash on payment confirmation: ">
                Billing Engine crashed with a ReferenceError (an icon used but not imported).
              </Item>
              <Item label="State-mutation bug in cascade delete: ">
                deleting a newspaper mutated the previous React state object in place instead of creating a new one.
              </Item>
              <Item label="Off-by-one-day bug in bulk delivery updates: ">
                “Vacation Mode” used a timezone conversion that silently shifted every date by a day, dropping the range's end date.
              </Item>
              <Item label="Invalid phone numbers in seed data: ">
                generated 9-digit numbers instead of 10 — an invalid format that broke WhatsApp's ability to resolve a chat.
              </Item>
              <Item label="Missing edit capability: ">
                no “Update” existed for any master record — only Add and Delete.
              </Item>
            </ul>
          </div>

          <div className="space-y-2">
            <SubHeading>Mobile (Android / Capacitor) Specific</SubHeading>
            <ul className="space-y-2 pt-1">
              <Item label="WhatsApp share did not open WhatsApp: ">
                links used target="_blank", which Android's embedded WebView silently swallows.
              </Item>
              <Item label="File downloads silently failed: ">
                PDF/CSV/backup downloads used a plain blob-click, a no-op inside an Android WebView.
              </Item>
              <Item label="Print button did nothing: ">
                window.print() has no effect inside a WebView without native PrintManager code.
              </Item>
              <Item label="Fake share flow discovered: ">
                the original flow was largely UI theater — a “simulated” share sheet and PDF dispatch screen that performed no real action.
              </Item>
              <Item label="Missing Android package-visibility declaration: ">
                the manifest had no &lt;queries&gt; element, so Android 11+ hid all other apps from intent resolution, independently breaking sharing.
              </Item>
              <Item label="WebView lacked Web Share API support entirely: ">
                confirmed via on-device log analysis — a first JS-only fix silently fell back to the still-broken legacy path.
              </Item>
              <Item label="PDF export was not a real PDF: ">
                “downloaded” PDFs were plain-text files renamed with a .pdf-looking name.
              </Item>
              <Item label="Two bugs in the real PDF generator: ">
                the ₹ symbol rendered as garbled text (missing font glyph), and a typo'd arrow character silently blanked the customer's address.
              </Item>
              <Item label="Generic placeholder app icon: ">
                used the default Capacitor/Android-Studio scaffold icon instead of a branded one; a follow-up fix also corrected the icon bleeding outside the safe zone and getting clipped by circular launcher masks.
              </Item>
            </ul>
          </div>
        </div>
      </Section>

      {/* 2. Features Implemented */}
      <Section icon={Sparkles} title="2. Features Implemented">
        <div className="space-y-4">
          <div className="space-y-2">
            <SubHeading>Application Features</SubHeading>
            <ul className="space-y-2 pt-1">
              <Item label="Edit / Update records: ">full edit capability for Areas, Buildings, Wings, Flats, Papers, and Agents.</Item>
              <Item label="Real month/year navigation: ">a full 12-month selector, year selector, and prev/next buttons.</Item>
              <Item label="Vacation Mode: ">bulk mark a date range as Delivered/Skipped in one action.</Item>
              <Item label="Agent Route Sheet: ">a printable/shareable daily delivery list per agent.</Item>
              <Item label="Bulk payment reminders: ">a one-click list of unpaid customers with pre-filled WhatsApp reminders.</Item>
              <Item label="Data backup & restore: ">export/restore the entire app state as a JSON file.</Item>
              <Item label="Search across Master Ledgers: ">live search/filter on every master-data tab.</Item>
              <Item label="Manual theme toggle: ">Light / Dark / System cycle, persisted across sessions.</Item>
              <Item label="Fixed-height, scrollable invoice table: ">scrolls within a fixed height with a sticky header.</Item>
              <Item label="In-app feedback: ">a Suggest a Feature / Report a Bug form that sends via Email or WhatsApp.</Item>
            </ul>
          </div>
          <div className="space-y-2">
            <SubHeading>Mobile / Native Features</SubHeading>
            <ul className="space-y-2 pt-1">
              <Item label="Real native sharing: ">@capacitor/share + @capacitor/filesystem work regardless of the device WebView's own capabilities.</Item>
              <Item label="Real PDF generation: ">a genuine, properly formatted A4 invoice PDF (via jsPDF).</Item>
              <Item label="In-app Print Preview: ">a dedicated preview screen with a Download PDF action inside it.</Item>
              <Item label="Branded app icon: ">a custom newspaper icon matching the in-app logo, correctly fitted to the adaptive-icon safe zone.</Item>
              <Item label="Manifest package-visibility fix: ">declared &lt;queries&gt; so WhatsApp and the native share sheet resolve correctly on Android 11+.</Item>
            </ul>
          </div>
        </div>
      </Section>

      {/* 3. Code Quality */}
      <Section icon={Wrench} title="3. Code Quality & Maintainability">
        <ul className="space-y-2">
          <Item label="">Removed all unused imports and dead code, surfaced via strict TypeScript settings.</Item>
          <Item label="">Added a top-level Error Boundary with a Reload / Reset Data recovery screen.</Item>
          <Item label="">Installed correct @types/react packages after finding the project relied on loose inferred typing.</Item>
          <Item label="">Indexed delivery-log lookups and memoized dashboard calculations for performance.</Item>
          <Item label="">Removed unused dependencies left over from the initial project scaffold.</Item>
          <Item label="">Consolidated duplicated modal markup and added accessible label/input associations.</Item>
        </ul>
      </Section>

      {/* 4. Testing */}
      <Section icon={ClipboardCheck} title="4. Testing & Verification">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Two automated end-to-end passes were run against the web build using a headless-browser test harness, in
          addition to manual testing on a physical Android device.
        </p>

        <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="bg-emerald-50 dark:bg-emerald-950/20 px-4 py-2.5 flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 size={14} /> General Workflow Pass — 28 / 28 checks passed
          </div>
          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {[
                ['Dashboard', 'Stats cards and 6-month revenue chart render correctly.'],
                ['Smart Drops', 'Cascaded filters, delivery toggle, vacation-mode bulk skip, route sheet.'],
                ['Billing Engine', 'Scroll, search, payment toggle, invoice, print preview, PDF, CSV, reminders.'],
                ['Master Ledgers', 'Add / Edit / Delete, search filter, form pre-fill on edit.'],
                ['Theme & navigation', 'Dark mode toggle and month navigation both change state correctly.'],
              ].map(([label, detail]) => (
                <tr key={label}>
                  <td className="py-2.5 px-4 font-bold text-slate-800 dark:text-slate-200 whitespace-nowrap align-top">{label}</td>
                  <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400">{detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="bg-emerald-50 dark:bg-emerald-950/20 px-4 py-2.5 flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 size={14} /> Full Customer Journey Pass — 25 / 25 checks passed
          </div>
          <div className="p-4 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Verified the app's core real-world purpose end to end: created a brand-new Area → Building → Wing →
            Customer with a subscription, marked one delivery day Skipped, and confirmed the exact billing math
            (30-day month, ₹10/day rate, 1 skip → Gross ₹300.00, Deduction ₹10.00, <strong>Net ₹290.00</strong>) in
            both the billing table and the invoice. Then deleted the Area and confirmed the cascade correctly wiped
            the Building/Wing/Flat, left the Agent unassigned rather than deleted, and left the Paper untouched.
          </div>
        </div>

        <p className="text-[11px] text-slate-400 dark:text-slate-500 font-semibold">
          Zero console errors were recorded across both automated passes.
        </p>
      </Section>

      {/* 5. Notes */}
      <Section icon={Info} title="5. Notes & Possible Follow-Ups">
        <ul className="space-y-2">
          <Item label="">The production bundle is large mainly due to the PDF library; code-splitting would reduce initial load if ever needed.</Item>
          <Item label="">Some build-tooling dependencies (unrelated to runtime app code) report known vulnerabilities per npm audit.</Item>
          <Item label="">Feedback sent via WhatsApp/Email only reaches you if the sender actually taps Send — nothing is captured otherwise.</Item>
        </ul>
      </Section>
    </div>
  );
};
