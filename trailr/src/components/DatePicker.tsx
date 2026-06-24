import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, radius } from '../theme/tokens';
import { toYMD } from '../lib/date';

interface Props {
  /** Selected date as YYYY-MM-DD, or null/'' for none. */
  value: string | null;
  onChange: (ymd: string | null) => void;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** A compact single-date calendar (matches DateRangePicker styling). */
export function DatePicker({ value, onChange }: Props) {
  const today = new Date();
  const init = value ? new Date(value) : today;
  const [viewYear, setViewYear] = useState(init.getFullYear());
  const [viewMonth, setViewMonth] = useState(init.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const handleDay = (day: number) => {
    const ymd = toYMD(new Date(viewYear, viewMonth, day));
    onChange(ymd === value ? null : ymd); // tapping the selected day clears it
  };

  const isSel = (ymd: string) => ymd === value;
  const isToday = (ymd: string) => ymd === toYMD(today);

  return (
    <View style={styles.root}>
      <View style={styles.nav}>
        <Pressable onPress={prevMonth} style={styles.navBtn}><Text style={styles.navArrow}>‹</Text></Pressable>
        <Text style={styles.navTitle}>{MONTHS[viewMonth]} {viewYear}</Text>
        <Pressable onPress={nextMonth} style={styles.navBtn}><Text style={styles.navArrow}>›</Text></Pressable>
      </View>

      <View style={styles.weekRow}>
        {DAYS.map((d) => <Text key={d} style={styles.weekLabel}>{d}</Text>)}
      </View>

      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={styles.weekRow}>
          {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
            if (!day) return <View key={col} style={styles.cell} />;
            const ymd = toYMD(new Date(viewYear, viewMonth, day));
            const sel = isSel(ymd);
            const tod = isToday(ymd);
            return (
              <Pressable key={col} style={styles.cell} onPress={() => handleDay(day)}>
                <View style={[styles.dayCircle, sel && styles.dayCircleSel]}>
                  <Text style={[styles.dayText, sel && styles.dayTextSel, tod && !sel && styles.dayTextToday]}>
                    {day}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}

      {value ? (
        <View style={styles.summary}>
          <Text style={styles.summaryText}>{value}</Text>
          <Pressable onPress={() => onChange(null)}><Text style={styles.clearBtn}>Clear</Text></Pressable>
        </View>
      ) : null}
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
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayCircleSel: { backgroundColor: colors.acc },
  dayText: { fontSize: fontSize.sm, color: colors.ink },
  dayTextSel: { color: '#fff', fontWeight: '700' },
  dayTextToday: { color: colors.acc, fontWeight: '700' },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line },
  summaryText: { fontSize: fontSize.sm, color: colors.ink, fontWeight: '600' },
  clearBtn: { fontSize: fontSize.sm, color: colors.acc, fontWeight: '600' },
});
