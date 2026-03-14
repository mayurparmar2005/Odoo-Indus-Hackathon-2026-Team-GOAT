import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import './index.css'
import App from './App.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            borderRadius: '12px',
            background: '#1C1C1E',
            color: '#fff',
            fontSize: '14px',
            fontFamily: 'Inter, sans-serif',
          },
          success: { iconTheme: { primary: '#30D158', secondary: '#fff' } },
          error: { iconTheme: { primary: '#FF453A', secondary: '#fff' } },
        }}
      />
    </QueryClientProvider>
  </StrictMode>,
)
