/**
 * Auth helpers — wrap the Trailr API auth queries and sync the auth store.
 */
import { login, signup, logout } from '@trailr/db';
import { useAuthStore } from '../stores/authStore';

export async function signInWithEmail(email: string, password: string) {
  const user = await login(email, password);
  useAuthStore.getState().setUser(user);
  return user;
}

export async function signUpWithEmail(email: string, password: string, fullName?: string) {
  const user = await signup({ email, password, display_name: fullName });
  useAuthStore.getState().setUser(user);
  return user;
}

export async function signOut() {
  await logout();
  useAuthStore.getState().setUser(null);
}
