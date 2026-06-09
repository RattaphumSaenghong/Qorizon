/**
 * Lightweight toast — a brief confirmation pill at the bottom of the screen.
 * Replaces clunky Alert dialogs for "Saved", "Link copied", etc.
 * Uses native-driver opacity/translate (which flush reliably on web + native).
 */
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing, shadow } from '../theme/tokens';

type ShowToast = (message: string) => void;

const ToastContext = createContext<ShowToast>(() => {});

/** Call inside any screen: `const toast = useToast(); toast('Saved')`. */
export const useToast = (): ShowToast => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback<ShowToast>(
    (msg) => {
      setMessage(msg);
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(anim, { toValue: 1, duration: 160, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(
          ({ finished }) => finished && setMessage(null),
        );
      }, 2400);
    },
    [anim],
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {message !== null && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wrap,
            {
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
            },
          ]}
        >
          <View style={styles.toast}>
            <Text style={styles.text}>{message}</Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 40,
    alignItems: 'center',
  },
  toast: {
    backgroundColor: colors.ink,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
    maxWidth: '90%',
    ...shadow.md,
  },
  text: { color: colors.white, fontSize: fontSize.sm, fontWeight: '600', textAlign: 'center' },
});
