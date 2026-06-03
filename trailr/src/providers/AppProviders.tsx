import React, { useEffect, useRef } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { initSupabase } from '../lib/supabase';
import { getSupabaseClient } from '@trailr/db';
import { useAuthStore } from '../stores/authStore';

interface Props {
  children: React.ReactNode;
}

function AuthListener() {
  const { setSession, setLoading } = useAuthStore();

  useEffect(() => {
    // Client already initialised in AppProviders — just use it
    const supabase = getSupabaseClient();

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  return null;
}

export function AppProviders({ children }: Props) {
  // Initialise once, synchronously, before any child renders
  const initialised = useRef(false);
  if (!initialised.current) {
    initSupabase();
    initialised.current = true;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthListener />
      {children}
    </QueryClientProvider>
  );
}
