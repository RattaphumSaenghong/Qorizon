import React, { useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { colors, spacing, fontSize, radius } from '../theme/tokens';
import { MapView, MapPin } from './MapView';
import { Day } from '../data/mockTrips';

// ── Washi tape strip ─────────────────────────────────────────
function WashiTape({ rotation = 2, wide = false }: { rotation?: number; wide?: boolean }) {
  return (
    <View style={[
      styles.tape,
      { transform: [{ rotate: `${rotation}deg` }], width: wide ? 70 : 52 },
    ]} />
  );
}

// ── Polaroid photo ───────────────────────────────────────────
function Polaroid({
  label = '',
  rotation = -3,
  width = 180,
  height = 150,
  tape = true,
  tapeRotation = 2,
  tapeWide = false,
}: {
  label?: string;
  rotation?: number;
  width?: number;
  height?: number;
  tape?: boolean;
  tapeRotation?: number;
  tapeWide?: boolean;
}) {
  return (
    <View style={[styles.polaroidOuter, { transform: [{ rotate: `${rotation}deg` }] }]}>
      {tape && (
        <View style={styles.tapeWrap}>
          <WashiTape rotation={tapeRotation} wide={tapeWide} />
        </View>
      )}
      <View style={[styles.polaroidFrame, { width, paddingBottom: 28 }]}>
        <View style={[styles.polaroidPhoto, { height }]}>
          {label ? (
            <Text style={styles.polaroidLabel}>{label}</Text>
          ) : null}
        </View>
      </View>
    </View>
  );
}

// ── Handwritten text ─────────────────────────────────────────
function Handwriting({
  children,
  size = 22,
  color = colors.ink,
  style,
}: {
  children: React.ReactNode;
  size?: number;
  color?: string;
  style?: object;
}) {
  return (
    <Text style={[styles.handwriting, { fontSize: size, color }, style]}>
      {children}
    </Text>
  );
}

// ── Audio chip ───────────────────────────────────────────────
function VoiceChip({ label = 'voice note · 0:42' }: { label?: string }) {
  return (
    <TouchableOpacity style={styles.voiceChip} activeOpacity={0.75}>
      <Text style={styles.voicePlay}>▶</Text>
      <Text style={styles.voiceLabel}>{label}</Text>
      <Text style={styles.voiceWave}>≈≈≈≈≈≈</Text>
    </TouchableOpacity>
  );
}

// ── Main spread ──────────────────────────────────────────────
interface Props {
  day: Day;
  dayIndex: number;
  totalDays: number;
  onPrev: () => void;
  onNext: () => void;
}

export function ScrapbookSpread({ day, dayIndex, totalDays, onPrev, onNext }: Props) {
  const moment0 = day.moments[0];
  const moment1 = day.moments[1];
  const moment2 = day.moments[2];
  const hasAudio = day.moments.some((m) => m.hasAudio);
  const audioMoment = day.moments.find((m) => m.hasAudio);

  return (
    <View style={styles.spread}>
      {/* ── Left page ── */}
      <View style={styles.page}>
        {/* day title */}
        <Handwriting size={38} color={colors.ink} style={styles.dayTitle}>
          Day {day.n} · {day.place}
        </Handwriting>
        <Handwriting size={19} color={colors.sub} style={styles.dayDate}>
          {day.date} · {moment0?.caption?.slice(0, 48)}…
        </Handwriting>

        {/* two overlapping polaroids */}
        <View style={styles.leftPhotos}>
          <View style={{ position: 'absolute', top: 20, left: 20 }}>
            <Polaroid
              label="[ photo ]"
              rotation={-5}
              width={200}
              height={165}
              tape
              tapeRotation={-3}
            />
          </View>
          <View style={{ position: 'absolute', top: 140, left: 210 }}>
            <Polaroid
              label=""
              rotation={4}
              width={155}
              height={130}
              tape
              tapeRotation={6}
              tapeWide
            />
          </View>
        </View>

        {/* accent annotation */}
        <Handwriting
          size={21}
          color={colors.acc}
          style={styles.leftAnnotation}
        >
          {moment0?.location} ✦
        </Handwriting>

        {/* audio chip */}
        {hasAudio && audioMoment?.audioLabel && (
          <View style={styles.voiceWrap}>
            <VoiceChip label={audioMoment.audioLabel} />
          </View>
        )}

        {/* diary lines */}
        <View style={styles.diaryLines}>
          {[1, 2, 3].map((i) => (
            <View key={i} style={styles.diaryLine} />
          ))}
        </View>
      </View>

      {/* ── Spine ── */}
      <View style={styles.spine} />

      {/* ── Right page ── */}
      <View style={styles.page}>
        {/* large polaroid top-right */}
        <View style={styles.rightPhotoWrap}>
          <Polaroid
            label="[ photo ]"
            rotation={3}
            width={210}
            height={200}
            tape
            tapeRotation={-2}
            tapeWide
          />
        </View>

        {/* caption text */}
        <Handwriting size={22} color={colors.ink} style={styles.rightCaption}>
          {moment1?.caption?.slice(0, 80) ?? moment0?.caption?.slice(0, 80)}
          {(moment1?.caption?.length ?? 0) > 80 ? '…' : ''}
        </Handwriting>

        {/* second small polaroid */}
        {moment2 && (
          <View style={styles.rightSmallPhoto}>
            <Polaroid
              label=""
              rotation={-3}
              width={130}
              height={110}
              tape
              tapeRotation={5}
            />
          </View>
        )}

        {/* inset mini route map */}
        <View style={styles.miniMap}>
          <MapView initialLongitude={135.7681} initialLatitude={35.0116} initialZoom={12} style={{ flex: 1 }}>
            <MapPin x="30%" y="60%" accent size={14} />
            <MapPin x="62%" y="38%" accent size={14} />
          </MapView>
        </View>

        {/* next day hint */}
        <Handwriting size={19} color={colors.acc} style={styles.swipeHint}>
          {dayIndex < totalDays - 1 ? `↺ tap for Day ${day.n + 1}` : '✓ end of trip'}
        </Handwriting>
      </View>

      {/* ── Nav arrows ── */}
      {dayIndex > 0 && (
        <TouchableOpacity style={styles.arrowLeft} onPress={onPrev} activeOpacity={0.7}>
          <Text style={styles.arrowText}>‹</Text>
        </TouchableOpacity>
      )}
      {dayIndex < totalDays - 1 && (
        <TouchableOpacity style={styles.arrowRight} onPress={onNext} activeOpacity={0.7}>
          <Text style={styles.arrowText}>›</Text>
        </TouchableOpacity>
      )}

      {/* ── Day dots ── */}
      <View style={styles.dots}>
        {Array.from({ length: totalDays }).map((_, i) => (
          <View
            key={i}
            style={[styles.dot, i === dayIndex && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  spread: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.panel,
    position: 'relative',
  },

  // pages
  page: {
    flex: 1,
    padding: spacing.xxl + 4,
    position: 'relative',
    overflow: 'hidden',
  },
  spine: {
    width: 2,
    backgroundColor: colors.line,
    marginVertical: spacing.xl,
    opacity: 0.6,
  },

  // left page
  dayTitle: {
    lineHeight: 42,
    marginBottom: 6,
  },
  dayDate: {
    marginBottom: spacing.xl,
  },
  leftPhotos: {
    height: 290,
    position: 'relative',
  },
  leftAnnotation: {
    marginTop: -spacing.sm,
    marginLeft: spacing.sm,
  },
  voiceWrap: {
    position: 'absolute',
    left: spacing.xxl + 4,
    bottom: spacing.xxl + 4,
  },
  diaryLines: {
    position: 'absolute',
    bottom: spacing.xxl + 40,
    left: spacing.xxl + 4,
    right: spacing.xxl + 4,
    gap: 18,
  },
  diaryLine: {
    height: 1,
    backgroundColor: colors.line,
    opacity: 0.5,
  },

  // right page
  rightPhotoWrap: {
    position: 'absolute',
    right: spacing.lg,
    top: spacing.xl,
  },
  rightCaption: {
    maxWidth: 220,
    lineHeight: 28,
    marginTop: spacing.xl,
  },
  rightSmallPhoto: {
    position: 'absolute',
    left: spacing.xxl,
    top: 160,
  },
  miniMap: {
    position: 'absolute',
    left: spacing.xxl + 4,
    bottom: spacing.xxl + 32,
    width: 200,
    height: 140,
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  swipeHint: {
    position: 'absolute',
    right: spacing.xxl + 4,
    bottom: spacing.xxl + 4,
  },

  // polaroid
  polaroidOuter: {
    alignItems: 'center',
  },
  tapeWrap: {
    position: 'absolute',
    top: -9,
    zIndex: 3,
    alignItems: 'center',
  },
  tape: {
    height: 18,
    backgroundColor: colors.accSoft,
    borderWidth: 1,
    borderColor: colors.acc,
    opacity: 0.75,
    borderRadius: 2,
  },
  polaroidFrame: {
    backgroundColor: colors.paper,
    padding: 8,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    borderWidth: 1,
    borderColor: colors.line,
  },
  polaroidPhoto: {
    backgroundColor: colors.panel,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
  },
  polaroidLabel: {
    fontSize: fontSize.xs,
    color: colors.sub,
    fontFamily: 'monospace',
  },

  // handwriting
  handwriting: {
    fontStyle: 'italic',
    fontFamily: 'serif',
    lineHeight: 28,
  },

  // audio
  voiceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.paper,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    alignSelf: 'flex-start',
  },
  voicePlay: { fontSize: fontSize.sm, color: colors.acc },
  voiceLabel: { fontSize: fontSize.sm, color: colors.ink },
  voiceWave: { fontSize: fontSize.sm, color: colors.sub },

  // nav
  arrowLeft: {
    position: 'absolute',
    left: 8,
    top: '50%',
    backgroundColor: colors.paper,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    transform: [{ translateY: -20 }],
  },
  arrowRight: {
    position: 'absolute',
    right: 8,
    top: '50%',
    backgroundColor: colors.paper,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    transform: [{ translateY: -20 }],
  },
  arrowText: {
    fontSize: 24,
    color: colors.ink,
    lineHeight: 28,
  },

  // day dots
  dots: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.line,
  },
  dotActive: {
    backgroundColor: colors.acc,
    width: 20,
  },
});
