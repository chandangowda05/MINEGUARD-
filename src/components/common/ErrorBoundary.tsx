import React, { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[MINEGUARD] Uncaught UI error:', error, errorInfo);
  }

  handleReload = () => {
    localStorage.removeItem('mineguard_demo_mode');
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0a101f] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-[#111c35] border border-red-500/30 rounded-xl p-6 text-center space-y-4 shadow-2xl">
            <div className="h-12 w-12 rounded-full bg-red-500/10 text-red-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-white">Dashboard Encountered an Issue</h2>
            <p className="text-xs text-slate-400">
              {this.state.error?.message || 'An unexpected rendering error occurred while loading telemetry data.'}
            </p>
            <button
              onClick={this.handleReload}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 hover:bg-blue-500 px-5 py-2.5 text-xs font-bold text-white transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              Reset & Reload Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
