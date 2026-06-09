import React, { useEffect, useRef } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '../lib/queryClient';
import { initApi } from '../lib/api';
import { loadSession } from '@trailr/db';
import { useAuthStore } from '../stores/authStore';
import { ToastProvider } from '../components/Toast';

interface Props {
  children: React.ReactNode;
}

export function AppProviders({ children }: Props) {
  // Initialise the API client once, synchronously, before any child renders.
  const initialised = useRef(false);
  if (!initialised.current) {
    initApi();
    initialised.current = true;
  }

  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    let active = true;
    // Restore a persisted session (if the access/refresh tokens are still valid).
    loadSession()
      .then((user) => {
        if (!active) return;
        setUser(user);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [setUser, setLoading]);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>{children}</ToastProvider>
    </QueryClientProvider>
  );
}
