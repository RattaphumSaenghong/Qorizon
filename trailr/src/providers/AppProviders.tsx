/**
 * AppProviders — wraps the whole app with:
 *   1. Supabase init (runs once, before any query)
 *   2. React Query provider
 *
 * Usage: wrap your root layout with <AppProviders>
 */
import React, { useEffect, useRef } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { initSupabase } from '../lib/supabase';

interface Props {
  children: React.ReactNode;
}

export function AppProviders({ children }: Props) {
  const initialised = useRef(false);

  if (!initialised.current) {
    // Synchronous init on first render — must happen before any useQuery calls
    initSupabase();
    initialised.current = true;
  }

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
