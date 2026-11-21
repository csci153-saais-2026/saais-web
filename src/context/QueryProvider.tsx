import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
    },
  })
}

export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient)

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
