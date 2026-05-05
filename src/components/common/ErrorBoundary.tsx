import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black p-4">
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl shadow-xl max-w-md w-full text-center border border-red-500/20">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h1 className="text-xl font-bold mb-2 dark:text-white">حدث خطأ غير متوقع</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6 text-sm">
              يبدو أن هناك مشكلة في عرض هذه الصفحة. يمكنك محاولة إعادة تحميل الصفحة أو مسح الكاش.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
              >
                إعادة تحميل الصفحة
              </button>
              <button
                onClick={() => {
                   if (confirm('هل تريد مسح جميع البيانات المؤقتة؟ سيتم تسجيل خروجك.')) {
                     localStorage.clear();
                     window.location.reload();
                   }
                }}
                className="w-full py-2 bg-gray-200 dark:bg-zinc-800 hover:bg-gray-300 dark:hover:bg-zinc-700 text-gray-800 dark:text-gray-200 rounded-lg transition-colors text-xs"
              >
                حل متقدم (مسح البيانات)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
