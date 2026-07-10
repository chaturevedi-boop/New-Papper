import React, { useState, useMemo } from 'react';
import { kotlinCodeBase, CodeFile } from '../data/kotlinCode';
import { 
  Code, 
  Copy, 
  Check, 
  Search, 
  Smartphone, 
  Info,
  Server,
  FileCode,
  ArrowRight
} from 'lucide-react';

export const ArchitectHub: React.FC = () => {
  const [activeFileIdx, setActiveFileIdx] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const activeFile = kotlinCodeBase[activeFileIdx];

  const handleCopy = () => {
    navigator.clipboard.writeText(activeFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple Kotlin syntax highlighter simulator for premium visual style
  const highlightedCode = useMemo(() => {
    if (!activeFile) return '';
    const code = activeFile.content;
    
    // If search is empty, return raw text or simplified styles
    // Since we are displaying code inside a <pre> element, we can escape HTML.
    return code;
  }, [activeFile]);

  // Filter files by search in content or title
  const filteredFiles = useMemo(() => {
    if (!searchQuery) return kotlinCodeBase;
    return kotlinCodeBase.filter(f => 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      f.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  return (
    <div className="space-y-6">
      {/* Introduction Header Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-sm relative overflow-hidden">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase mb-3">
            <Smartphone size={12} /> Android Architect Blueprint
          </div>
          <h3 className="text-xl font-black tracking-tight">Android Kotlin & Jetpack Compose Codebase</h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Review the real, production-grade Kotlin architecture matching our exact browser database.
            Includes SQLite Room schemas with foreign key cascades, dynamic cascaded drop-list DAOs, 
            Material Design 3 Compose interfaces, A4 <code>PdfDocument</code> drawing services, and system WhatsApp Share sheet Intents.
          </p>
        </div>
        <div className="absolute top-0 right-0 opacity-10 translate-x-12 -translate-y-12">
          <Code size={250} />
        </div>
      </div>

      {/* Interactive APK Compilation Guide Card */}
      <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl p-5 sm:p-6" id="apk-compilation-guide">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-emerald-500 text-white rounded-xl shadow-md shrink-0">
            <Smartphone size={20} />
          </div>
          <div className="space-y-4 w-full">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">Local APK Generation Guide (Capacitor)</h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Follow these simple steps to compile the fully functional Android application package (.apk) on your local computer using the pre-configured Capacitor files.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-150 dark:border-slate-800 space-y-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">1</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">1. Export and Setup</p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-normal">
                  Go to the <strong>Settings Menu</strong> at the top right of this editor, click <strong>Export ZIP</strong>, and unzip the project on your local machine.
                </p>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-150 dark:border-slate-800 space-y-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">2</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">2. Prepare Android Files</p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-normal">
                  Open terminal inside the project directory and run:
                </p>
                <div className="bg-slate-950 p-2 rounded-lg text-[10px] text-emerald-400 font-mono select-all">
                  npm install<br/>
                  npm run build<br/>
                  npx cap add android
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-150 dark:border-slate-800 space-y-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold">3</span>
                <p className="font-bold text-slate-800 dark:text-slate-200">3. Compile the APK</p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-normal">
                  Sync your changes and open in Android Studio to build your debug/release APK:
                </p>
                <div className="bg-slate-950 p-2 rounded-lg text-[10px] text-emerald-400 font-mono select-all">
                  npx cap sync<br/>
                  npx cap open android
                </div>
              </div>
            </div>
            
            <div className="bg-white/50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200/40 dark:border-slate-800/40 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between gap-4">
              <span>💡 <strong>Tip:</strong> Inside Android Studio, simply select <strong>Build &gt; Build Bundle(s) / APK(s) &gt; Build APK(s)</strong>. Your APK will compile and pop up immediately!</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Source File Tree Explorer */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 rounded-2xl shadow-sm space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={13} />
              <input
                type="text"
                placeholder="Search Kotlin code..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-100 text-xs rounded-xl border border-slate-200 dark:border-slate-700 focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-1">Android Project files</h4>
              {filteredFiles.map((file) => {
                const globalIdx = kotlinCodeBase.findIndex(f => f.name === file.name);
                const isActive = activeFileIdx === globalIdx;
                return (
                  <button
                    key={file.name}
                    onClick={() => {
                      setActiveFileIdx(globalIdx);
                      setCopied(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex flex-col transition-all ${
                      isActive 
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shadow-sm' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 font-bold">
                      <FileCode size={13} className={isActive ? 'text-emerald-500' : 'text-slate-400'} />
                      <span>{file.name}</span>
                    </div>
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-normal mt-0.5 truncate w-full">
                      {file.category}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Architecture Details */}
          <div className="bg-slate-50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-150 dark:border-slate-800 space-y-3">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Info size={11} className="text-emerald-500" /> Key Architect Pillars
            </h4>
            <div className="space-y-2 text-[11px] text-slate-600 dark:text-slate-400 leading-normal">
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-500 mt-0.5">✔</span>
                <p><strong>Cascaded Delete Integrity:</strong> Deleting an Area automatically wipes buildings, wings, flats, and subscriptions inside SQLite, preventing dangling references.</p>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-500 mt-0.5">✔</span>
                <p><strong>Ergonomic M3 Gestures:</strong> Touch targets on delivery lists exceed 48dp for sleepy early morning drop runs.</p>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-500 mt-0.5">✔</span>
                <p><strong>Postscript Canvas Rendering:</strong> Android PDF services map composable dimensions cleanly onto exact A4 points (595x842 pts).</p>
              </div>
            </div>
          </div>
        </div>

        {/* Dynamic Code Viewer Frame */}
        <div className="lg:col-span-3 bg-slate-950 rounded-2xl border border-slate-900 shadow-lg overflow-hidden flex flex-col min-h-[500px]">
          {/* File description header */}
          <div className="bg-slate-900 px-5 py-3.5 border-b border-slate-950 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold font-mono text-emerald-400">{activeFile.name}</span>
                <span className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded uppercase font-bold tracking-wider">
                  {activeFile.category}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">{activeFile.description}</p>
            </div>

            <button
              onClick={handleCopy}
              className="bg-slate-800 hover:bg-slate-750 active:bg-slate-700 text-slate-200 hover:text-white px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-emerald-400 animate-bounce" />
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={13} />
                  <span>Copy Source</span>
                </>
              )}
            </button>
          </div>

          {/* Code pre box */}
          <div className="p-5 flex-1 overflow-auto max-h-[550px] font-mono text-xs text-slate-300 leading-relaxed selection:bg-emerald-500/20 select-text">
            <pre className="whitespace-pre">
              <code>{highlightedCode}</code>
            </pre>
          </div>

          {/* IDE-like status bar */}
          <div className="bg-slate-900 px-5 py-2 border-t border-slate-950 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Language: Kotlin/Jetpack Compose</span>
            <span>UTF-8 • Room 2.6.1 • Android Studio Koala</span>
          </div>
        </div>
      </div>
    </div>
  );
};
