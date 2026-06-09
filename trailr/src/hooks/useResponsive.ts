import { useWindowDimensions } from 'react-native';

/** Phones are narrower than this (dp). iPad portrait is 768, so < 768 = phone. */
export const PHONE_MAX_WIDTH = 768;

/** Reactive layout info — re-renders on rotation / window resize (web + native). */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  return { width, height, isPhone: width < PHONE_MAX_WIDTH };
}
