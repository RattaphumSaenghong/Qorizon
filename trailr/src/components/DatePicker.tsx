import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, fontSize, radius } from '../theme/tokens';
import { toYMD } from '../lib/date';

interface Props {
  /** Selected date as YYYY-MM-DD, or null/'' for none. */
  value: string | null;
  onChange: (ymd: string | null) => void;
  /** Override the initial calendar year (useful for birth-date pickers). */
  initialYear?: number;
  /** Earliest selectable date as YYYY-MM-DD. Dates before this are dimmed and unclickable. */
  minDate?: string;
  /** Cheapest fare per day: { 'YYYY-MM-DD': lowestPriceTHB }. Shows under each day cell. */
  prices?: Record<string, number>;
  /** Called whenever the visible month changes, so the parent can fetch prices for that month. */
  onViewMonthChange?: (year: number, month: number) => void;
}

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function fmtPrice(n: number): string {
  if (n >= 100_000) return `${Math.round(n / 1000)}k`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k`;
  return n.toLocaleString();
}

/** A compact single-date calendar (matches DateRangePicker styling). */
export function DatePicker({ value, onChange, initialYear, minDate, prices, onViewMonthChange }: Props) {
  const today = new Date();
  const init = value ? new Date(value) : today;
  const [viewYear, setViewYear] = useState(initialYear ?? init.getFullYear());
  const [viewMonth, setViewMonth] = useState(init.getMonth());

  const changeView = (year: number, month: number) => {
    setViewYear(year);
    setViewMonth(month);
    onViewMonthChange?.(year, month + 1); // month+1 because API uses 1-based months
  };

  // Find cheapest price in the current view to highlight it
  const cheapestInView = prices
    ? Object.entries(prices)
        .filter(([k]) => {
          const d = new Date(k);
          return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
        })
        .reduce<number | null>((min, [, p]) => (min === null || p < min ? p : min), null)
    : null;

  const prevMonth = () => {
    if (viewMonth === 0) changeView(viewYear - 1, 11);
    else changeView(viewYear, viewMonth - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) changeView(viewYear + 1, 0);
    else changeView(viewYear, viewMonth + 1);
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
    if (minDate && ymd < minDate) return;
    onChange(ymd === value ? null : ymd);
  };

  const isSel = (ymd: string) => ymd === value;
  const isToday = (ymd: string) => ymd === toYMD(today);
  const isDisabled = (ymd: string) => !!minDate && ymd < minDate;

  return (
    <View style={styles.root}>
      <View style={styles.nav}>
        <Pressable onPress={() => changeView(viewYear - 1, viewMonth)} style={styles.navBtn}><Text style={styles.navArrow}>«</Text></Pressable>
        <Pressable onPress={prevMonth} style={styles.navBtn}><Text style={styles.navArrow}>‹</Text></Pressable>
        <Text style={styles.navTitle}>{MONTHS[viewMonth]} {viewYear}</Text>
        <Pressable onPress={nextMonth} style={styles.navBtn}><Text style={styles.navArrow}>›</Text></Pressable>
        <Pressable onPress={() => changeView(viewYear + 1, viewMonth)} style={styles.navBtn}><Text style={styles.navArrow}>»</Text></Pressable>
      </View>

      <View style={styles.weekRow}>
        {DAYS.map((d) => <Text key={d} style={styles.weekLabel}>{d}</Text>)}
      </View>

      {Array.from({ length: cells.length / 7 }, (_, row) => (
        <View key={row} style={styles.weekRow}>
          {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
            if (!day) return <View key={col} style={prices ? styles.cellTall : styles.cell} />;
            const ymd = toYMD(new Date(viewYear, viewMonth, day));
            const sel = isSel(ymd);
            const tod = isToday(ymd);
            const disabled = isDisabled(ymd);
            const price = prices?.[ymd];
            const isCheapest = price != null && cheapestInView != null && price === cheapestInView;
            return (
              <Pressable key={col} style={prices ? styles.cellTall : styles.cell} onPress={() => handleDay(day)}>
                <View style={[styles.dayCircle, sel && styles.dayCircleSel, isCheapest && !sel && styles.dayCircleCheap]}>
                  <Text style={[styles.dayText, sel && styles.dayTextSel, tod && !sel && styles.dayTextToday, disabled && styles.dayTextDisabled]}>
                    {day}
                  </Text>
                </View>
                {price != null ? (
                  <Text style={[styles.priceLabel, isCheapest && styles.priceLabelCheap, disabled && styles.dayTextDisabled]}>
                    {fmtPrice(price)}
                  </Text>
                ) : prices ? (
                  <Text style={styles.priceLabel}> </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ))}

      {prices ? (
        <Text style={styles.estNote}>≈ estimated lowest fare (THB) · cheapest day highlighted</Text>
      ) : null}

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
  cellTall: { flex: 1, alignItems: 'center', paddingVertical: 2, paddingBottom: 4 },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  dayCircleSel: { backgroundColor: colors.acc },
  dayCircleCheap: { backgroundColor: colors.accSoft },
  dayText: { fontSize: fontSize.sm, color: colors.ink },
  dayTextSel: { color: '#fff', fontWeight: '700' },
  dayTextToday: { color: colors.acc, fontWeight: '700' },
  dayTextDisabled: { color: colors.line },
  priceLabel: { fontSize: 9, color: colors.sub, textAlign: 'center', marginTop: 1 },
  priceLabelCheap: { color: colors.acc, fontWeight: '700' },
  estNote: { fontSize: fontSize.xs, color: colors.sub, textAlign: 'center', marginTop: spacing.sm },
  summary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.line },
  summaryText: { fontSize: fontSize.sm, color: colors.ink, fontWeight: '600' },
  clearBtn: { fontSize: fontSize.sm, color: colors.acc, fontWeight: '600' },
});
