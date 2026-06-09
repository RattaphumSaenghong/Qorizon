/**
 * useCollapsibleSplit — two-pane split with a collapse toggle.
 *
 * The content pane gets a percentage width; the map pane is `flex: 1` and fills
 * the rest. Driven by plain React state (not Animated): react-native-web does
 * NOT flush JS-driven (`useNativeDriver:false`) Animated updates for layout
 * props like width/flex to the DOM, so an Animated split silently no-ops on web.
 * State-driven width re-renders reliably; smoothing is done with a CSS width
 * transition on web (see the screens), which is ignored on native.
 */
import { useState } from 'react';
import type { DimensionValue } from 'react-native';

export function useCollapsibleSplit(normalContent = 70, focusedContent = 30) {
  const [focused, setFocused] = useState(false);
  const toggle = () => setFocused((f) => !f);
  const contentWidth: DimensionValue = `${focused ? focusedContent : normalContent}%`;
  return { focused, toggle, contentWidth };
}
