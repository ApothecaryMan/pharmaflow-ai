import * as React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
  /** Keys that, when changed, will reset the error boundary (e.g., [location.pathname]) */
  resetKeys?: any[];
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary component to catch JavaScript errors in child component tree
 */
export class ErrorBoundary extends React.Component<Props, State> {
  private static readonly IS_DEV = import.meta.env.DEV;

  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidUpdate(prevProps: Props) {
    if (this.state.hasError && this.props.resetKeys) {
      const prevKeys = prevProps.resetKeys ?? [];
      const nextKeys = this.props.resetKeys;

      const hasChanged = 
        nextKeys.length !== prevKeys.length ||
        nextKeys.some((key, i) => key !== prevKeys[i]);

      if (hasChanged) {
        this.reset();
      }
    }
  }

  private reset = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onReset?.();
  };

  private logError = async (error: Error, errorInfo: React.ErrorInfo) => {
    try {
      const { auditService } = await import('../../services/auditService');
      auditService.log('UI_CRASH', {
        details: {
          message: error.message,
          componentStack: errorInfo.componentStack,
          location: window.location.href,
        },
        entityType: 'UI_COMPONENT'
      });
    } catch (e) {
      console.warn('Failed to log UI crash to audit service', e);
    }
  };

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    // 1. Log to Audit Service (Non-blocking)
    void this.logError(error, errorInfo);

    // 2. Call optional onError prop
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className='p-8 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 text-center animate-in fade-in zoom-in duration-300'>
          <div className='inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mb-6'>
            <span className='material-symbols-rounded text-3xl'>error_outline</span>
          </div>
          
          <h3 className='text-xl font-bold text-red-800 dark:text-red-200 mb-1'>
            عذراً، حدث خطأ غير متوقع
          </h3>
          <p className='text-sm text-red-600/60 dark:text-red-400/50 mb-6 font-medium'>
            Something went wrong
          </p>

          <div className='max-w-md mx-auto mb-6'>
            <p className='text-sm text-red-700 dark:text-red-300 font-medium bg-white/50 dark:bg-red-950/20 py-2 px-4 rounded-lg border border-red-100 dark:border-red-900/30'>
              {this.state.error?.message || 'An unexpected error occurred.'}
            </p>
          </div>

          {ErrorBoundary.IS_DEV && (
            <div className='mb-6 text-left overflow-auto max-h-48 p-4 bg-gray-900 rounded-lg text-[10px] font-mono text-red-400'>
              <p className='font-bold mb-2 border-b border-red-900/50 pb-1'>Stack Trace (Dev Only):</p>
              <pre className='whitespace-pre-wrap'>{this.state.error?.stack}</pre>
            </div>
          )}

          <div className='flex items-center justify-center gap-3'>
            <button
              onClick={this.reset}
              className='px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-red-600/20 transition-all active:scale-95 flex items-center gap-2'
            >
              <span className='material-symbols-rounded text-sm'>refresh</span>
              إعادة المحاولة / Try Again
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className='px-6 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-all'
            >
              تحديث الصفحة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
