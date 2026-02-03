import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error Boundary component to catch JavaScript errors in child component tree
 * and display a fallback UI instead of crashing the whole app.
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
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
        <div className='p-6 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 text-center'>
          <div className='inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 mb-4'>
            <span className='material-symbols-rounded text-2xl'>error_outline</span>
          </div>
          <h3 className='text-lg font-bold text-red-800 dark:text-red-200 mb-2'>
            Something went wrong
          </h3>
          <p className='text-sm text-red-600 dark:text-red-300 max-w-md mx-auto'>
            {this.state.error?.message ||
              'An unexpected error occurred while rendering this component.'}
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className='mt-4 px-4 py-2 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 rounded-lg text-sm font-medium text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors'
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
