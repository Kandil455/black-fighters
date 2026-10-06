import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const isEn = typeof window !== "undefined" && (localStorage.getItem("app_locale") === "en" || document.documentElement.lang === "en");
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4" dir={isEn ? "ltr" : "rtl"}>
          <div className="glass-card p-8 rounded-2xl max-w-lg text-center space-y-4">
            <div className="text-4xl">⚠️</div>
            <h1 className="text-xl font-bold text-foreground">
              {isEn ? "An unexpected error occurred" : "حدث خطأ في التطبيق"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEn 
                ? "Something went wrong. Please reload the page or try again later."
                : "حدث خطأ غير متوقع. يرجى تحديث الصفحة أو المحاولة لاحقاً."}
            </p>
            <pre className="text-xs text-left bg-secondary p-3 rounded-lg overflow-auto max-h-40 text-destructive">
              {this.state.error?.message || 'Unknown error'}
            </pre>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-xl font-bold hover:opacity-90 transition"
            >
              {isEn ? "Reload Page" : "تحديث الصفحة"}
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}