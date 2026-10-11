import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: 15000, retry: 1, refetchOnWindowFocus: false } } });

const QueryProvider = ({ children }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

export { QueryProvider, queryClient };
