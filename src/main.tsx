import {Component, StrictMode, createRoot, type ErrorInfo, type ReactNode} from 'react';
import App from './App.tsx';
import './index.css';

type ErrorBoundaryState = {error: Error | null};

class AppErrorBoundary extends Component<{children: ReactNode}, ErrorBoundaryState> {
  state: ErrorBoundaryState = {error: null};

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {error};
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ClearRide render failed:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <main role="alert" style={{fontFamily: 'system-ui, sans-serif', padding: 32, color: '#111827'}}>
          <h1>ClearRide couldn't load</h1>
          <p>{this.state.error.message}</p>
          <p>Refresh the page to try again.</p>
        </main>
      );
    }

    return this.props.children;
  }
}

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <StrictMode>
      <App />
    </StrictMode>
  </AppErrorBoundary>,
);
