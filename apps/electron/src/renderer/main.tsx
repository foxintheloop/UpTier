import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './styles/globals.css';
import { appLogger, setupGlobalErrorHandlers } from './lib/logger';

// Setup global error handlers first
setupGlobalErrorHandlers();

appLogger.info('Renderer starting', {
  reactVersion: React.version,
  timestamp: new Date().toISOString(),
  url: window.location.href,
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      refetchOnWindowFocus: true,
    },
  },
});

appLogger.debug('QueryClient configured', {
  staleTime: '1 minute',
  refetchOnWindowFocus: true,
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  appLogger.error('Root element not found');
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>
);

appLogger.info('Renderer mounted');
