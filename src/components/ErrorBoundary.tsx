import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 bg-red-950/60 border border-red-600 rounded-2xl flex items-center justify-center text-red-500 mb-4 shadow-xl shadow-red-950/50">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
            Algo inesperado aconteceu
          </h2>
          <p className="text-neutral-400 text-xs sm:text-sm max-w-md mb-6 leading-relaxed">
            Ocorreu uma pequena instabilidade na visualização da página. Clique no botão abaixo para recarregar o catálogo da Conserta Cell.
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="flex items-center gap-2 bg-[#E50914] hover:bg-[#c80812] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-950/50 cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Recarregar Loja</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
