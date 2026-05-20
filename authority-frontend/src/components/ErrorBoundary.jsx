import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-wrapper flex-col items-center justify-center text-center p-6" style={{ minHeight: '100vh' }}>
          <div className="card" style={{ maxWidth: '400px', width: '100%' }}>
            <div className="card-body flex-col items-center gap-4">
              <h2 className="text-danger">Something went wrong</h2>
              <p className="text-secondary">We're sorry, but an unexpected error occurred. Please try refreshing the page.</p>
              <button className="btn btn-primary" onClick={() => window.location.reload()}>
                Refresh Page
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
