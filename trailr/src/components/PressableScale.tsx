/**
 * PressableScale — consistent tactile press feedback.
 *
 * Springs a subtle scale-down on press (and a faint dim on web hover), so every
 * tappable surface in the app reacts the same way. Animates the whole box
 * (border included) via an animated Pressable, and works on web + native.
 */
import React, { useRef } from 'react';
import { Animated, Pressable } from 'react-native';
import type { PressableProps, StyleProp, ViewStyle } from 'react-native';
import { motion } from '../theme/tokens';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

interface Props extends Omit<PressableProps, 'style'> {
  /** Scale at full press. Default 0.96. */
  scaleTo?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}

export function PressableScale({ scaleTo = 0.96, style, children, disabled, ...rest }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const hover = useRef(new Animated.Value(0)).current;

  const spring = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, ...motion.press }).start();
  const fade = (to: number) =>
    Animated.timing(hover, { toValue: to, duration: motion.fast, useNativeDriver: true }).start();

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={() => !disabled && spring(scaleTo)}
      onPressOut={() => spring(1)}
      onHoverIn={() => !disabled && fade(1)}
      onHoverOut={() => fade(0)}
      style={[
        style,
        {
          transform: [{ scale }],
          opacity: disabled ? 0.45 : hover.interpolate({ inputRange: [0, 1], outputRange: [1, 0.85] }),
        },
      ]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
