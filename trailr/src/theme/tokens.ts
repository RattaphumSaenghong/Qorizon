export const colors = {
  ink: '#2c2a26',
  sub: '#9b958a',
  paper: '#fbf9f5',
  panel: '#f3efe7',
  line: '#cdc6b8',
  bar: '#ddd7c9',
  acc: '#e07a5f',
  accSoft: 'rgba(224,122,95,0.12)',
  map: '#e9ece3',
  mapLine: '#d4d9cb',
  mapWater: '#d9e5e1',
  white: '#ffffff',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
};

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 100,
  circle: 9999,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  base: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
};

/** Animation timings (ms) and the shared spring config for press feedback. */
export const motion = {
  fast: 120,
  base: 200,
  slow: 320,
  /** Animated.spring config for tap/press scale. */
  press: { speed: 40, bounciness: 0 },
};

/** Elevation presets — keep shadows consistent instead of hand-rolling each time. */
export const shadow = {
  sm: {
    shadowColor: '#2c2a26',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: '#2c2a26',
    shadowOpacity: 0.14,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
};

export const TOP_BAR_H = 58;
export const RAIL_W = 64;
