// @ts-nocheck
import React, { type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<any, any> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className='flex flex-col items-center justify-center p-8 m-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl'>
          <div className='w-16 h-16 bg-red-100 dark:bg-red-800/30 rounded-full flex items-center justify-center mb-4'>
            <span className='material-symbols-rounded text-3xl text-red-600 dark:text-red-400'>
              error
            </span>
          </div>
          <h2 className='text-xl font-bold text-red-800 dark:text-red-300 mb-2'>
            Something went wrong
          </h2>
          <p className='text-sm text-red-600 dark:text-red-400 mb-6 text-center max-w-md'>
            {this.state.error?.message || 'An unexpected error occurred while rendering this view.'}
          </p>
          <button
            onClick={this.handleReset}
            className='px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-sm'
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
