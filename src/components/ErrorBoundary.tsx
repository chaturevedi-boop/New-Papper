import React from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Unhandled error in Daily News Service:', error, info.componentStack);
  }

  handleReload = () => {
    this.setState({ error: null });
    window.location.reload();
  };

  handleResetData = () => {
    localStorage.removeItem('newspaper_billing_state');
    window.location.reload();
  };

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-lg p-6 space-y-4 text-center">
          <div className="h-12 w-12 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 uppercase tracking-tight">Something went wrong</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
              The app hit an unexpected error and couldn't continue rendering. You can try reloading, or reset the
              stored data if the problem persists.
            </p>
          </div>
          <p className="text-[10px] font-mono text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-950/50 rounded-lg p-2.5 text-left break-words">
            {this.state.error.message}
          </p>
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={this.handleReload}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RefreshCw size={14} /> Reload App
            </button>
            <button
              onClick={this.handleResetData}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-950/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Trash2 size={14} /> Reset Data
            </button>
          </div>
        </div>
      </div>
    );
  }
}
