import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, radius } from '../theme/tokens';
import { toYMD } from '../lib/date';

interface Props {
  startDate: string | null;
  endDate: string | null;
  onChange: (start: string | null, end: string | null) => void;
  minDate?: string;
  maxDate?: string;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function DateRangePicker({ startDate, endDate, onChange, minDate, maxDate }: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // Build the 6-row grid for the current view month.
  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const handleDay = (day: number) => {
    const tapped = toYMD(new Date(viewYear, viewMonth, day));
    if (isDisabled(tapped)) return;
    if (!startDate || (startDate && endDate)) {
      // Start fresh
      onChange(tapped, null);
    } else if (tapped < startDate) {
      // Tapped before start → new start
      onChange(tapped, null);
    } else {
      onChange(startDate, tapped);
    }
  };

  const isStart = (ymd: string) => ymd === startDate;
  const isEnd = (ymd: string) => ymd === endDate;
  const isInRange = (ymd: string) =>
    !!startDate && !!endDate && ymd > startDate && ymd < endDate;
  const isToday = (ymd: string) => ymd === toYMD(today);
  const isDisabled = (ymd: string) =>
    (minDate != null && ymd < minDate) || (maxDate != null && ymd > maxDate);

  return (
    <View style={styles.root}>
      {/* Month nav */}
      <View style={styles.nav}>
        <Pressable onPress={prevMonth} style={styles.navBtn}>
          <Text style={styles.navArrow}>‹</Text>
        </Pressable>
        <Text style={styles.navTitle}>{MONTHS[viewMonth]} {viewYear}</Text>
        <Pressable onPress={nextMonth} style={styles.navBtn}>
          <Text style={styles.navArrow}>›</Text>
        </Pressable>
      </View>

      {/* Day-of-week header */}
      <View style={styles.weekRow}>
        {DAYS.map(d => (
          <Text key={d} style={styles.weekLabel}>{d}</Text>
        ))}
      </View>

      {/* Grid */}
      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={styles.weekRow}>
          {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
            if (!day) return <View key={col} style={styles.cell} />;
            const ymd = toYMD(new Date(viewYear, viewMonth, day));
            const sel = isStart(ymd) || isEnd(ymd);
            const inRange = isInRange(ymd);
            const tod = isToday(ymd);
            const disabled = isDisabled(ymd);
            return (
              <Pressable
                key={col}
                style={[styles.cell, inRange && styles.cellRange]}
                disabled={disabled}
                onPress={() => handleDay(day)}
              >
                <View style={[styles.dayCircle, sel && styles.dayCircleSel]}>
                  <Text style={[styles.dayText, disabled && styles.dayTextDisabled, sel && styles.dayTextSel, tod && !sel && styles.dayTextToday]}>
                    {day}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      {/* Summary */}
      {(startDate || endDate) && (
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            {startDate ?? '—'}{endDate ? ` → ${endDate}` : ' · select end date'}
          </Text>
          <Pressable onPress={() => onChange(null, null)}>
            <Text style={styles.clearBtn}>Clear</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { backgroundColor: colors.panel, borderRadius: radius.md, padding: spacing.md },

  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  navBtn: { padding: spacing.sm },
  navArrow: { fontSize: 22, color: colors.ink, fontWeight: '600' },
  navTitle: { fontSize: fontSize.base, fontWeight: '700', color: colors.ink },

  weekRow: { flexDirection: 'row' },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: fontSize.xs, color: colors.sub, fontWeight: '600', paddingVertical: spacing.xs },

  cell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  cellRange: { backgroundColor: colors.accSoft },

  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayCircleSel: { backgroundColor: colors.acc },
  dayText: { fontSize: fontSize.sm, color: colors.ink },
  dayTextDisabled: { color: 'rgba(111,107,98,0.35)' },
  dayTextSel: { color: '#fff', fontWeight: '700' },
  dayTextToday: { color: colors.acc, fontWeight: '700' },

  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line },
  summaryText: { fontSize: fontSize.sm, color: colors.ink, fontWeight: '600' },
  clearBtn: { fontSize: fontSize.sm, color: colors.acc, fontWeight: '600' },
});
