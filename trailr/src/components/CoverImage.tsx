import React from 'react';
import { Image, Text, StyleSheet } from 'react-native';
import type { StyleProp, ImageStyle, TextStyle } from 'react-native';
import { colors, fontSize } from '../theme/tokens';

interface Props {
  /** cdn_url ?? url, or any cover image uri. Falsy → shows the placeholder. */
  uri?: string | null;
  /** Image style — typically the call site's absolute-fill style. */
  style?: StyleProp<ImageStyle>;
  /** Optional override for the placeholder label style. */
  labelStyle?: StyleProp<TextStyle>;
  /** Placeholder word, rendered as `[ {label} ]`. Defaults to "photo". */
  label?: string;
}

/** A cover photo with a consistent `[ … ]` placeholder when no uri is available. */
export function CoverImage({ uri, style, labelStyle, label = 'photo' }: Props) {
  if (uri) {
    return <Image source={{ uri }} style={style} resizeMode="cover" />;
  }
  return <Text style={[styles.label, labelStyle]}>[ {label} ]</Text>;
}

const styles = StyleSheet.create({
  label: { fontSize: fontSize.xs, color: colors.sub, fontFamily: 'monospace' },
});
