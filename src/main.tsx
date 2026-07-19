import React from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './app/App';
import { providers } from './app/providers';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Main() {
  return (
    <QueryClientProvider client={queryClient}>
      {providers}
      <App />
    </QueryClientProvider>
  );
}

createRoot(document.getElementById('root')!).render(<Main />);